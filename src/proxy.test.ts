import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("better-auth/cookies", () => ({ getSessionCookie: vi.fn(() => null) }));

import { proxy } from "./proxy";

describe("protected route redirect", () => {
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
