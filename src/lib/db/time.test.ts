import { describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { databaseUtcNow } from "./time";

describe("databaseUtcNow", () => {
  it("represents the current instant as a UTC wall-clock timestamp", () => {
    const query = new PgDialect().sqlToQuery(databaseUtcNow).sql;
    expect(query).toBe("timezone('UTC', now())");
  });
});
