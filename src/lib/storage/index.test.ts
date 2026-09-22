import { describe, expect, it } from "vitest";
import { isTrustedPublicUrl } from "./index";

describe("isTrustedPublicUrl", () => {
  it("accepts only the configured storage origin and path", () => {
    expect(isTrustedPublicUrl("https://cdn.example.com/photo.webp")).toBe(true);
    expect(
      isTrustedPublicUrl("https://cdn.example.com.evil.test/photo.webp"),
    ).toBe(false);
    expect(
      isTrustedPublicUrl("https://evil.test/https://cdn.example.com/x"),
    ).toBe(false);
  });
});
