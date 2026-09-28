import { describe, expect, it } from "vitest";
import {
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
