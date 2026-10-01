import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rest: vi.fn(), tcp: vi.fn() }));
vi.mock("./rest", () => ({ createRedisRestAdapter: mocks.rest }));
vi.mock("./tcp", () => ({ createRedisTcpAdapter: mocks.tcp }));

import { createRuntimeRedisAdapter as createNodeRedis } from "./runtime";
import { createRuntimeRedisAdapter as createWorkerRedis } from "./runtime.worker";

beforeEach(() => vi.clearAllMocks());
const rest = {
  REDIS_REST_URL: "https://redis.example.com",
  REDIS_REST_TOKEN: "test",
};

describe("Redis runtime selection", () => {
  it("defaults Node to shared REST even with an unused legacy URL", () => {
    createNodeRedis({ ...rest, REDIS_URL: "redis://localhost" });
    expect(mocks.rest).toHaveBeenCalledWith({
      url: rest.REDIS_REST_URL,
      token: rest.REDIS_REST_TOKEN,
    });
    expect(mocks.tcp).not.toHaveBeenCalled();
  });

  it.each([
    {},
    { REDIS_URL: "redis://localhost" },
    { REDIS_REST_URL: rest.REDIS_REST_URL },
    { REDIS_REST_TOKEN: "test" },
  ])("fails closed for missing REST credentials: %j", (config) => {
    expect(() => createNodeRedis(config)).toThrow("Node Redis REST requires");
    expect(mocks.tcp).not.toHaveBeenCalled();
  });

  it("selects TCP only when explicitly requested", () => {
    createNodeRedis({
      REDIS_TRANSPORT: "tcp",
      REDIS_URL: "redis://localhost",
      NODE_ENV: "test",
    });
    expect(mocks.tcp).toHaveBeenCalledWith({
      url: "redis://localhost",
      cacheClient: false,
    });
    expect(mocks.rest).not.toHaveBeenCalled();
  });

  it("rejects mixed TCP/REST configuration and missing TCP URLs", () => {
    expect(() =>
      createNodeRedis({
        ...rest,
        REDIS_TRANSPORT: "tcp",
        REDIS_URL: "redis://localhost",
      }),
    ).toThrow("cannot be combined");
    expect(() => createNodeRedis({ REDIS_TRANSPORT: "tcp" })).toThrow(
      "requires REDIS_URL",
    );
  });

  it("keeps the Worker adapter REST-only", () => {
    createWorkerRedis(rest);
    expect(mocks.rest).toHaveBeenCalledWith({
      url: rest.REDIS_REST_URL,
      token: rest.REDIS_REST_TOKEN,
    });
    expect(mocks.tcp).not.toHaveBeenCalled();
  });
});
