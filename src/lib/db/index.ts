import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

declare global {
   
  var __pgClient: ReturnType<typeof postgres> | undefined;
}

const client =
  globalThis.__pgClient ??
  postgres(env.DATABASE_URL, { max: env.DATABASE_POOL_SIZE });

if (env.NODE_ENV !== "production") globalThis.__pgClient = client;

export const db = drizzle(client, { schema });
export { schema };
