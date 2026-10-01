import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  constructor: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  getdel: vi.fn(),
  incr: vi.fn(),
  eval: vi.fn(),
}));

vi.mock("@upstash/redis", () => ({
  Redis: class Redis {
    constructor(config: unknown) {
      mocks.constructor(config);
    }

    get = mocks.get;
    set = mocks.set;
    del = mocks.del;
    getdel = mocks.getdel;
    incr = mocks.incr;
    eval = mocks.eval;
  },
}));

import { createRedisRestAdapter } from "./rest";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Redis REST adapter", () => {
  it("requires the REST configuration without falling back", () => {
    const redis = createRedisRestAdapter({});

    expect(() => redis.get("key")).toThrow(
      "Redis REST is not configured; set REDIS_REST_URL and REDIS_REST_TOKEN",
    );
  });

  it("uses REST for the shared Redis operations", async () => {
    mocks.get.mockResolvedValue("value");
    mocks.getdel.mockResolvedValue("oauth-state");
    mocks.incr.mockResolvedValue(2);
    const redis = createRedisRestAdapter({
      url: "https://redis.example.com",
      token: "secret",
    });

    await expect(redis.get("key")).resolves.toBe("value");
    await redis.set("plain", "value");
    await redis.set("expiring", "value", 60);
    await redis.delete("old");
    await expect(redis.getAndDelete("state:key")).resolves.toBe("oauth-state");
    await expect(redis.increment("counter")).resolves.toBe(2);

    expect(mocks.constructor).toHaveBeenCalledOnce();
    expect(mocks.constructor).toHaveBeenCalledWith({
      url: "https://redis.example.com",
      token: "secret",
    });
    expect(mocks.set).toHaveBeenNthCalledWith(1, "plain", "value");
    expect(mocks.set).toHaveBeenNthCalledWith(2, "expiring", "value", {
      ex: 60,
    });
    expect(mocks.del).toHaveBeenCalledWith("old");
    expect(mocks.getdel).toHaveBeenCalledWith("state:key");
  });

  it("increments and assigns the fixed-window TTL in one Lua operation", async () => {
    mocks.eval.mockResolvedValue(3);
    const redis = createRedisRestAdapter({
      url: "https://redis.example.com",
      token: "secret",
    });

    await expect(redis.incrementWithTtl("rl:guest", 60)).resolves.toBe(3);
    expect(mocks.eval).toHaveBeenCalledOnce();
    expect(mocks.eval.mock.calls[0][1]).toEqual(["rl:guest"]);
    expect(mocks.eval.mock.calls[0][2]).toEqual([60]);
    expect(mocks.eval.mock.calls[0][0]).toContain('redis.call("INCR"');
    expect(mocks.eval.mock.calls[0][0]).toContain('redis.call("EXPIRE"');
  });
});
