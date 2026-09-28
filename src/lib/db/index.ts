import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import { getInvocationValue, getWorkerEnv } from "@/lib/runtime/context";
import * as schema from "./schema";

declare global {
  var __pgClient: ReturnType<typeof postgres> | undefined;
  var __nodeDatabase: Database | undefined;
}

export type Database = PostgresJsDatabase<typeof schema>;

const INVOCATION_DATABASE = Symbol.for("ngaturi.invocation-database");

function createDatabase(connectionString: string, max: number): Database {
  const client = postgres(connectionString, {
    max,
    fetch_types: false,
    prepare: true,
    connection: { TimeZone: "UTC" },
  });
  return drizzle(client, { schema });
}

function getNodeDatabase(): Database {
  if (!env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is required outside a Hyperdrive-backed Worker invocation",
    );
  }
  if (!globalThis.__pgClient) {
    globalThis.__pgClient = postgres(env.DATABASE_URL, {
      max: env.DATABASE_POOL_SIZE,
      connection: { TimeZone: "UTC" },
    });
  }
  if (!globalThis.__nodeDatabase) {
    globalThis.__nodeDatabase = drizzle(globalThis.__pgClient, { schema });
  }
  return globalThis.__nodeDatabase;
}

/**
 * Resolve the database for the current runtime.
 *
 * Workers get one Postgres.js/Drizzle instance per invocation through
 * Hyperdrive. Node development and scripts retain their process-local pool.
 */
export function getDb(): Database {
  const workerEnv = getWorkerEnv();
  if (workerEnv) {
    const hyperdriveConnectionString = workerEnv.HYPERDRIVE?.connectionString;
    if (!hyperdriveConnectionString) {
      throw new Error(
        "HYPERDRIVE binding is required in the Cloudflare Worker runtime",
      );
    }
    return getInvocationValue(INVOCATION_DATABASE, () =>
      createDatabase(hyperdriveConnectionString, 5),
    )!;
  }
  return getNodeDatabase();
}

/**
 * Backwards-compatible facade for existing queries. Each property access is
 * resolved against the current invocation, so it never captures a Worker TCP
 * client at module scope.
 */
export const db = new Proxy({} as Database, {
  get(_target, property) {
    // Adapter factories (including Better Auth's Drizzle adapter) probe this
    // metadata property during module initialization. The schema is already
    // supplied explicitly to those adapters, so resolving a live database here
    // would incorrectly create the Node client before a Worker invocation.
    if (property === "_") return undefined;
    const database = getDb();
    const value = Reflect.get(database, property, database) as unknown;
    return typeof value === "function" ? value.bind(database) : value;
  },
});

export { schema };
