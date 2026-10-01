import { createHash, createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkOrderStatus,
  createCheckout,
  isDefinitiveCheckoutRejection,
  isPaymentSandbox,
  mapStatus,
  sanitizeText,
  verifyNotificationSignature,
} from "./doku";
import { env } from "@/lib/env";

afterEach(() => {
  vi.unstubAllGlobals();
});

const TEST_DOKU = {
  baseUrl: "https://api-sandbox.doku.com",
  clientId: "test-client",
  secretKey: "test-secret",
};

describe("payment review mode", () => {
  it("follows the actual runtime endpoint without treating production as Sandbox", () => {
    const original = env.DOKU_BASE_URL;
    try {
      env.DOKU_BASE_URL = "https://api-sandbox.doku.com";
      expect(isPaymentSandbox()).toBe(true);
      env.DOKU_BASE_URL = "https://api.doku.com";
      expect(isPaymentSandbox()).toBe(false);
      env.DOKU_BASE_URL = "https://api-sandbox.doku.com.example.org";
      expect(isPaymentSandbox()).toBe(false);
    } finally {
      env.DOKU_BASE_URL = original;
    }
  });
});

function signedDokuResponse(
  payload: object | string,
  init: RequestInit,
  target: string,
  includeDigest: boolean,
  status = 200,
) {
  const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
  const requestHeaders = init.headers as Record<string, string>;
  const responseTimestamp = "2026-09-21T07:00:00Z";
  const parts = [
    `Client-Id:${TEST_DOKU.clientId}`,
    `Request-Id:${requestHeaders["Request-Id"]}`,
    `Response-Timestamp:${responseTimestamp}`,
    `Request-Target:${target}`,
  ];
  if (includeDigest) {
    parts.push(`Digest:${createHash("sha256").update(raw).digest("base64")}`);
  }
  const signature = `HMACSHA256=${createHmac("sha256", TEST_DOKU.secretKey)
    .update(parts.join("\n"))
    .digest("base64")}`;
  return new Response(raw, {
    status,
    headers: {
      "Client-Id": TEST_DOKU.clientId,
      "Request-Id": requestHeaders["Request-Id"],
      "Response-Timestamp": responseTimestamp,
      Signature: signature,
      "Content-Type": "application/json",
    },
  });
}

describe("sanitizeText (DOKU whitelist)", () => {
  it("keeps allowed characters", () => {
    expect(sanitizeText("Upgrade undangan Basic")).toBe(
      "Upgrade undangan Basic",
    );
  });
  it("swaps disallowed punctuation", () => {
    expect(sanitizeText("A — B")).toBe("A - B");
    expect(sanitizeText("Kamar #3")).toBe("Kamar No.3");
    expect(sanitizeText("Dinda & Raka")).toBe("Dinda dan Raka");
  });
  it("strips other non-whitelisted characters (incl. parentheses)", () => {
    expect(sanitizeText("Halo* (dunia)!")).toBe("Halo dunia");
    expect(sanitizeText("Upgrade: Premium / 90 hari")).toBe(
      "Upgrade: Premium / 90 hari",
    );
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
    expect(mapStatus("FAILED")).toBe("pending");
    expect(mapStatus("REVERSED")).toBe("failed");
    expect(mapStatus("CANCELLED")).toBe("failed");
    expect(mapStatus("PENDING")).toBe("pending");
    expect(mapStatus("TIMEOUT")).toBe("pending");
    expect(mapStatus("REDIRECT")).toBe("pending");
    expect(mapStatus("REFUNDED")).toBe("refunded");
  });
});

