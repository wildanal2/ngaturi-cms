import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("better-auth/cookies", () => ({ getSessionCookie: vi.fn(() => null) }));

import { proxy } from "./proxy";
afterEach(() => vi.unstubAllEnvs());

describe("protected route redirect", () => {
  it("sets review noindex on public responses and protected redirects", () => {
    vi.stubEnv("SITE_INDEXING_ENABLED", "false");
    for (const path of ["/", "/dashboard"]) {
      expect(
        proxy(new NextRequest(`https://example.com${path}`)).headers.get(
          "x-robots-tag",
        ),
      ).toBe("noindex, nofollow");
    }
    vi.stubEnv("SITE_INDEXING_ENABLED", "true");
    expect(
      proxy(new NextRequest("https://example.com/")).headers.has(
        "x-robots-tag",
      ),
    ).toBe(false);
  });
  it("ignores forged request host and protocol for the login destination", () => {
    const request = new NextRequest("https://evil.example/dashboard", {
      headers: {
        host: "evil.example",
        "x-forwarded-host": "169.254.169.254",
        "x-forwarded-proto": "http",
      },
    });
    const response = proxy(request);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3030/login?next=%2Fdashboard",
    );
  });
});
