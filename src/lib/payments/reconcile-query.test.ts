import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: { select: mocks.select } }));
import { loadUnresolvedPayments } from "./reconcile";

describe("reconciliation fairness query", () => {
  it("orders by durable last attempt before creation age, without provider or lower age filters", async () => {
    mocks.limit.mockResolvedValue([]);
    mocks.orderBy.mockReturnValue({ limit: mocks.limit });
    mocks.where.mockReturnValue({ orderBy: mocks.orderBy });
    mocks.from.mockReturnValue({ where: mocks.where });
    mocks.select.mockReturnValue({ from: mocks.from });
    await loadUnresolvedPayments({
      newestCreatedAt: new Date("2026-09-22T11:58:00Z"),
      limit: 51,
    });
    const dialect = new PgDialect();
    expect(dialect.sqlToQuery(mocks.orderBy.mock.calls[0][0]).sql).toContain(
      "attemptedAt",
    );
    const where = dialect.sqlToQuery(mocks.where.mock.calls[0][0]);
    expect(where.sql).not.toContain('"payments"."provider"');
    expect(where.sql).not.toContain('"payments"."created_at" >=');
    expect(where.params).toContain("expired");
  });
});
