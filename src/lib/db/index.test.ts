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

import { db, getDb } from "./index";
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
  globalThis.__pgClient = undefined;
  globalThis.__nodeDatabase = undefined;
  mocks.postgres.mockImplementation((connectionString, options) => ({
    connectionString,
    options,
  }));
  mocks.drizzle.mockImplementation((client) => ({ client }));
});

describe("getDb", () => {
  it("keeps adapter metadata probes lazy outside an invocation", () => {
    expect((db as unknown as { _: unknown })._).toBeUndefined();
    expect(mocks.postgres).not.toHaveBeenCalled();
    expect(mocks.drizzle).not.toHaveBeenCalled();
  });

  it("uses a bounded process-wide Node pool with verified TLS and UTC", () => {
    getDb();
    getDb();
    expect(mocks.postgres).toHaveBeenCalledOnce();

    expect(mocks.postgres).toHaveBeenCalledWith(
      "postgres://user:pass@localhost:5432/test",
      {
        max: 5,
        ssl: { rejectUnauthorized: true },
        connect_timeout: 10,
        idle_timeout: 20,
        max_lifetime: 300,
        connection: { TimeZone: "UTC" },
      },
    );
  });

  it("overrides a URL that disables TLS verification in the real driver", async () => {
    getDb();
    const { default: postgres } = await vi.importActual<{
      default: typeof import("postgres");
    }>("postgres");
    const client = postgres(
      "postgres://user:pass@localhost/test?sslmode=require",
      mocks.postgres.mock.calls[0][1],
    );
    expect(client.options.ssl).toEqual({ rejectUnauthorized: true });
    expect(client.options.max).toBe(5);
    await client.end();
  });

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
      {
        max: 5,
        fetch_types: false,
        prepare: true,
        connection: { TimeZone: "UTC" },
      },
    );
    expect(mocks.postgres).toHaveBeenNthCalledWith(
      2,
      "postgres://hyperdrive/second",
      {
        max: 5,
        fetch_types: false,
        prepare: true,
        connection: { TimeZone: "UTC" },
      },
    );
  });

  it("never falls back to DATABASE_URL inside a Worker invocation", () => {
    expect(() => runWithInvocationContext({}, getDb)).toThrow(
      "HYPERDRIVE binding is required in the Cloudflare Worker runtime",
    );
    expect(mocks.postgres).not.toHaveBeenCalled();
  });
});
