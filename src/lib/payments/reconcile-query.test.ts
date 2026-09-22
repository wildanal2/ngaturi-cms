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

import { loadPendingDokuPayments } from "./reconcile";

describe("DOKU reconciliation query", () => {
  it("prioritizes the oldest eligible pending payments", async () => {
    mocks.limit.mockResolvedValue([]);
    mocks.orderBy.mockReturnValue({ limit: mocks.limit });
    mocks.where.mockReturnValue({ orderBy: mocks.orderBy });
    mocks.from.mockReturnValue({ where: mocks.where });
    mocks.select.mockReturnValue({ from: mocks.from });

    await loadPendingDokuPayments({
      oldestCreatedAt: new Date("2026-09-21T12:00:00Z"),
      newestCreatedAt: new Date("2026-09-22T11:58:00Z"),
      limit: 51,
    });

    expect(mocks.orderBy).toHaveBeenCalledOnce();
    const orderExpression = mocks.orderBy.mock.calls[0][0];
    const query = new PgDialect().sqlToQuery(orderExpression);
    expect(query.sql).toContain('"payments"."created_at" asc');
  });
});
