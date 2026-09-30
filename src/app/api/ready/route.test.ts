import { afterEach, describe, expect, it, vi } from "vitest";

const checks = vi.hoisted(() => ({ database: vi.fn(), redis: vi.fn() }));
vi.mock("@/lib/db", () => ({ getDb: () => ({ execute: checks.database }) }));
vi.mock("@/lib/redis", () => ({ redis: { get: checks.redis } }));

import { GET } from "./route";

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe("readiness", () => {
  it("checks Neon and Redis without writing data", async () => {
    checks.database.mockResolvedValue([]);
    checks.redis.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(checks.database).toHaveBeenCalledOnce();
    expect(checks.redis).toHaveBeenCalledWith("health:readiness");
  });

  it("returns a generic 503 for provider failure", async () => {
    checks.database.mockRejectedValue(new Error("private connection detail"));
    checks.redis.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private connection detail");
  });

  it("bounds an unanswered provider check", async () => {
    vi.useFakeTimers();
    checks.database.mockReturnValue(new Promise(() => {}));
    checks.redis.mockResolvedValue(null);
    const responsePromise = GET();
    await vi.advanceTimersByTimeAsync(3000);
    expect((await responsePromise).status).toBe(503);
  });
});
