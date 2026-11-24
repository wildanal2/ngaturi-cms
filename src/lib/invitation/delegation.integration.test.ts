/**
 * Runs only against disposable services:
 *   QA_DELEGATION_PG=postgres://… QA_DELEGATION_REDIS=redis://… npx vitest run delegation.integration
 * (PG without TLS, Redis over TCP). Skipped in the normal suite.
 */
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, inArray } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { createRedisTcpAdapter } from "@/lib/redis/tcp";

const PG = process.env.QA_DELEGATION_PG;
const REDIS = process.env.QA_DELEGATION_REDIS;
const run = Boolean(PG && REDIS);

const ctx = vi.hoisted(() => ({
  db: undefined as unknown,
  redis: undefined as unknown,
  ip: "203.0.113.9",
  user: "owner-a",
}));
vi.mock("@/lib/db", () => ({
  db: new Proxy({}, { get: (_t, k) => (ctx.db as never)[k] }),
}));
vi.mock("@/lib/redis", () => ({
  redis: new Proxy({}, { get: (_t, k) => (ctx.redis as never)[k] }),
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "cf-connecting-ip": ctx.ip }),
}));
vi.mock("@/lib/security/request-metadata", () => ({
  trustedClientIp: (h: Headers) => h.get("cf-connecting-ip"),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/helpers", () => ({
  requireUser: async () => ({ user: { id: ctx.user } }),
}));

