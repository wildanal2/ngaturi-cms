import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/redis", () => ({ redis: {} }));
import {
  clampDelegateDays,
  DELEGATE_MAX_DAYS,
  hashDelegateToken,
  isDelegatedGuestToken,
  isUuid,
  resolveDelegate,
} from "./delegation";

describe("delegation primitives", () => {
  it("clamps lifetime to 1..30 days, default 7", () => {
    expect(clampDelegateDays(undefined)).toBe(7);
    expect(clampDelegateDays("abc")).toBe(7);
    expect(clampDelegateDays(0)).toBe(1);
    expect(clampDelegateDays(-5)).toBe(1);
    expect(clampDelegateDays(999)).toBe(DELEGATE_MAX_DAYS);
    expect(clampDelegateDays(14.9)).toBe(14);
  });

  it("recognises only delegated personal tokens (owner tokens are 10 chars)", () => {
    expect(isDelegatedGuestToken("dgabcdefghjk")).toBe(true);
    expect(isDelegatedGuestToken("abcdefghjk")).toBe(false);
    expect(isDelegatedGuestToken("dgabcdefghj")).toBe(false);
    expect(isDelegatedGuestToken("dgabcdefghjk1")).toBe(false);
    expect(isDelegatedGuestToken("DGabcdefghjk")).toBe(false);
  });

  it("hashes deterministically to 64 hex chars and never echoes the token", async () => {
    const h = await hashDelegateToken("t".repeat(43));
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).toBe(await hashDelegateToken("t".repeat(43)));
    expect(h).not.toContain("t".repeat(10));
  });

  it("validates uuid ids from clients", () => {
    expect(isUuid("71e90b26-6b9d-4317-9e61-a57756090910")).toBe(true);
    expect(isUuid("1; drop table")).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });

  it("rejects malformed tokens before any storage lookup", async () => {
    // redis/db mocks are empty objects: any lookup would throw -> "unavailable"
    // would surface, but rate limiting is hit first. Use a stub that allows it.
    vi.resetModules();
    vi.doMock("@/lib/rate-limit", () => ({ rateLimit: async () => true }));
    const mod = await import("./delegation");
    for (const bad of [
      undefined,
      null,
      42,
      "",
      "short",
      "x".repeat(44),
      "!".repeat(43),
    ])
      expect(await mod.resolveDelegate(bad)).toEqual({
        ok: false,
        reason: "invalid",
      });
    expect(resolveDelegate).toBeTypeOf("function");
  });
});
