import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  postgres: vi.fn(),
  drizzle: vi.fn(),
}));

vi.mock("postgres", () => ({ default: mocks.postgres }));
vi.mock("drizzle-orm/postgres-js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("drizzle-orm/postgres-js")>()),
  drizzle: mocks.drizzle,
}));

import { getDb } from "./index";
import {
  runWithInvocationContext,
  type NgaturiWorkerEnv,
} from "@/lib/runtime/context";

function workerEnv(connectionString: string): NgaturiWorkerEnv {
  return {
    HYPERDRIVE: { connectionString },
  } as unknown as NgaturiWorkerEnv;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.postgres.mockImplementation((connectionString, options) => ({
    connectionString,
    options,
  }));
  mocks.drizzle.mockImplementation((client) => ({ client }));
});

describe("getDb", () => {
  it("creates one max-five Hyperdrive client per Worker invocation", async () => {
    const first = await runWithInvocationContext(
      workerEnv("postgres://hyperdrive/first"),
      async () => {
        const a = getDb();
        await Promise.resolve();
        expect(getDb()).toBe(a);
        return a;
      },
    );
    const second = runWithInvocationContext(
      workerEnv("postgres://hyperdrive/second"),
      getDb,
    );

    expect(second).not.toBe(first);
    expect(mocks.postgres).toHaveBeenCalledTimes(2);
    expect(mocks.postgres).toHaveBeenNthCalledWith(
      1,
      "postgres://hyperdrive/first",
      { max: 5, fetch_types: false, prepare: true },
    );
    expect(mocks.postgres).toHaveBeenNthCalledWith(
      2,
      "postgres://hyperdrive/second",
      { max: 5, fetch_types: false, prepare: true },
    );
  });
});