describe.skipIf(!run)("delegation (real PostgreSQL + Redis)", () => {
  const sql = run ? postgres(PG!, { max: 5 }) : (undefined as never);
  const redisAdapter = run
    ? createRedisTcpAdapter({ url: REDIS!, cacheClient: false })
    : (undefined as never);
  let D: typeof import("./delegation");
  let A: typeof import("./delegation-actions");
  let invA: typeof schema.invitations.$inferSelect;
  let invB: typeof schema.invitations.$inferSelect;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  const sfx = Math.random().toString(36).slice(2, 8);
  const userIds = [`qa24-a-${sfx}`, `qa24-b-${sfx}`];
  beforeEach(() => {
    ctx.user = userIds[0];
  });
  const tok = (c: string) => `dg${c.repeat(10)}`;

  beforeAll(async () => {
    db = drizzle(sql, { schema });
    ctx.db = db;
    ctx.redis = redisAdapter;
    D = await import("./delegation");
    A = await import("./delegation-actions");
    for (const id of userIds)
      await db.insert(schema.users).values({
        id,
        name: id,
        email: `${id}@example.invalid`,
        emailVerified: true,
      } as never);
    const mk = (i: number) =>
      db
        .insert(schema.invitations)
        .values({
          slug: `qa24-${sfx}-${i}`,
          userId: userIds[i],
          plan: "premium",
          isPaid: true,
          status: "published",
          eventTitle: `Acara ${i}`,
        })
        .returning();
    [invA] = await mk(0);
    [invB] = await mk(1);
    ctx.user = userIds[0];
  });

  afterAll(async () => {
    if (!run) return;
    await db.delete(schema.users).where(inArray(schema.users.id, userIds));
    await sql.end();
  });

  const guests = (invId: string) =>
    db
      .select()
      .from(schema.guestInvites)
      .where(eq(schema.guestInvites.invitationId, invId));

  /** Inserts `count` delegated guests directly (fast fixture for quota edges). */
  const fillDg = async (invId: string, count: number, tag = "pr") => {
    for (let off = 0; off < count; off += 500) {
      const chunk = Math.min(500, count - off);
      await db.insert(schema.guestInvites).values(
        Array.from({ length: chunk }, (_, i) => {
          const k = off + i;
          return {
            invitationId: invId,
            guestName: `${tag} ${k}`,
            slugToken: `dg${tag}${String(k).padStart(8, "0")}`,
            whatsappPhone: `0814${String(10_000_000 + k)}`,
          };
        }),
      );
    }
  };

  it("issues a 256-bit token, stores only a hash, default 7d, max 30d", async () => {
    const r = await D.issueDelegateGrant(invA, undefined);
    if (!r.ok) throw new Error(r.error);
    expect(r.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const days = (Date.parse(r.expiresAt) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.99);
    expect(days).toBeLessThan(7.01);
    const hash = await D.hashDelegateToken(r.token);
    expect(
      await redisAdapter.get(`ngaturi:delegate:grant:v1:${hash}`),
    ).toContain(invA.id);
    const long = await D.issueDelegateGrant(invA, 999);
    if (!long.ok) throw new Error(long.error);
    expect((Date.parse(long.expiresAt) - Date.now()) / 86_400_000).toBeLessThan(
      30.01,
    );
  });

  it("never outlives the invitation expiry; refuses expired invitations", async () => {
    const soon = new Date(Date.now() + 2 * 3600_000);
    const r = await D.issueDelegateGrant({ ...invA, expiresAt: soon }, 30);
    if (!r.ok) throw new Error(r.error);
    expect(Date.parse(r.expiresAt)).toBeLessThanOrEqual(soon.getTime());
    const past = await D.issueDelegateGrant(
      { ...invA, expiresAt: new Date(Date.now() - 1000) },
      7,
    );
    expect(past.ok).toBe(false);
    await D.revokeDelegateGrant(invA.id);
  });

  it("resolves valid tokens and rejects malformed/unknown/expired/revoked", async () => {
    ctx.ip = "198.51.100.1";
    const r = await D.issueDelegateGrant(invA, 7);
    if (!r.ok) throw new Error(r.error);
    const ok = await D.resolveDelegate(r.token);
    expect(ok.ok && ok.inv.id).toBe(invA.id);
    expect(await D.resolveDelegate("short")).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(await D.resolveDelegate("A".repeat(43))).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(await D.resolveDelegate({ x: 1 })).toEqual({
      ok: false,
      reason: "invalid",
    });
    const later = new Date(Date.now() + 8 * 86_400_000);
    expect(await D.resolveDelegate(r.token, later)).toEqual({
      ok: false,
      reason: "expired",
    });
    await D.revokeDelegateGrant(invA.id);
    expect(await D.resolveDelegate(r.token)).toEqual({
      ok: false,
      reason: "revoked",
    });
  });

  it("rate-limits repeated invalid tokens per caller", async () => {
    ctx.ip = "198.51.100.77";
    let last: unknown;
    for (let i = 0; i < 22; i++)
      last = await D.resolveDelegate(`${"x".repeat(42)}${i % 10}`);
    expect(last).toEqual({ ok: false, reason: "rate_limited" });
  });

  it("view exposes only delegated guests and no private RSVP data", async () => {
    ctx.ip = "198.51.100.2";
    const [owned] = await db
      .insert(schema.guestInvites)
      .values({
        invitationId: invA.id,
        guestName: "Existing Owner Guest",
        slugToken: "abcdefghij",
        whatsappPhone: "+620000",
      })
      .returning();
    const r = await D.issueDelegateGrant(invA, 7);
    if (!r.ok) throw new Error(r.error);
    const res = await D.resolveDelegate(r.token);
    if (!res.ok) throw new Error("resolve");
    const made = await D.createDelegatedGuest(
      res,
      { name: "Budi", group: "Kantor", phone: "+62 812-3456", maxGuests: 3 },
      () => "abcdefghjk",
    );
    expect(made).toEqual({ ok: true });
    const [dg] = (await guests(invA.id)).filter((g) =>
      g.slugToken.startsWith("dg"),
    );
    await db.insert(schema.rsvpResponses).values({
      invitationId: invA.id,
      guestInviteId: dg.id,
      name: "Budi",
      email: "secret@example.invalid",
      phone: "+6299999",
      status: "attending",
      guestCount: 2,
      message: "PRIVATE-MESSAGE",
      ipAddress: "9.9.9.9",
    });
    await db.insert(schema.rsvpResponses).values({
      invitationId: invA.id,
      guestInviteId: owned.id,
      name: "Existing Owner Guest",
      status: "attending",
      guestCount: 1,
      message: "OWNER-GUEST-MSG",
    });
    const view = await D.loadDelegateView(res);
    const json = JSON.stringify(view);
    expect(view.guests.map((g) => g.guestName)).toEqual(["Budi"]);
    expect(view.guests[0].rsvp).toEqual({ status: "attending", guestCount: 2 });
    for (const secret of [
      "PRIVATE-MESSAGE",
      "secret@example.invalid",
      "9.9.9.9",
      "OWNER-GUEST-MSG",
      "Existing Owner Guest",
      'abcdefghij"',
      "+620000",
    ])
      expect(json).not.toContain(secret);
    expect(view.template.source).toBe("default");
  });

  it("validates input and caps guests (atomic under concurrency)", async () => {
    ctx.ip = "198.51.100.3";
    const r = await D.issueDelegateGrant(invB, 7);
    ctx.user = userIds[1];
    const rb = await D.issueDelegateGrant(invB, 7);
    if (!rb.ok || !r.ok) throw new Error("issue");
    const res = await D.resolveDelegate(rb.token);
    if (!res.ok) throw new Error("resolve");
    const bad = (name: unknown, phone: unknown = "") =>
      D.createDelegatedGuest(
        res,
        { name, group: "", phone, maxGuests: 99 },
        () => "abcdefghjk",
      );
    expect((await bad("   ")).ok).toBe(false);
    expect((await bad({})).ok).toBe(false);
    expect((await bad("X", "javascript:1")).ok).toBe(false);
    // 130 concurrent creates, spread over unique tokens, rate limit raised via fresh hash per call not possible -> use sequential batches
    let n = 0;
    const A32 = "abcdefghijkmnpqrstuvwxyz23456789";
    const gen = () => {
      let v = ++n;
      let out = "";
      for (let i = 0; i < 10; i++, v = Math.floor(v / 32))
        out = A32[v % 32] + out;
      return out;
    };
    await fillDg(invB.id, D.DELEGATE_MAX_GUESTS - 100, "b1");
    const results: Array<{ ok: boolean }> = [];
    for (let i = 0; i < 7; i++) {
      await redisAdapter.delete(`rl:delegate:write:${res.hash}`);
      results.push(
        ...(await Promise.all(
          Array.from({ length: 20 }, (_, j) =>
            D.createDelegatedGuest(
              res,
              { name: `G${i}-${j}`, group: "", phone: "", maxGuests: 99 },
              gen,
            ),
          ),
        )),
      );
    }
    expect(results.filter((x) => x.ok).length).toBe(100);
    const rows = (await guests(invB.id)).filter((g) =>
      g.slugToken.startsWith("dg"),
    );
    expect(rows.length).toBe(D.DELEGATE_MAX_GUESTS);
    expect(Math.max(...rows.map((g) => g.maxGuests))).toBe(10);
    ctx.user = userIds[0];
  });

  it("refuses new guests when the invitation lost its premium/trial entitlement", async () => {
    ctx.ip = "198.51.100.8";
    const r = await D.issueDelegateGrant(invA, 7);
    if (!r.ok) throw new Error(r.error);
    const res = await D.resolveDelegate(r.token);
    if (!res.ok) throw new Error("resolve");
    const locked = {
      ...res,
      inv: {
        ...res.inv,
        plan: "free_trial" as const,
        isPaid: false,
        editExpiresAt: new Date(Date.now() - 1000),
      },
    };
    const made = await D.createDelegatedGuest(
      locked,
      { name: "Tidak Boleh", group: "", phone: "", maxGuests: 2 },
      () => "abcdefghjk",
    );
    expect(made.ok).toBe(false);
    expect((await D.loadDelegateView(locked)).canCreate).toBe(false);
  });

  it("revocation is immediate yet personal guest links keep working", async () => {
    ctx.ip = "198.51.100.4";
    const { authorizeGuest } = await import("./guest-authorization");
    const r = await D.issueDelegateGrant(invA, 7);
    if (!r.ok) throw new Error(r.error);
    const res = await D.resolveDelegate(r.token);
    if (!res.ok) throw new Error("resolve");
    await db.insert(schema.guestInvites).values({
      invitationId: invA.id,
      guestName: "Siti",
      slugToken: tok("m"),
    });
    expect(
      await authorizeGuest(invA.id, tok("m"), "Siti", db as never),
    ).toBeTruthy();
    await A.revokeDelegateLink(invA.id);
    expect(await D.resolveDelegate(r.token)).toEqual({
      ok: false,
      reason: "revoked",
    });
    expect(
      await authorizeGuest(invA.id, tok("m"), "Siti", db as never),
    ).toBeTruthy();
    expect(await A.fetchDelegateView(r.token)).toEqual({
      ok: false,
      reason: "revoked",
    });
    const status = await D.readDelegateStatus(invA.id);
    expect(status.active).toBe(false);
  });

  it("regenerating revokes the previous link; parallel issue leaves exactly one valid", async () => {
    ctx.ip = "198.51.100.5";
    await redisAdapter.delete("rl:delegate:issue:" + userIds[0]);
    const first = await D.issueDelegateGrant(invA, 7);
    if (!first.ok) throw new Error(first.error);
    const out = await Promise.all(
      Array.from({ length: 5 }, () => D.issueDelegateGrant(invA, 7)),
    );
    const issued = [first, ...out].filter(
      (x): x is Extract<typeof x, { ok: true }> => x.ok,
    );
    const valid: string[] = [];
    for (const g of issued) {
      const res = await D.resolveDelegate(g.token);
      if (res.ok) valid.push(g.token);
    }
    expect(valid.length).toBe(1);
  });

  it("a grant for one invitation cannot touch another; ids from the client are ignored", async () => {
    ctx.ip = "198.51.100.6";
    ctx.user = userIds[0];
    const r = await D.issueDelegateGrant(invA, 7);
    if (!r.ok) throw new Error(r.error);
    const res = await D.resolveDelegate(r.token);
    if (!res.ok) throw new Error("resolve");
    const [bGuest] = (await guests(invB.id)).filter((g) =>
      g.slugToken.startsWith("dg"),
    );
    expect(await D.markDelegatedGuestSent(res, bGuest.id)).toBe(false);
    expect(await D.markDelegatedGuestSent(res, "not-a-uuid")).toBe(false);
    const [owned] = (await guests(invA.id)).filter(
      (g) => g.slugToken === "abcdefghij",
    );
    expect(await D.markDelegatedGuestSent(res, owned.id)).toBe(false);
    const [mine] = (await guests(invA.id)).filter((g) =>
      g.slugToken.startsWith("dg"),
    );
    expect(await D.markDelegatedGuestSent(res, mine.id)).toBe(true);
    // owner-only actions reject another user's invitation
    ctx.user = userIds[1];
    await expect(A.createDelegateLink(invA.id, 7)).rejects.toThrow();
    await expect(A.revokeDelegateLink(invA.id)).rejects.toThrow();
    await expect(A.getDelegateStatus(invA.id)).rejects.toThrow();
    await expect(A.createDelegateLink("not-a-uuid", 7)).rejects.toThrow();
    ctx.user = userIds[0];
  });

  describe("bulk contact import (issue #20)", () => {
    const A32 = "abcdefghijkmnpqrstuvwxyz23456789";
    let n = 0;
    const gen = () => {
      let v = ++n + 100_000;
      let out = "";
      for (let i = 0; i < 10; i++, v = Math.floor(v / 32))
        out = A32[v % 32] + out;
      return out;
    };
    const phone = (i: number) => `0812${String(70_000_000 + i)}`;
    async function grant(ip: string) {
      ctx.ip = ip;
      await redisAdapter.delete("rl:delegate:issue:" + userIds[0]);
      const r = await D.issueDelegateGrant(invA, 7);
      if (!r.ok) throw new Error(r.error);
      const res = await D.resolveDelegate(r.token);
      if (!res.ok) throw new Error("resolve");
      return { token: r.token, res };
    }

    it("adds guests, skips duplicates and never reveals the owner's contacts", async () => {
      const { res } = await grant("198.51.100.20");
      await db.insert(schema.guestInvites).values({
        invitationId: invA.id,
        guestName: "Tamu Pemilik",
        slugToken: "zzzzzzzzzz",
        whatsappPhone: phone(500),
      });
      // The owner's own guest (same number as "Pemilik") exists but is outside the delegate's scope.
      const out = await D.createDelegatedGuestsBulk(
        res,
        [
          { name: "Bulk Satu", phone: phone(1), maxGuests: 99 },
          { name: "Bulk Dua", phone: "+62 " + phone(2).slice(1) },
          { name: "Bulk Satu Lagi", phone: "+62" + phone(1).slice(1) },
          { name: "Pemilik", phone: phone(500) },
          { name: "", phone: phone(3) },
          { name: "Tanpa Nomor" },
          { name: "tanpa  nomor" },
        ],
        gen,
      );
      expect(out).toEqual({
        ok: true,
        added: 4,
        statuses: [
          "added",
          "added",
          "duplicate",
          "added",
          "invalid",
          "added",
          "duplicate",
        ],
      });
      const rows = (await guests(invA.id)).filter((g) =>
        g.guestName.startsWith("Bulk"),
      );
      expect(rows).toHaveLength(2);
      expect(Math.max(...rows.map((g) => g.maxGuests))).toBe(10);
      expect(rows.every((g) => g.slugToken.startsWith("dg"))).toBe(true);
      // Retrying the same batch (e.g. after a dropped response) adds nothing.
      await redisAdapter.delete(`rl:delegate:bulk:${res.hash}`);
      const retry = await D.createDelegatedGuestsBulk(
        res,
        [
          { name: "Bulk Satu", phone: phone(1) },
          { name: "Bulk Dua", phone: phone(2) },
        ],
        gen,
      );
      expect(retry).toEqual({
        ok: true,
        added: 0,
        statuses: ["duplicate", "duplicate"],
      });
    });

    it("never exceeds the guest ceiling and reports the overflow as skipped", async () => {
      const { res } = await grant("198.51.100.21");
      const before = (await guests(invA.id)).filter((g) =>
        g.slugToken.startsWith("dg"),
      ).length;
      const room = 60;
      await fillDg(invA.id, D.DELEGATE_MAX_GUESTS - room - before, "q1");
      const out = await D.createDelegatedGuestsBulk(
        res,
        Array.from({ length: 100 }, (_, i) => ({
          name: `Kuota ${i}`,
          phone: phone(1000 + i),
        })),
        gen,
      );
      if (!out.ok) throw new Error(out.error);
      expect(out.added).toBe(room);
      expect(out.statuses.filter((x) => x === "added")).toHaveLength(room);
      expect(out.statuses.filter((x) => x === "limit")).toHaveLength(
        100 - room,
      );
      const after = (await guests(invA.id)).filter((g) =>
        g.slugToken.startsWith("dg"),
      ).length;
      expect(after).toBe(D.DELEGATE_MAX_GUESTS);
      // A further batch is entirely "limit": nothing is written.
      await redisAdapter.delete(`rl:delegate:bulk:${res.hash}`);
      const more = await D.createDelegatedGuestsBulk(
        res,
        [{ name: "Lagi", phone: phone(5000) }],
        gen,
      );
      expect(more).toEqual({ ok: true, added: 0, statuses: ["limit"] });
    });

    it("rate-limits repeated bulk calls and rejects bad batches without writing", async () => {
      await db
        .delete(schema.guestInvites)
        .where(eq(schema.guestInvites.invitationId, invA.id));
      const { res } = await grant("198.51.100.22");
      for (const bad of [undefined, [], "x", Array(101).fill({ name: "A" })])
        expect(await D.createDelegatedGuestsBulk(res, bad, gen)).toMatchObject({
          ok: false,
        });
      expect(await guests(invA.id)).toHaveLength(0);
      const calls = [];
      for (let i = 0; i < 7; i++)
        calls.push(
          await D.createDelegatedGuestsBulk(
            res,
            [{ name: `RL${i}`, phone: phone(9000 + i) }],
            gen,
          ),
        );
      expect(calls.filter((c) => c.ok).length).toBeLessThanOrEqual(5);
      expect(calls.some((c) => !c.ok)).toBe(true);
    });

    it("refuses once revoked or when the invitation lost its entitlement", async () => {
      const { token, res } = await grant("198.51.100.23");
      const locked = {
        ...res,
        inv: {
          ...res.inv,
          plan: "free_trial" as const,
          isPaid: false,
          editExpiresAt: new Date(Date.now() - 1000),
        },
      };
      expect(
        await D.createDelegatedGuestsBulk(locked, [{ name: "X" }], gen),
      ).toMatchObject({ ok: false });
      expect(
        await A.addDelegateGuestsBulk(token, [
          { name: "Sebelum Revoke", phone: phone(7000) },
        ]),
      ).toMatchObject({
        ok: true,
        bulk: { ok: true, added: 1 },
      });
      await A.revokeDelegateLink(invA.id);
      expect(
        await A.addDelegateGuestsBulk(token, [{ name: "Setelah Revoke" }]),
      ).toEqual({
        ok: false,
        reason: "revoked",
      });
      expect(
        await A.addDelegateGuestsBulk("x".repeat(43), [{ name: "Palsu" }]),
      ).toMatchObject({ ok: false });
      const names = (await guests(invA.id)).map((g) => g.guestName);
      expect(names).toContain("Sebelum Revoke");
      expect(names).not.toContain("Setelah Revoke");
    });
  });

  describe("quota counts stored guests only (issue #20 follow-up)", () => {
    const A32 = "abcdefghijkmnpqrstuvwxyz23456789";
    let n = 0;
    const gen = () => {
      let v = ++n + 1_000_000;
      let out = "";
      for (let i = 0; i < 10; i++, v = Math.floor(v / 32))
        out = A32[v % 32] + out;
      return out;
    };
    const MAX = () => D.DELEGATE_MAX_GUESTS;
    const phone = (i: number) => `0813${String(10_000_000 + i)}`;
    let seq = 0;
    async function fresh() {
      const [inv] = await db
        .insert(schema.invitations)
        .values({
          slug: `qa20q-${sfx}-${++seq}`,
          userId: userIds[0],
          plan: "premium",
          isPaid: true,
          status: "published",
          eventTitle: "Kuota",
        })
        .returning();
      ctx.ip = `198.51.101.${seq}`;
      ctx.user = userIds[0];
      await redisAdapter.delete("rl:delegate:issue:" + userIds[0]);
      const r = await D.issueDelegateGrant(inv, 7);
      if (!r.ok) throw new Error(r.error);
      const res = await D.resolveDelegate(r.token);
      if (!res.ok) throw new Error("resolve");
      return { inv, res, token: r.token };
    }
    const dg = async (invId: string) =>
      (await guests(invId)).filter((g) => g.slugToken.startsWith("dg"));
    /** Distinct grants so the per-grant rate limiter never interferes. */
    const as = (res: Awaited<ReturnType<typeof fresh>>["res"], i: number) => ({
      ...res,
      hash: `${res.hash}-p${i}`,
    });
    const items = (from: number, count: number, tag = "K") =>
      Array.from({ length: count }, (_, i) => ({
        name: `${tag} ${from + i}`,
        phone: phone(from + i),
      }));
    const one = (name: string) => ({
      name,
      group: "",
      phone: "",
      maxGuests: 2,
    });

    it("the ceiling is 999 and is the single source for the view", async () => {
      expect(MAX()).toBe(999);
      const { res } = await fresh();
      expect((await D.loadDelegateView(res)).limit).toBe(999);
    });

    it("boundary: slot 999 is allowed, 1000 is refused (998/999/1000)", async () => {
      const { inv, res } = await fresh();
      await fillDg(inv.id, MAX() - 2);
      expect(await D.createDelegatedGuest(res, one("ke-998"), gen)).toEqual({
        ok: true,
      });
      expect(await D.createDelegatedGuest(res, one("ke-999"), gen)).toEqual({
        ok: true,
      });
      expect(await dg(inv.id)).toHaveLength(MAX());
      expect(await D.createDelegatedGuest(res, one("ke-1000"), gen)).toEqual({
        ok: false,
        error: `Batas ${MAX()} tamu tercapai.`,
      });
      expect(await dg(inv.id)).toHaveLength(MAX());
    });

    it("a failed INSERT does not consume quota", async () => {
      const { inv, res } = await fresh();
      await fillDg(inv.id, MAX() - 21);
      // Constant token: the first row lands, the next 19 violate the unique index.
      const out = await D.createDelegatedGuestsBulk(
        res,
        items(0, 20),
        () => "aaaaaaaaaa",
      );
      if (!out.ok) throw new Error(out.error);
      expect(out.added).toBe(1);
      expect(out.statuses.filter((x) => x === "failed")).toHaveLength(19);
      expect(await dg(inv.id)).toHaveLength(MAX() - 20);
      // All 20 remaining slots are still usable.
      await redisAdapter.delete(`rl:delegate:bulk:${res.hash}`);
      const rest = await D.createDelegatedGuestsBulk(res, items(100, 20), gen);
      expect(rest).toMatchObject({ ok: true, added: 20 });
      expect(await dg(inv.id)).toHaveLength(MAX());
    });

    it("a single add that fails does not consume quota either", async () => {
      const { inv, res } = await fresh();
      await fillDg(inv.id, MAX() - 2);
      expect(
        await D.createDelegatedGuest(res, one("A"), () => "bbbbbbbbbb"),
      ).toEqual({ ok: true });
      for (let i = 0; i < 5; i++) {
        await redisAdapter.delete(`rl:delegate:write:${res.hash}`);
        expect(
          (await D.createDelegatedGuest(res, one(`B${i}`), () => "bbbbbbbbbb"))
            .ok,
        ).toBe(false);
      }
      expect(await dg(inv.id)).toHaveLength(MAX() - 1);
      expect(await D.createDelegatedGuest(res, one("C"), gen)).toEqual({
        ok: true,
      });
    });

    it("attempts at a full quota consume nothing: a freed slot is usable again", async () => {
      const { inv, res } = await fresh();
      await fillDg(inv.id, MAX());
      for (let i = 0; i < 3; i++) {
        await redisAdapter.delete(`rl:delegate:bulk:${res.hash}`);
        await redisAdapter.delete(`rl:delegate:write:${res.hash}`);
        expect(
          await D.createDelegatedGuestsBulk(res, items(500 + i, 1), gen),
        ).toEqual({ ok: true, added: 0, statuses: ["limit"] });
        expect(await D.createDelegatedGuest(res, one("Penuh"), gen)).toEqual({
          ok: false,
          error: `Batas ${MAX()} tamu tercapai.`,
        });
      }
      const [first] = await dg(inv.id);
      await db
        .delete(schema.guestInvites)
        .where(eq(schema.guestInvites.id, first.id));
      await redisAdapter.delete(`rl:delegate:write:${res.hash}`);
      expect(await D.createDelegatedGuest(res, one("Pengganti"), gen)).toEqual({
        ok: true,
      });
      expect(await dg(inv.id)).toHaveLength(MAX());
    });

    it("never exceeds the ceiling under parallel single and bulk requests", async () => {
      const { inv, res } = await fresh();
      await fillDg(inv.id, MAX() - 100);
      const jobs = [
        ...Array.from({ length: 25 }, (_, i) =>
          D.createDelegatedGuestsBulk(
            as(res, i),
            items(i * 10, 10, "P"),
            gen,
          ).then((r) => (r.ok ? r.added : 0)),
        ),
        ...Array.from({ length: 40 }, (_, i) =>
          D.createDelegatedGuest(as(res, 100 + i), one(`S${i}`), gen).then(
            (r) => (r.ok ? 1 : 0),
          ),
        ),
      ];
      const added = (await Promise.all(jobs)).reduce<number>(
        (a, b) => a + b,
        0,
      );
      expect(added).toBe(100);
      expect(await dg(inv.id)).toHaveLength(MAX());
    });

    it("parallel adds at 998 admit exactly one", async () => {
      const { inv, res } = await fresh();
      await fillDg(inv.id, MAX() - 1);
      const out = await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          D.createDelegatedGuest(as(res, i), one(`R${i}`), gen),
        ),
      );
      expect(out.filter((x) => x.ok)).toHaveLength(1);
      expect(await dg(inv.id)).toHaveLength(MAX());
    });

    it("single and bulk adds share one limit", async () => {
      const { inv, res } = await fresh();
      await fillDg(inv.id, MAX() - 3);
      expect(await D.createDelegatedGuest(res, one("Satu"), gen)).toEqual({
        ok: true,
      });
      const last = await D.createDelegatedGuestsBulk(res, items(200, 5), gen);
      if (!last.ok) throw new Error(last.error);
      expect(last.statuses).toEqual([
        "added",
        "added",
        "limit",
        "limit",
        "limit",
      ]);
      expect(await dg(inv.id)).toHaveLength(MAX());
    });

    it("bulk import stays capped at 100 contacts per request", async () => {
      const { inv, res } = await fresh();
      expect(
        await D.createDelegatedGuestsBulk(res, items(0, 101), gen),
      ).toMatchObject({ ok: false });
      expect(await dg(inv.id)).toHaveLength(0);
    });

    it("ignores any legacy Redis counter", async () => {
      const { inv, res } = await fresh();
      await redisAdapter.set(
        `ngaturi:delegate:count:v1:${res.hash}`,
        "5000",
        600,
      );
      expect(
        await D.createDelegatedGuestsBulk(res, items(0, 3), gen),
      ).toMatchObject({ added: 3 });
      expect(await D.createDelegatedGuest(res, one("X"), gen)).toEqual({
        ok: true,
      });
      await redisAdapter.delete(`ngaturi:delegate:count:v1:${res.hash}`);
      expect(await dg(inv.id)).toHaveLength(4);
    });

    it("parallel retries and overlapping imports never create duplicate numbers", async () => {
      const { inv, res } = await fresh();
      const batch = items(0, 15, "D");
      const all = await Promise.all(
        Array.from({ length: 8 }, (_, i) =>
          D.createDelegatedGuestsBulk(as(res, i), batch, gen),
        ),
      );
      expect(all.reduce((a, r) => a + (r.ok ? r.added : 0), 0)).toBe(15);
      const rows = await dg(inv.id);
      expect(new Set(rows.map((g) => g.whatsappPhone)).size).toBe(15);
    });

    it("partial failure yields a consistent per-contact outcome and a safe retry", async () => {
      const { inv, res } = await fresh();
      let call = 0;
      // Every 3rd insert collides on the unique token index.
      const flaky = () => (++call % 3 === 0 ? "cccccccccc" : gen());
      const first = await D.createDelegatedGuestsBulk(
        res,
        [...items(0, 7), { name: "" }],
        flaky,
      );
      if (!first.ok) throw new Error(first.error);
      expect(first.statuses).toHaveLength(8);
      expect(first.statuses[7]).toBe("invalid");
      expect(first.added).toBe(
        first.statuses.filter((x) => x === "added").length,
      );
      expect((await dg(inv.id)).length).toBe(first.added);
      await redisAdapter.delete(`rl:delegate:bulk:${res.hash}`);
      const retry = await D.createDelegatedGuestsBulk(res, items(0, 7), gen);
      if (!retry.ok) throw new Error(retry.error);
      expect(retry.statuses.filter((x) => x === "failed")).toHaveLength(0);
      expect((await dg(inv.id)).length).toBe(7);
    });

    it("a revoked grant cannot create guests through either path, and owner data stays hidden", async () => {
      const { inv, token } = await fresh();
      await db.insert(schema.guestInvites).values({
        invitationId: inv.id,
        guestName: "Rahasia Pemilik",
        slugToken: "yyyyyyyyyy",
        whatsappPhone: phone(900),
      });
      const ok = await A.addDelegateGuestsBulk(token, [
        { name: "Sama", phone: phone(900) },
      ]);
      expect(ok).toMatchObject({
        ok: true,
        bulk: { ok: true, statuses: ["added"] },
      });
      expect(JSON.stringify(ok)).not.toContain("Rahasia Pemilik");
      await A.revokeDelegateLink(inv.id);
      const fd = new FormData();
      fd.set("guest_name", "Setelah Revoke");
      expect(await A.addDelegateGuest(token, fd)).toEqual({
        ok: false,
        reason: "revoked",
      });
      expect(
        await A.addDelegateGuestsBulk(token, [{ name: "Setelah Revoke 2" }]),
      ).toEqual({ ok: false, reason: "revoked" });
      expect((await dg(inv.id)).map((g) => g.guestName)).toEqual(["Sama"]);
    });
  });

  describe("edit name, category and statuses (issue #20 follow-up)", () => {
    let G: typeof import("./guests");
    let Q: typeof import("./query");
    let L: typeof import("./guest-list");
    beforeAll(async () => {
      G = await import("./guests");
      Q = await import("./query");
      L = await import("./guest-list");
    });
    let seq = 0;
    const A32 = "abcdefghijkmnpqrstuvwxyz23456789";
    let n = 0;
    const gen = () => {
      let v = ++n + 2_000_000;
      let out = "";
      for (let i = 0; i < 10; i++, v = Math.floor(v / 32))
        out = A32[v % 32] + out;
      return out;
    };
    async function fresh(owner = 0) {
      const [inv] = await db
        .insert(schema.invitations)
        .values({
          slug: `qa20e-${sfx}-${++seq}`,
          userId: userIds[owner],
          plan: "premium",
          isPaid: true,
          status: "published",
          eventTitle: "Edit",
        })
        .returning();
      ctx.ip = `198.51.102.${seq}`;
      ctx.user = userIds[owner];
      await redisAdapter.delete("rl:delegate:issue:" + userIds[owner]);
      const r = await D.issueDelegateGrant(inv, 7);
      if (!r.ok) throw new Error(r.error);
      const res = await D.resolveDelegate(r.token);
      if (!res.ok) throw new Error("resolve");
      return { inv, res, token: r.token };
    }
    type Res = Awaited<ReturnType<typeof fresh>>["res"];
    const add = async (res: Res, name: string, phone = "081355500001") => {
      const out = await D.createDelegatedGuestsBulk(
        { ...res, hash: `${res.hash}-a${++n}` },
        [{ name, phone }],
        gen,
      );
      if (!out.ok || out.added !== 1) throw new Error("add failed");
      const [row] = await db
        .select()
        .from(schema.guestInvites)
        .where(
          and(
            eq(schema.guestInvites.invitationId, res.inv.id),
            eq(schema.guestInvites.guestName, name),
          ),
        );
      return row;
    };
    const get = async (id: string) =>
      (
        await db
          .select()
          .from(schema.guestInvites)
          .where(eq(schema.guestInvites.id, id))
      )[0];
    const rename = (res: Res, id: unknown, name: unknown) =>
      D.renameDelegatedGuest({ ...res, hash: `${res.hash}-e${++n}` }, id, name);
    const categorize = (res: Res, id: unknown, c: unknown) =>
      D.setDelegatedGuestCategory(
        { ...res, hash: `${res.hash}-c${++n}` },
        id,
        c,
      );

    it("renames before send/open while id, token, phone, RSVP and status stay", async () => {
      const { inv, res } = await fresh();
      const g = await add(res, "Nama Lama");
      await db.insert(schema.rsvpResponses).values({
        invitationId: inv.id,
        guestInviteId: g.id,
        name: "Nama Lama",
        status: "attending",
        guestCount: 2,
      });
      expect(await rename(res, g.id, "  Nama   Baru ")).toEqual({ ok: true });
      const after = await get(g.id);
      expect(after.guestName).toBe("Nama   Baru");
      expect(after).toMatchObject({
        id: g.id,
        slugToken: g.slugToken,
        whatsappPhone: g.whatsappPhone,
        isSent: false,
        openedAt: null,
        maxGuests: g.maxGuests,
      });
      const view = await D.loadDelegateView(res);
      expect(view.guests[0]).toMatchObject({
        guestName: "Nama   Baru",
        rsvp: { status: "attending", guestCount: 2 },
      });
      // The personal link now resolves to the new name (what the invitation shows).
      expect(await Q.getGuestByToken(inv.id, g.slugToken)).toMatchObject({
        id: g.id,
        name: "Nama   Baru",
      });
    });

    it.each([
      ["sent", { isSent: true }],
      ["opened", { openedAt: new Date() }],
      ["sent and opened", { isSent: true, openedAt: new Date() }],
    ])("rejects a rename once the guest is %s", async (_l, patch) => {
      const { res } = await fresh();
      const g = await add(res, "Tetap");
      await db
        .update(schema.guestInvites)
        .set(patch)
        .where(eq(schema.guestInvites.id, g.id));
      expect(await rename(res, g.id, "Berubah")).toEqual({
        ok: false,
        error: L.NAME_LOCKED_MESSAGE,
      });
      expect((await get(g.id)).guestName).toBe("Tetap");
    });

    it("race: a rename never lands after the guest was sent", async () => {
      const { res } = await fresh();
      for (let i = 0; i < 25; i++) {
        const g = await add(
          res,
          `Race ${i}`,
          `08135551${String(i).padStart(4, "0")}`,
        );
        const [renamed] = await Promise.all([
          rename(res, g.id, `Baru ${i}`),
          D.markDelegatedGuestSent(res, g.id),
        ]);
        const row = await get(g.id);
        expect(row.isSent).toBe(true);
        // Either the rename won (name changed, reported ok) or it was refused (name untouched).
        if (renamed.ok) expect(row.guestName).toBe(`Baru ${i}`);
        else {
          expect(row.guestName).toBe(`Race ${i}`);
          expect(renamed).toEqual({ ok: false, error: L.NAME_LOCKED_MESSAGE });
        }
        // After the send, further renames are always refused.
        expect((await rename(res, g.id, "Lagi")).ok).toBe(false);
        expect((await get(g.id)).guestName).toBe(row.guestName);
      }
    });

    it("race: a rename never lands after the guest was opened", async () => {
      const { res } = await fresh();
      for (let i = 0; i < 15; i++) {
        const g = await add(
          res,
          `Open ${i}`,
          `08135552${String(i).padStart(4, "0")}`,
        );
        const [renamed] = await Promise.all([
          rename(res, g.id, `Dibuka ${i}`),
          Q.markGuestOpened(g.id),
        ]);
        const row = await get(g.id);
        expect(row.openedAt).not.toBeNull();
        expect(row.guestName).toBe(renamed.ok ? `Dibuka ${i}` : `Open ${i}`);
      }
    });

    it("validates names: empty, control characters, bad ids and the 100-char limit", async () => {
      const { res } = await fresh();
      const g = await add(res, "Valid");
      for (const bad of ["", "   ", undefined, null, 42, {}])
        expect((await rename(res, g.id, bad)).ok).toBe(false);
      for (const id of [undefined, "1; drop table", "", 7])
        expect((await rename(res, id, "X")).ok).toBe(false);
      expect(await rename(res, g.id, `A\u0000B${"x".repeat(200)}`)).toEqual({
        ok: true,
      });
      const name = (await get(g.id)).guestName;
      expect(name).toHaveLength(100);
      expect(name.startsWith("A B")).toBe(true);
    });

    it("a delegate cannot edit owner guests or another invitation's guests", async () => {
      const a = await fresh();
      const b = await fresh();
      const [ownerGuest] = await db
        .insert(schema.guestInvites)
        .values({
          invitationId: a.inv.id,
          guestName: "Tamu Pemilik",
          slugToken: "ownertoken",
          guestGroup: "Rahasia Pemilik",
        })
        .returning();
      const foreign = await add(b.res, "Tamu B");
      for (const target of [ownerGuest, foreign]) {
        expect(await rename(a.res, target.id, "Dibajak")).toEqual({
          ok: false,
          error: "Tamu tidak ditemukan.",
        });
        expect(await categorize(a.res, target.id, "Dibajak")).toEqual({
          ok: false,
          error: "Tamu tidak ditemukan.",
        });
      }
      expect((await get(ownerGuest.id)).guestName).toBe("Tamu Pemilik");
      expect((await get(ownerGuest.id)).guestGroup).toBe("Rahasia Pemilik");
      expect((await get(foreign.id)).guestName).toBe("Tamu B");
      expect((await get(foreign.id)).guestGroup).toBeNull();
    });

    it("categories: set, canonical spelling, remove, editable after send/open, nothing else changes", async () => {
      const { res } = await fresh();
      const g1 = await add(res, "Satu", "081355530001");
      const g2 = await add(res, "Dua", "081355530002");
      expect(await categorize(res, g1.id, "  Teman   Kantor ")).toEqual({
        ok: true,
      });
      expect((await get(g1.id)).guestGroup).toBe("Teman Kantor");
      // Different case/whitespace maps to the existing spelling, no duplicate category.
      expect(await categorize(res, g2.id, "teman kantor")).toEqual({
        ok: true,
      });
      expect((await get(g2.id)).guestGroup).toBe("Teman Kantor");
      // Sent + opened guests can still be recategorised; everything else stays.
      await db
        .update(schema.guestInvites)
        .set({ isSent: true, openedAt: new Date() })
        .where(eq(schema.guestInvites.id, g1.id));
      const before = await get(g1.id);
      expect(await categorize(res, g1.id, "Keluarga")).toEqual({ ok: true });
      const after = await get(g1.id);
      expect(after.guestGroup).toBe("Keluarga");
      expect({ ...after, guestGroup: null }).toEqual({
        ...before,
        guestGroup: null,
      });
      // Removing the category.
      expect(await categorize(res, g1.id, null)).toEqual({ ok: true });
      expect((await get(g1.id)).guestGroup).toBeNull();
      expect(await categorize(res, g1.id, "  ")).toEqual({ ok: true });
      expect((await get(g1.id)).guestGroup).toBeNull();
      // Long names are cut to 100 characters.
      await categorize(res, g1.id, "k".repeat(300));
      expect((await get(g1.id)).guestGroup).toHaveLength(100);
    });

    it("category spelling is matched only within the delegate's own guests (no owner leak)", async () => {
      const { inv, res } = await fresh();
      await db.insert(schema.guestInvites).values({
        invitationId: inv.id,
        guestName: "Pemilik",
        slugToken: "ownertok02",
        guestGroup: "VIP Rahasia",
      });
      const g = await add(res, "Tamu", "081355540001");
      await categorize(res, g.id, "vip rahasia");
      expect((await get(g.id)).guestGroup).toBe("vip rahasia");
      const json = JSON.stringify(await D.loadDelegateView(res));
      expect(json).not.toContain("VIP Rahasia");
    });

    it("owner rename/category: allowed, locked after send, scoped to the owner's invitation", async () => {
      const { inv, res } = await fresh(0);
      const g = await add(res, "Pelanggan");
      const [own] = await db
        .insert(schema.guestInvites)
        .values({
          invitationId: inv.id,
          guestName: "Milik Owner",
          slugToken: "ownertok03",
          guestGroup: "Keluarga",
        })
        .returning();
      ctx.user = userIds[0];
      expect(await G.renameGuestInvite(inv.id, g.id, "Pelanggan Baru")).toEqual(
        { ok: true },
      );
      expect(await G.renameGuestInvite(inv.id, own.id, "Owner Baru")).toEqual({
        ok: true,
      });
      // Owner category matches across all guests, including delegated ones.
      expect(await G.setGuestCategory(inv.id, g.id, "keluarga")).toEqual({
        ok: true,
      });
      expect((await get(g.id)).guestGroup).toBe("Keluarga");
      await G.markGuestSent(inv.id, own.id);
      expect(await G.renameGuestInvite(inv.id, own.id, "Terlambat")).toEqual({
        ok: false,
        error: L.NAME_LOCKED_MESSAGE,
      });
      expect(await G.setGuestCategory(inv.id, own.id, "Kantor")).toEqual({
        ok: true,
      });
      expect((await get(own.id)).guestName).toBe("Owner Baru");
      // Another account can neither see nor edit this invitation's guests.
      ctx.user = userIds[1];
      await expect(
        G.renameGuestInvite(inv.id, g.id, "Maling"),
      ).rejects.toThrow();
      await expect(
        G.setGuestCategory(inv.id, g.id, "Maling"),
      ).rejects.toThrow();
      // Guest ids from another invitation never match.
      const other = await fresh(1);
      const foreign = await add(other.res, "Tamu Lain");
      ctx.user = userIds[0];
      expect(await G.renameGuestInvite(inv.id, foreign.id, "X")).toEqual({
        ok: false,
        error: "Tamu tidak ditemukan.",
      });
      expect((await get(foreign.id)).guestName).toBe("Tamu Lain");
    });

    it("bulk import saves the category only on added guests and keeps duplicates untouched", async () => {
      const { res } = await fresh();
      const existing = await add(res, "Sudah Ada", "081355560001");
      await categorize(res, existing.id, "Keluarga");
      const dupOnly = await add(res, "Tetap Tanpa", "081355560002");
      const out = await D.createDelegatedGuestsBulk(
        res,
        [
          { name: "Baru 1", phone: "081355560010", group: "keluarga" },
          { name: "Baru 2", phone: "081355560011", group: "  Teman   Kantor " },
          { name: "Baru 3", phone: "081355560012", group: "teman kantor" },
          { name: "Duplikat", phone: "081355560001", group: "Teman Kantor" },
          { name: "Duplikat 2", phone: "081355560002", group: "Kantor" },
          { name: "", phone: "081355560013", group: "Teman Kantor" },
        ],
        gen,
      );
      if (!out.ok) throw new Error(out.error);
      expect(out.statuses).toEqual([
        "added",
        "added",
        "added",
        "duplicate",
        "duplicate",
        "invalid",
      ]);
      const rows = await db
        .select()
        .from(schema.guestInvites)
        .where(eq(schema.guestInvites.invitationId, res.inv.id));
      const cat = (name: string) =>
        rows.find((r) => r.guestName === name)?.guestGroup;
      expect(cat("Baru 1")).toBe("Keluarga");
      expect(cat("Baru 2")).toBe("Teman Kantor");
      expect(cat("Baru 3")).toBe("Teman Kantor");
      expect(cat("Sudah Ada")).toBe("Keluarga");
      expect((await get(dupOnly.id)).guestGroup).toBeNull();
      expect(rows.find((r) => r.guestName === "Duplikat")).toBeUndefined();
    });

    it("bulk category survives partial failure and a retry without duplicates or category drift", async () => {
      const { inv, res } = await fresh();
      let call = 0;
      const flaky = () => (++call % 2 === 0 ? "dddddddddd" : gen());
      const batch = Array.from({ length: 6 }, (_, i) => ({
        name: `Impor ${i}`,
        phone: `08135557000${i}`,
        group: "Teman Lama",
      }));
      const first = await D.createDelegatedGuestsBulk(res, batch, flaky);
      if (!first.ok) throw new Error(first.error);
      await redisAdapter.delete(`rl:delegate:bulk:${res.hash}`);
      const retry = await D.createDelegatedGuestsBulk(res, batch, gen);
      if (!retry.ok) throw new Error(retry.error);
      const rows = (await guests(inv.id)).filter((g) =>
        g.slugToken.startsWith("dg"),
      );
      expect(rows).toHaveLength(6);
      expect(new Set(rows.map((r) => r.guestGroup))).toEqual(
        new Set(["Teman Lama"]),
      );
      expect(new Set(rows.map((r) => r.whatsappPhone)).size).toBe(6);
    });

    it("single add also stores the canonical category", async () => {
      const { res } = await fresh();
      const g = await add(res, "Ada", "081355580001");
      await categorize(res, g.id, "Tetangga");
      expect(
        await D.createDelegatedGuest(
          res,
          { name: "Baru", group: " tetangga ", phone: "", maxGuests: 2 },
          gen,
        ),
      ).toEqual({ ok: true });
      const baru = (await guests(res.inv.id)).find(
        (r) => r.guestName === "Baru",
      );
      expect(baru?.guestGroup).toBe("Tetangga");
    });

    it("revoked or expired grants and lost entitlement cannot edit", async () => {
      const { inv, res, token } = await fresh();
      const g = await add(res, "Beku");
      const locked = {
        ...res,
        inv: {
          ...res.inv,
          plan: "free_trial" as const,
          isPaid: false,
          editExpiresAt: new Date(Date.now() - 1000),
        },
      };
      expect((await rename(locked, g.id, "X")).ok).toBe(false);
      expect((await categorize(locked, g.id, "X")).ok).toBe(false);
      // Expired: rewrite the stored record with a past expiry.
      const key = `ngaturi:delegate:grant:v1:${res.hash}`;
      const raw = await redisAdapter.get(key);
      await redisAdapter.set(
        key,
        JSON.stringify({
          ...JSON.parse(raw!),
          expiresAt: new Date(Date.now() - 1000).toISOString(),
        }),
        600,
      );
      expect(await A.renameDelegateGuest(token, g.id, "X")).toEqual({
        ok: false,
        reason: "expired",
      });
      expect(await A.setDelegateGuestCategory(token, g.id, "X")).toEqual({
        ok: false,
        reason: "expired",
      });
      await redisAdapter.set(key, raw!, 600);
      await A.revokeDelegateLink(inv.id);
      expect(await A.renameDelegateGuest(token, g.id, "X")).toEqual({
        ok: false,
        reason: "revoked",
      });
      expect(await A.setDelegateGuestCategory(token, g.id, "X")).toEqual({
        ok: false,
        reason: "revoked",
      });
      const row = await get(g.id);
      expect(row.guestName).toBe("Beku");
      expect(row.guestGroup).toBeNull();
    });

    it("the delegate view reports sent and opened independently, including sent=no/opened=yes", async () => {
      const { res } = await fresh();
      const combos: [boolean, boolean][] = [
        [false, false],
        [true, false],
        [false, true],
        [true, true],
      ];
      for (const [i, [sent, opened]] of combos.entries()) {
        const g = await add(res, `Kombinasi ${i}`, `08135559000${i}`);
        await db
          .update(schema.guestInvites)
          .set({ isSent: sent, openedAt: opened ? new Date() : null })
          .where(eq(schema.guestInvites.id, g.id));
      }
      const view = await D.loadDelegateView(res);
      const byName = Object.fromEntries(
        view.guests.map((g) => [g.guestName, [g.isSent, g.opened]]),
      );
      combos.forEach((c, i) => expect(byName[`Kombinasi ${i}`]).toEqual(c));
    });
  });
});
