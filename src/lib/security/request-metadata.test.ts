import { describe, expect, it } from "vitest";
import { runWithInvocationContext } from "@/lib/runtime/context";
import {
  sanitizedAuthHeaders,
  trustedClientIp,
  TRUSTED_CLIENT_IP_HEADER,
} from "./request-metadata";

describe("trusted request metadata", () => {
  const forged = new Headers({
    host: "evil.example",
    "x-forwarded-host": "evil.example",
    "x-forwarded-proto": "http",
    "x-forwarded-for": "198.51.100.2, 203.0.113.5",
    "cf-connecting-ip": "203.0.113.10",
    [TRUSTED_CLIENT_IP_HEADER]: "192.0.2.99",
  });

  it("ignores all client-supplied IP headers on direct Node requests", () => {
    expect(trustedClientIp(forged, false)).toBeNull();
    const safe = sanitizedAuthHeaders(forged, false);
    expect(safe.get(TRUSTED_CLIENT_IP_HEADER)).toBeNull();
    expect(safe.get("x-forwarded-for")).toBeNull();
    expect(safe.get("cf-connecting-ip")).toBeNull();
  });

  it("trusts a single valid Cloudflare IP inside Worker context", () => {
    expect(runWithInvocationContext({}, () => trustedClientIp(forged))).toBe(
      "203.0.113.10",
    );
    expect(
      sanitizedAuthHeaders(forged, true).get(TRUSTED_CLIENT_IP_HEADER),
    ).toBe("203.0.113.10");
  });

  it.each([
    "198.51.100.1, 203.0.113.3",
    "999.1.1.1",
    "localhost",
    "127.0.0.1:1234",
    "",
  ])("rejects malformed or chained Cloudflare IP %s", (value) => {
    expect(
      trustedClientIp(
        new Headers({
          "cf-connecting-ip": value,
          "x-forwarded-for": "198.51.100.1",
        }),
        true,
      ),
    ).toBeNull();
  });

  it("accepts a valid IPv6 Cloudflare address", () => {
    expect(
      trustedClientIp(new Headers({ "cf-connecting-ip": "2001:db8::1" }), true),
    ).toBe("2001:db8::1");
  });
});
