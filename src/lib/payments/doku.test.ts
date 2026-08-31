import { describe, expect, it } from "vitest";
import { mapStatus, sanitizeText } from "./doku";

describe("sanitizeText (DOKU whitelist)", () => {
  it("keeps allowed characters", () => {
    expect(sanitizeText("Upgrade undangan Basic")).toBe("Upgrade undangan Basic");
  });
  it("swaps disallowed punctuation", () => {
    expect(sanitizeText("A — B")).toBe("A - B");
    expect(sanitizeText("Kamar #3")).toBe("Kamar No.3");
    expect(sanitizeText("Dinda & Raka")).toBe("Dinda dan Raka");
  });
  it("strips other non-whitelisted characters (incl. parentheses)", () => {
    expect(sanitizeText("Halo* (dunia)!")).toBe("Halo dunia");
    expect(sanitizeText("Upgrade: Premium / 90 hari")).toBe("Upgrade: Premium / 90 hari");
  });
  it("falls back when the result is empty", () => {
    expect(sanitizeText("™®", "Pembayaran")).toBe("Pembayaran");
    expect(sanitizeText("")).toBe("Pembayaran");
  });
});

describe("mapStatus", () => {
  it("maps DOKU statuses to internal payment states", () => {
    expect(mapStatus("SUCCESS")).toBe("paid");
    expect(mapStatus("EXPIRED")).toBe("expired");
    expect(mapStatus("FAILED")).toBe("failed");
    expect(mapStatus("REVERSED")).toBe("failed");
    expect(mapStatus("CANCELLED")).toBe("failed");
    expect(mapStatus("PENDING")).toBe("pending");
    expect(mapStatus("WHATEVER")).toBe("pending");
  });
});
