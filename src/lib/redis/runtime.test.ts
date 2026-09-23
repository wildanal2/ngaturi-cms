import { describe, expect, it } from "vitest";
import {
  createRuntimeRedisAdapter as createNodeRedis,
  runtimeRedisTransport as nodeTransport,
} from "./runtime";
import {
  createRuntimeRedisAdapter as createWorkerRedis,
  runtimeRedisTransport as workerTransport,
} from "./runtime.worker";

describe("Redis runtime transport selection", () => {
  it("selects TCP for the Node/PM2 entrypoint", () => {
    expect(nodeTransport).toBe("tcp");
    const redis = createNodeRedis({ NODE_ENV: "test" });
    expect(() => redis.get("key")).toThrow(
      "Redis TCP is not configured for the Node runtime; set REDIS_URL",
    );
  });

  it("selects REST for the Cloudflare Worker entrypoint", () => {
    expect(workerTransport).toBe("rest");
    const redis = createWorkerRedis({});
    expect(() => redis.get("key")).toThrow(
      "Redis REST is not configured for the Cloudflare Worker runtime; set REDIS_REST_URL and REDIS_REST_TOKEN",
    );
  });
});
