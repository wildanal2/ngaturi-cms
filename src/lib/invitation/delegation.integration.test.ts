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
import { eq, inArray } from "drizzle-orm";
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
    expect(rows.length).toBe(100);
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
});
