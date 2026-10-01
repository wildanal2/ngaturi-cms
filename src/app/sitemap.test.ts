import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { select: mocks.select },
}));

import sitemap from "./sitemap";
afterEach(() => vi.unstubAllEnvs());

describe("sitemap timezone handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.select.mockReturnValue({ from: mocks.from });
    mocks.from.mockReturnValue({ where: mocks.where });
    mocks.where.mockReturnValue({ orderBy: mocks.orderBy });
    mocks.orderBy.mockReturnValue({ limit: mocks.limit });
    mocks.limit.mockResolvedValue([]);
  });

  it("compares public expiry to the UTC database clock", async () => {
    await expect(sitemap()).resolves.toHaveLength(6);

    const condition = mocks.where.mock.calls[0]?.[0];
    const query = new PgDialect().sqlToQuery(condition).sql;
    expect(query).toContain("timezone('UTC', now())");
  });

  it("omits review URLs and avoids querying invitations when indexing is disabled", async () => {
    vi.stubEnv("SITE_INDEXING_ENABLED", "false");
    await expect(sitemap()).resolves.toEqual([]);
    expect(mocks.select).not.toHaveBeenCalled();
  });
});
