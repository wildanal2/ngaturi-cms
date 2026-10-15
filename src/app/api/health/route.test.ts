import { describe, expect, it, vi } from "vitest";

// A recurring liveness request must never initialize dependency clients.
vi.mock("@/lib/db", () => {
  throw new Error("Liveness imported PostgreSQL");
});
vi.mock("@/lib/redis", () => {
  throw new Error("Liveness imported Redis");
});

import { GET } from "./route";

describe("recurring liveness", () => {
  it("serves repeated uncached requests without database or Redis access", async () => {
    for (let probe = 0; probe < 3; probe++) {
      const response = GET();
      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      await expect(response.json()).resolves.toEqual({ status: "ok" });
    }
  });
});
