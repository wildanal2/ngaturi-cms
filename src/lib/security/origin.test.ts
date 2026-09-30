import { describe, expect, it } from "vitest";
import { canonicalApplicationOrigin } from "./origin";

describe("canonical application origin", () => {
  it("uses configured HTTPS independently of forged request headers", () => {
    const forged = new Headers({
      host: "169.254.169.254",
      "x-forwarded-host": "evil.example",
      "x-forwarded-proto": "http",
    });
    expect(forged.get("x-forwarded-host")).toBe("evil.example");
    expect(
      canonicalApplicationOrigin("https://dev.ngaturi.com", "development"),
    ).toBe("https://dev.ngaturi.com");
  });

  it.each([
    "http://dev.ngaturi.com",
    "http://169.254.169.254",
    "https://user:pass@dev.ngaturi.com",
    "https://dev.ngaturi.com/path",
    "https://dev.ngaturi.com?x=1",
    "//evil.example",
  ])("rejects an unsafe configured origin %s", (value) => {
    expect(() => canonicalApplicationOrigin(value, "production")).toThrow();
  });

  it("allows explicit loopback HTTP only outside production", () => {
    expect(
      canonicalApplicationOrigin("http://localhost:3030", "development"),
    ).toBe("http://localhost:3030");
    expect(() =>
      canonicalApplicationOrigin("http://localhost:3030", "production"),
    ).toThrow();
  });
});
