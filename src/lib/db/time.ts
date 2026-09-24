import { sql } from "drizzle-orm";

/**
 * Ngaturi stores `timestamp without time zone` values as UTC wall-clock time.
 * Keep database-side clock comparisons in that same representation.
 */
export const databaseUtcNow = sql`timezone('UTC', now())`;

