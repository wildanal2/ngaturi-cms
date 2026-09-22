import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getdel: vi.fn(),
  eval: vi.fn(),
}));

vi.mock("@upstash/redis", () => ({
  Redis: class Redis {
    getdel = mocks.getdel;
    eval = mocks.eval;
  },
}));

import { redis } from "./index";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Redis REST atomic operations", () => {
  it("consumes single-use auth state with GETDEL", async () => {
    mocks.getdel.mockResolvedValue("oauth-state");

    await expect(redis.getAndDelete("state:key")).resolves.toBe("oauth-state");
    expect(mocks.getdel).toHaveBeenCalledWith("state:key");
  });

  it("increments and assigns the fixed-window TTL in one Lua operation", async () => {
    mocks.eval.mockResolvedValue(3);

    await expect(redis.incrementWithTtl("rl:guest", 60)).resolves.toBe(3);
    expect(mocks.eval).toHaveBeenCalledOnce();
    expect(mocks.eval.mock.calls[0][1]).toEqual(["rl:guest"]);
    expect(mocks.eval.mock.calls[0][2]).toEqual([60]);
    expect(mocks.eval.mock.calls[0][0]).toContain('redis.call("INCR"');
    expect(mocks.eval.mock.calls[0][0]).toContain('redis.call("EXPIRE"');
  });
});
