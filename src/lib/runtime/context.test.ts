import { describe, expect, it, vi } from "vitest";
import {
  assertWorkerRuntimeContract,
  getInvocationValue,
  getWorkerEnv,
  runWithInvocationContext,
  type NgaturiWorkerEnv,
} from "./context";

const VALUE = Symbol("value");

function fakeEnv(name: string): NgaturiWorkerEnv {
  return { name } as unknown as NgaturiWorkerEnv;
}

describe("Worker invocation context", () => {
  it("fails closed and lists missing Worker configuration names", () => {
    expect(() => assertWorkerRuntimeContract({})).toThrow(
      "missing: HYPERDRIVE, MEDIA_BUCKET, R2_PUBLIC_URL, IMAGES, ASSETS, REDIS_REST_URL, REDIS_REST_TOKEN",
    );
  });

  it("accepts the complete binding and Redis REST contract", () => {
    expect(() =>
      assertWorkerRuntimeContract({
        HYPERDRIVE: { connectionString: "postgresql://test" },
        MEDIA_BUCKET: { put: vi.fn(), get: vi.fn() },
        R2_PUBLIC_URL: "https://media.example.com",
        IMAGES: { info: vi.fn(), input: vi.fn() },
        ASSETS: { fetch: vi.fn() },
        REDIS_REST_URL: "https://redis.example.com",
        REDIS_REST_TOKEN: "test-token",
      }),
    ).not.toThrow();
  });

  it("rejects r2.dev as the Worker public media origin", () => {
    expect(() =>
      assertWorkerRuntimeContract({
        HYPERDRIVE: { connectionString: "postgresql://test" },
        MEDIA_BUCKET: { put: vi.fn(), get: vi.fn() },
        R2_PUBLIC_URL: "https://example.r2.dev",
        IMAGES: { info: vi.fn(), input: vi.fn() },
        ASSETS: { fetch: vi.fn() },
        REDIS_REST_URL: "https://redis.example.com",
        REDIS_REST_TOKEN: "test-token",
      }),
    ).toThrow("R2_PUBLIC_URL must be an HTTPS R2 custom domain");
  });

  it("reuses lazy resources within one invocation", async () => {
    let allocations = 0;
    const env = fakeEnv("first");

    await runWithInvocationContext(env, async () => {
      expect(getWorkerEnv()).toBe(env);
      const first = getInvocationValue(VALUE, () => ++allocations);
      await Promise.resolve();
      const second = getInvocationValue(VALUE, () => ++allocations);
      expect(second).toBe(first);
    });

    expect(allocations).toBe(1);
  });

  it("does not share resources across concurrent invocations", async () => {
    const results = await Promise.all(
      [fakeEnv("a"), fakeEnv("b")].map((env, index) =>
        runWithInvocationContext(env, async () => {
          await Promise.resolve();
          return {
            env: getWorkerEnv(),
            value: getInvocationValue(VALUE, () => ({ index })),
          };
        }),
      ),
    );

    expect(results[0].env).not.toBe(results[1].env);
    expect(results[0].value).not.toBe(results[1].value);
  });
});
