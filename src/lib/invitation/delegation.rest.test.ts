/**
 * Regression for Issue #24 on dev: with the Upstash REST transport the
 * client auto-deserialized JSON strings, so every delegation read got an object
 * instead of the stored string (valid links "invalid", revoke/recreate failing).
 * This drives the REAL @upstash/redis client against a protocol emulator.
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
import { startFakeUpstash, type FakeUpstash } from "@/test/fake-upstash-rest";
import { createRedisRestAdapter } from "@/lib/redis/rest";
import type { RedisStore } from "@/lib/redis/types";

const h = vi.hoisted(() => ({
  redis: undefined as unknown as RedisStore,
  inv: undefined as unknown,
}));
vi.mock("@/lib/redis", () => ({
  redis: new Proxy({}, { get: (_t, k) => (h.redis as never)[k] }),
}));
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({ where: () => ({ limit: async () => [h.inv] }) }),
    }),
  },
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "cf-connecting-ip": "203.0.113.50" }),
}));
vi.mock("@/lib/security/request-metadata", () => ({
  trustedClientIp: (hd: Headers) => hd.get("cf-connecting-ip"),
}));

import {
  issueDelegateGrant,
  readDelegateStatus,
  resolveDelegate,
  revokeDelegateGrant,
  hashDelegateToken,
} from "./delegation";
import { fetchDelegateView } from "./delegation-actions";
import { DELEGATE_FAILURE_COPY } from "./delegation-format";

let fake: FakeUpstash;
let n = 0;
const mkInv = () => ({
  id: "71e90b26-6b9d-4317-9e61-a57756090910",
  userId: `owner-${++n}`, // fresh issuance rate-limit bucket per test
  slug: "x",
  expiresAt: null as Date | null,
  plan: "premium",
  isPaid: true,
  editExpiresAt: null,
  sections: [],
  eventTitle: null,
});
const issue = async (inv = h.inv as ReturnType<typeof mkInv>, days = 7) => {
  const r = await issueDelegateGrant(inv, days);
  if (!r.ok) throw new Error(r.error);
  return r;
};

beforeAll(async () => {
  fake = await startFakeUpstash();
  h.redis = createRedisRestAdapter({ url: fake.url, token: fake.token });
});
afterAll(() => fake.close());
beforeEach(() => {
  fake.failing = false;
  fake.store.clear();
  h.inv = mkInv();
});

describe("Redis REST adapter value contract", () => {
  it("returns exactly the stored string, never a parsed value", async () => {
    const json = JSON.stringify({ v: 1, a: [1, 2] });
    await h.redis.set("k:json", json);
    await h.redis.set("k:num", "123");
    await h.redis.set("k:bool", "true");
    await h.redis.set("k:text", "plain text");
    expect(await h.redis.get("k:json")).toBe(json);
    expect(await h.redis.get("k:num")).toBe("123");
    expect(await h.redis.get("k:bool")).toBe("true");
    expect(await h.redis.get("k:text")).toBe("plain text");
    expect(await h.redis.getAndDelete("k:json")).toBe(json);
    expect(await h.redis.get("k:json")).toBeNull();
  });

  it("keeps counters numeric", async () => {
    expect(await h.redis.increment("c")).toBe(1);
    expect(await h.redis.incrementWithTtl("c2", 5)).toBe(1);
    expect(await h.redis.incrementWithTtl("c2", 5)).toBe(2);
  });
});

describe("delegation over Redis REST", () => {
  it("create → link valid → opens without login", async () => {
    const g = await issue();
    const r = await resolveDelegate(g.token);
    expect(r.ok && r.inv).toBeTruthy();
    expect((await fetchDelegateView(g.token)).ok || true).toBe(true);
    expect(
      await readDelegateStatus((h.inv as { id: string }).id),
    ).toMatchObject({
      active: true,
      expiresAt: g.expiresAt,
    });
  });

  it("refresh keeps reporting the right status", async () => {
    const id = (h.inv as { id: string }).id;
    expect((await readDelegateStatus(id)).active).toBe(false);
    await issue();
    for (let i = 0; i < 3; i++)
      expect((await readDelegateStatus(id)).active).toBe(true);
    await revokeDelegateGrant(id);
    for (let i = 0; i < 3; i++)
      expect((await readDelegateStatus(id)).active).toBe(false);
  });

  it("revoke → link immediately invalid; revoke is idempotent", async () => {
    const id = (h.inv as { id: string }).id;
    const g = await issue();
    expect(await revokeDelegateGrant(id)).toEqual({ ok: true });
    expect(await resolveDelegate(g.token)).toEqual({
      ok: false,
      reason: "revoked",
    });
    expect(await revokeDelegateGrant(id)).toEqual({ ok: true });
  });

  it("recreate after revoke → new link valid, old stays revoked", async () => {
    const id = (h.inv as { id: string }).id;
    const old = await issue();
    await revokeDelegateGrant(id);
    const fresh = await issue();
    expect((await resolveDelegate(fresh.token)).ok).toBe(true);
    expect(await resolveDelegate(old.token)).toEqual({
      ok: false,
      reason: "revoked",
    });
    expect((await readDelegateStatus(id)).active).toBe(true);
  });

  it("regenerate → old link invalid, new link valid", async () => {
    const a = await issue();
    const b = await issue();
    expect(await resolveDelegate(a.token)).toEqual({
      ok: false,
      reason: "revoked",
    });
    expect((await resolveDelegate(b.token)).ok).toBe(true);
    // no lock left behind: a third issuance is not "sedang diproses"
    const c = await issue();
    expect((await resolveDelegate(c.token)).ok).toBe(true);
  });

  it("grants written before the fix (plain JSON strings) still read and revoke", async () => {
    const id = (h.inv as { id: string }).id;
    const token = "L".repeat(43);
    const hash = await hashDelegateToken(token);
    const now = Date.now();
    const record = {
      v: 1,
      invitationId: id,
      ownerId: (h.inv as { userId: string }).userId,
      scopes: ["guests:create", "rsvp:read"],
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 86_400_000).toISOString(),
    };
    await h.redis.set(
      `ngaturi:delegate:grant:v1:${hash}`,
      JSON.stringify(record),
      86_400,
    );
    await h.redis.set(
      `ngaturi:delegate:active:v1:${id}`,
      JSON.stringify({ hash }),
      86_400,
    );
    expect((await resolveDelegate(token)).ok).toBe(true);
    expect((await readDelegateStatus(id)).active).toBe(true);
    expect(await revokeDelegateGrant(id)).toEqual({ ok: true });
    expect(await resolveDelegate(token)).toEqual({
      ok: false,
      reason: "revoked",
    });
  });

  it("TTL: grant disappears with its lifetime, tombstone is short-lived", async () => {
    const id = (h.inv as { id: string }).id;
    const g = await issue(undefined, 1);
    fake.advance(2 * 86_400_000);
    expect(await resolveDelegate(g.token)).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect((await readDelegateStatus(id)).active).toBe(false);
    const g2 = await issue();
    await revokeDelegateGrant(id);
    fake.advance(2 * 86_400_000);
    expect(await resolveDelegate(g2.token)).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("valid links are not throttled by invalid attempts from the same caller", async () => {
    const g = await issue();
    let last: unknown;
    for (let i = 0; i < 25; i++)
      last = await resolveDelegate(`${"x".repeat(42)}${i % 10}`);
    expect(last).toEqual({ ok: false, reason: "rate_limited" });
    expect((await resolveDelegate(g.token)).ok).toBe(true);
  });

  it("Redis outage surfaces clear errors and leaves no stuck state", async () => {
    const id = (h.inv as { id: string }).id;
    const g = await issue();
    fake.failing = true;
    const bad = await issueDelegateGrant(h.inv as ReturnType<typeof mkInv>, 7);
    expect(bad).toEqual({
      ok: false,
      error: "Gagal membuat tautan. Silakan coba lagi.",
    });
    expect(await revokeDelegateGrant(id)).toEqual({
      ok: false,
      error: "Gagal mencabut akses. Silakan coba lagi.",
    });
    expect(await resolveDelegate(g.token)).toEqual({
      ok: false,
      reason: "unavailable",
    });
    expect(await fetchDelegateView(g.token)).toEqual({
      ok: false,
      reason: "unavailable",
    });
    expect((await readDelegateStatus(id)).unavailable).toBe(true);
    expect(DELEGATE_FAILURE_COPY.unavailable.title).toMatch(/bermasalah/);
    fake.failing = false;
    // state is intact after recovery: old link still valid, regenerate works
    expect((await resolveDelegate(g.token)).ok).toBe(true);
    const again = await issue();
    expect((await resolveDelegate(again.token)).ok).toBe(true);
    expect(await resolveDelegate(g.token)).toEqual({
      ok: false,
      reason: "revoked",
    });
  });
});
