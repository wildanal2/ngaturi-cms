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

vi.mock("ioredis", () => ({
  default: class Redis {
    constructor(url: string, options: unknown) {
      mocks.constructor(url, options);
    }

    get = mocks.get;
    set = mocks.set;
    del = mocks.del;
    getdel = mocks.getdel;
    incr = mocks.incr;
    eval = mocks.eval;
  },
}));

import { createRedisTcpAdapter } from "./tcp";

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.__redisTcpClient = undefined;
});

describe("Redis TCP adapter", () => {
  it("requires REDIS_URL in the Node runtime without falling back", () => {
    const redis = createRedisTcpAdapter({});

    expect(() => redis.get("key")).toThrow(
      "Redis TCP is not configured for the Node runtime; set REDIS_URL",
    );
  });

  it("uses TCP for the shared Redis operations", async () => {
    mocks.get.mockResolvedValue("value");
    mocks.getdel.mockResolvedValue("oauth-state");
    mocks.incr.mockResolvedValue(2);
    const redis = createRedisTcpAdapter({
      url: "redis://localhost:6379/0",
    });

    await expect(redis.get("key")).resolves.toBe("value");
    await redis.set("plain", "value");
    await redis.set("expiring", "value", 60);
    await redis.delete("old");
    await expect(redis.getAndDelete("state:key")).resolves.toBe("oauth-state");
    await expect(redis.increment("counter")).resolves.toBe(2);

    expect(mocks.constructor).toHaveBeenCalledOnce();
    expect(mocks.constructor).toHaveBeenCalledWith("redis://localhost:6379/0", {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });
    expect(mocks.set).toHaveBeenNthCalledWith(1, "plain", "value");
    expect(mocks.set).toHaveBeenNthCalledWith(2, "expiring", "value", "EX", 60);
    expect(mocks.del).toHaveBeenCalledWith("old");
    expect(mocks.getdel).toHaveBeenCalledWith("state:key");
  });

  it("increments and assigns the fixed-window TTL in one Lua operation", async () => {
    mocks.eval.mockResolvedValue(4);
    const redis = createRedisTcpAdapter({
      url: "redis://localhost:6379/0",
    });

    await expect(redis.incrementWithTtl("rl:guest", 60)).resolves.toBe(4);
    expect(mocks.eval).toHaveBeenCalledOnce();
    expect(mocks.eval.mock.calls[0].slice(1)).toEqual([1, "rl:guest", 60]);
    expect(mocks.eval.mock.calls[0][0]).toContain('redis.call("INCR"');
    expect(mocks.eval.mock.calls[0][0]).toContain('redis.call("EXPIRE"');
  });
});