describe("DOKU protocol validation", () => {
  it("sends a signed, server-defined IDR checkout and validates the response", async () => {
    const fetchMock = vi.fn().mockImplementation((_url, init: RequestInit) =>
      Promise.resolve(
        signedDokuResponse(
          {
            response: {
              order: {
                invoice_number: "NGUNL-test",
                amount: "49000",
                currency: "IDR",
                session_id: "session-id",
              },
              payment: {
                token_id: "token-id",
                url: "https://sandbox.doku.com/checkout-link-v2/token-id",
              },
            },
          },
          init,
          "/checkout/v1/payment",
          true,
        ),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const checkout = await createCheckout(
      {
        orderId: "NGUNL-test",
        amount: 49_000,
        itemName: "Basic",
        customer: { name: "Test", email: "test@example.com" },
        callbackUrl: "https://example.com/payment/callback",
      },
      TEST_DOKU,
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    const headers = init.headers as Record<string, string>;
    expect(init.method).toBe("POST");
    expect(body.order).toMatchObject({
      amount: 49_000,
      invoice_number: "NGUNL-test",
      currency: "IDR",
    });
    expect(body.order.line_items[0].price).toBe(49_000);
    expect(headers["Request-Id"]).toBeTruthy();
    expect(headers["Request-Timestamp"]).toMatch(/Z$/);
    expect(headers.Signature).toMatch(/^HMACSHA256=/);
    expect(checkout.url).toBe(
      "https://sandbox.doku.com/checkout-link-v2/token-id",
    );
  });

  it("rejects checkout responses that do not match the requested amount", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url, init: RequestInit) =>
        Promise.resolve(
          signedDokuResponse(
            {
              response: {
                order: {
                  invoice_number: "NGUNL-test",
                  amount: "1",
                  currency: "IDR",
                },
                payment: {
                  url: "https://sandbox.doku.com/checkout-link-v2/token-id",
                },
              },
            },
            init,
            "/checkout/v1/payment",
            true,
          ),
        ),
      ),
    );

    const result = createCheckout(
      {
        orderId: "NGUNL-test",
        amount: 49_000,
        itemName: "Basic",
        customer: {},
        callbackUrl: "https://example.com/payment/callback",
      },
      TEST_DOKU,
    );
    await expect(result).rejects.toThrow("did not match");
    await expect(result).rejects.toMatchObject({ outcome: "unknown" });
  });

  it("classifies an authenticated provider rejection as definitive", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation((_url, init: RequestInit) =>
          Promise.resolve(
            signedDokuResponse(
              { error: { code: "ORDER_REJECTED" } },
              init,
              "/checkout/v1/payment",
              true,
              422,
            ),
          ),
        ),
    );

    const result = createCheckout(
      {
        orderId: "NGUNL-test",
        amount: 49_000,
        itemName: "Basic",
        customer: {},
        callbackUrl: "https://example.com/payment/callback",
      },
      TEST_DOKU,
    );
    await expect(result).rejects.toMatchObject({ outcome: "rejected" });
    await result.catch((error) => {
      expect(isDefinitiveCheckoutRejection(error)).toBe(true);
    });
  });

  it.each([409, 429, 503])(
    "keeps an authenticated HTTP %s response ambiguous",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockImplementation((_url, init: RequestInit) =>
            Promise.resolve(
              signedDokuResponse(
                { error: { code: "INTERNAL_ERROR" } },
                init,
                "/checkout/v1/payment",
                true,
                status,
              ),
            ),
          ),
      );

      await expect(
        createCheckout(
          {
            orderId: "NGUNL-test",
            amount: 49_000,
            itemName: "Basic",
            customer: {},
            callbackUrl: "https://example.com/payment/callback",
          },
          TEST_DOKU,
        ),
      ).rejects.toMatchObject({ outcome: "unknown" });
    },
  );

  it("keeps network, malformed, and untrusted checkout outcomes ambiguous", async () => {
    const checkout = () =>
      createCheckout(
        {
          orderId: "NGUNL-test",
          amount: 49_000,
          itemName: "Basic",
          customer: {},
          callbackUrl: "https://example.com/payment/callback",
        },
        TEST_DOKU,
      );

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("timeout")));
    await checkout().catch((error) => {
      expect(isDefinitiveCheckoutRejection(error)).toBe(false);
    });

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation((_url, init: RequestInit) =>
          Promise.resolve(
            signedDokuResponse("not-json", init, "/checkout/v1/payment", true),
          ),
        ),
    );
    await expect(checkout()).rejects.toMatchObject({ outcome: "unknown" });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url, init: RequestInit) => {
        const response = signedDokuResponse(
          { response: {} },
          init,
          "/checkout/v1/payment",
          true,
        );
        response.headers.set("Signature", "HMACSHA256=untrusted");
        return Promise.resolve(response);
      }),
    );
    await expect(checkout()).rejects.toMatchObject({ outcome: "unknown" });
  });

  it("validates invoice and amount in status-query responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url, init: RequestInit) =>
        Promise.resolve(
          signedDokuResponse(
            {
              order: { invoice_number: "NGUNL-test", amount: 49_000 },
              transaction: { status: "SUCCESS" },
            },
            init,
            "/orders/v1/status/NGUNL-test",
            false,
          ),
        ),
      ),
    );

    await expect(checkOrderStatus("NGUNL-test", TEST_DOKU)).resolves.toEqual({
      invoiceNumber: "NGUNL-test",
      amount: 49_000,
      currency: undefined,
      status: "SUCCESS",
    });
  });

  it("parses signed full-refund evidence from a status response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url, init: RequestInit) =>
        Promise.resolve(
          signedDokuResponse(
            {
              order: { invoice_number: "NGUNL-test", amount: 49_000 },
              transaction: { status: "REFUNDED" },
              refund: { id: "refund-1", amount: 49_000 },
            },
            init,
            "/orders/v1/status/NGUNL-test",
            false,
          ),
        ),
      ),
    );

    await expect(checkOrderStatus("NGUNL-test", TEST_DOKU)).resolves.toEqual({
      invoiceNumber: "NGUNL-test",
      amount: 49_000,
      currency: undefined,
      status: "REFUNDED",
      refund: { id: "refund-1", amount: 49_000 },
    });
  });

  it("rejects a status response for a different invoice", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url, init: RequestInit) =>
        Promise.resolve(
          signedDokuResponse(
            {
              order: { invoice_number: "NGUNL-other", amount: 49_000 },
              transaction: { status: "SUCCESS" },
            },
            init,
            "/orders/v1/status/NGUNL-test",
            false,
          ),
        ),
      ),
    );

    await expect(checkOrderStatus("NGUNL-test", TEST_DOKU)).rejects.toThrow(
      "invalid status response",
    );
  });

  it("rejects an explicit non-IDR status currency", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url, init: RequestInit) =>
        Promise.resolve(
          signedDokuResponse(
            {
              order: {
                invoice_number: "NGUNL-test",
                amount: 49_000,
                currency: "USD",
              },
              transaction: { status: "SUCCESS" },
            },
            init,
            "/orders/v1/status/NGUNL-test",
            false,
          ),
        ),
      ),
    );

    await expect(checkOrderStatus("NGUNL-test", TEST_DOKU)).rejects.toThrow(
      "invalid status response",
    );
  });

  it("rejects a status response with an invalid signature", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url, init: RequestInit) => {
        const response = signedDokuResponse(
          {
            order: { invoice_number: "NGUNL-test", amount: 49_000 },
            transaction: { status: "SUCCESS" },
          },
          init,
          "/orders/v1/status/NGUNL-test",
          false,
        );
        response.headers.set("Signature", "HMACSHA256=invalid");
        return Promise.resolve(response);
      }),
    );

    await expect(checkOrderStatus("NGUNL-test", TEST_DOKU)).rejects.toThrow(
      "signature is invalid",
    );
  });

  it("accepts the correct webhook signature and rejects a modified one", () => {
    const clientId = "test-client";
    const secretKey = "test-secret";
    const raw = JSON.stringify({
      order: { invoice_number: "NGUNL-test", amount: 49_000 },
      transaction: { status: "SUCCESS" },
    });
    const requestId = crypto.randomUUID();
    const timestamp = "2026-09-21T07:00:00Z";
    const path = "/payment/webhook/doku";
    const digest = createHash("sha256").update(raw).digest("base64");
    const component = [
      `Client-Id:${clientId}`,
      `Request-Id:${requestId}`,
      `Request-Timestamp:${timestamp}`,
      `Request-Target:${path}`,
      `Digest:${digest}`,
    ].join("\n");
    const signature = `HMACSHA256=${createHmac("sha256", secretKey)
      .update(component)
      .digest("base64")}`;
    const headers = new Headers({
      "Client-Id": clientId,
      "Request-Id": requestId,
      "Request-Timestamp": timestamp,
      Signature: signature,
    });

    expect(
      verifyNotificationSignature(headers, raw, path, clientId, secretKey),
    ).toBe(true);
    headers.set("Signature", `${signature}x`);
    expect(
      verifyNotificationSignature(headers, raw, path, clientId, secretKey),
    ).toBe(false);
  });
});
