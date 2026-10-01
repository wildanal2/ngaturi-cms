import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("direct presign upload", () => {
  it("fails closed without issuing an upload URL", async () => {
    const response = await POST();
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Upload langsung tidak tersedia. Gunakan /api/uploads.",
    });
  });
});
