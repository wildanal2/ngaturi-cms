import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  set: vi.fn(),
  where: vi.fn(),
  returning: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { update: mocks.update },
}));

import { archiveExpired, lockExpiredEdits } from "./cron";

describe("invitation expiry cron timezone handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.update.mockReturnValue({ set: mocks.set });
    mocks.set.mockReturnValue({ where: mocks.where });
    mocks.where.mockReturnValue({ returning: mocks.returning });
    mocks.returning.mockResolvedValue([{ id: "invitation-1" }]);
  });

  it.each([
    ["edit expiry", lockExpiredEdits],
    ["public expiry", archiveExpired],
  ])("compares %s to the UTC database clock", async (_label, run) => {
    await expect(run()).resolves.toBe(1);

    const condition = mocks.where.mock.calls[0]?.[0];
    const query = new PgDialect().sqlToQuery(condition).sql;
    expect(query).toContain("timezone('UTC', now())");
  });
});
