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
  it("selects supported, retryable work before applying the batch limit, without a lower age cutoff", async () => {
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
    expect(where.sql).toContain('"payments"."provider" in');
    expect(where.params).toContain("doku");
    expect(where.params).not.toContain("sumopod");
    expect(where.sql).toContain('"payments"."provider_order_id" is not null');
    expect(where.sql).toContain("retryable");
    expect(where.sql).toContain("not in");
    expect(where.params).toContain("sumopod_status_contract_missing");
    expect(where.params).toContain("unsupported_payment_provider");
    expect(where.params).toContain("review_required");
    expect(where.sql).not.toContain('"payments"."created_at" >=');
    expect(where.params).toContain("expired");
  });
});
