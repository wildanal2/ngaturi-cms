import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SumopodProvider,
  SUMOPOD_SANDBOX_BASE_URL,
  SUMOPOD_LIVE_BASE_URL,
  SUMOPOD_SANDBOX_CHECKOUT_HOST,
  normalizeSumopodPayment,
  parseSumopodCreatedPayment,
  verifySumopodWebhook,
} from "./sumopod";
import { providerRequest, PROVIDER_REQUEST_TIMEOUT_MS } from "./http";

const config = {
  baseUrl: SUMOPOD_SANDBOX_BASE_URL,
  apiKey: "sandbox-test-key",
  webhookToken: "test-token",
};
const id = "d4f7134c-ef0d-44b6-9e98-745a283221d8";
const linkId = "34553130-5d90-4262-a29e-edf8a12fface";
const liveCheckoutUrl = `https://checkout.pymnt.app/payment-links/${linkId}`;
const data = {
  payment_id: id,
  order_id: "NGUNL-test",
  amount: 49_000,
  status: "pending",
};
const input = {
  merchantReference: "NGUNL-test",
  amount: "49000.00",
  currency: "IDR" as const,
  itemName: "Upgrade",
  customer: {},
  callbackUrl: "https://app.example/payment/callback?invoice=NGUNL-test",
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Sumopod official Managed Payment contract", () => {
  it("sends exact QRIS sandbox creation and validates documented hosted response", async () => {
    const fetch = vi.fn().mockResolvedValue(
      Response.json({
        ...data,
        payment_link_url: `https://pay.sumopod.com/pay/${id}`,
      }),
    );
    vi.stubGlobal("fetch", fetch);
    await expect(
      new SumopodProvider(config).createPayment(input),
    ).resolves.toEqual({
      redirectUrl: `https://pay.sumopod.com/pay/${id}`,
      providerPaymentId: id,
    });
    const [url, request] = fetch.mock.calls[0];
    expect(url).toBe(`${SUMOPOD_SANDBOX_BASE_URL}/api/v1/payments`);
    expect(request.headers).toEqual({
      "Content-Type": "application/json",
      "X-Api-Key": config.apiKey,
    });
    expect(JSON.parse(request.body)).toEqual({
      order_id: "NGUNL-test",
      amount: 49_000,
      currency: "IDR",
      expires_in_hours: 24,
      success_return_url: input.callbackUrl,
      cancel_return_url: input.callbackUrl,
      payment_method_type_code: "QRIS",
    });
    expect(request.signal).toBeInstanceOf(AbortSignal);
    expect(request.redirect).toBe("error");
  });
  it("validates the distinct hosted-link UUID observed from the official sandbox API", async () => {
    const payment_link_url = `https://${SUMOPOD_SANDBOX_CHECKOUT_HOST}/payment-links/34553130-5d90-4262-a29e-edf8a12fface`;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ ...data, payment_link_url })),
    );
    await expect(
      new SumopodProvider(config).createPayment(input),
    ).resolves.toEqual({
      redirectUrl: payment_link_url,
      providerPaymentId: id,
    });
    expect(() =>
      parseSumopodCreatedPayment(
        input,
        { ...data, payment_link_url },
        SUMOPOD_LIVE_BASE_URL,
      ),
    ).toThrow("untrusted_checkout_url");
  });
  it.each([
    { order_id: "different" },
    { amount: 1 },
    { currency: "USD" },
    { payment_link_url: "https://evil.example/pay/test" },
    { payment_link_url: `http://pay.sumopod.com/pay/${id}` },
    { payment_link_url: `https://pay.sumopod.com.evil.example/pay/${id}` },
    { payment_link_url: `https://user:password@pay.sumopod.com/pay/${id}` },
    { payment_link_url: "https://pay.sumopod.com/pay/another" },
    {
      payment_link_url: `https://${SUMOPOD_SANDBOX_CHECKOUT_HOST}.evil.example/payment-links/${id}`,
    },
    {
      payment_link_url: `https://${SUMOPOD_SANDBOX_CHECKOUT_HOST}/payment-links/another`,
    },
    {
      payment_link_url: `https://${SUMOPOD_SANDBOX_CHECKOUT_HOST}:8443/payment-links/${id}`,
    },
    {
      payment_link_url: `https://${SUMOPOD_SANDBOX_CHECKOUT_HOST}/payment-links/${id}?return_url=https://evil.example`,
    },
  ])(
    "rejects inconsistent or untrusted create response %j",
    async (override) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          Response.json({
            ...data,
            payment_link_url: `https://pay.sumopod.com/pay/${id}`,
            ...override,
          }),
        ),
      );
      await expect(
        new SumopodProvider(config).createPayment(input),
      ).rejects.toMatchObject({ outcome: "unknown" });
    },
  );
  it.each([
    ["HTTP", `http://checkout.pymnt.app/payment-links/${linkId}`],
    ["wrong hostname", `https://evil.example/payment-links/${linkId}`],
    [
      "hostname suffix",
      `https://checkout.pymnt.app.evil.com/payment-links/${linkId}`,
    ],
    ["subdomain", `https://sub.checkout.pymnt.app/payment-links/${linkId}`],
    ["wrong path", `https://checkout.pymnt.app/pay/${linkId}`],
    ["trailing slash", `${liveCheckoutUrl}/`],
    ["extra path", `${liveCheckoutUrl}/extra`],
    ["invalid UUID", "https://checkout.pymnt.app/payment-links/not-a-uuid"],
    [
      "invalid UUID variant",
      "https://checkout.pymnt.app/payment-links/34553130-5d90-4262-029e-edf8a12fface",
    ],
    [
      "userinfo",
      `https://user:password@checkout.pymnt.app/payment-links/${linkId}`,
    ],
    ["empty userinfo", `https://@checkout.pymnt.app/payment-links/${linkId}`],
    [
      "non-default port",
      `https://checkout.pymnt.app:8443/payment-links/${linkId}`,
    ],
    ["query", `${liveCheckoutUrl}?token=private`],
    ["empty query", `${liveCheckoutUrl}?`],
    ["fragment", `${liveCheckoutUrl}#private`],
    ["empty fragment", `${liveCheckoutUrl}#`],
    [
      "normalized path",
      `https://checkout.pymnt.app/other/../payment-links/${linkId}`,
    ],
    ["legacy hostname suffix", `https://pay.sumopod.com.evil.com/pay/${id}`],
    ["legacy invalid UUID", "https://pay.sumopod.com/pay/not-a-uuid"],
    ["legacy mismatched ID", `https://pay.sumopod.com/pay/${linkId}`],
  ])("rejects LIVE checkout URL with %s", (_description, payment_link_url) => {
    expect(() =>
      parseSumopodCreatedPayment(
        input,
        { ...data, payment_link_url },
        SUMOPOD_LIVE_BASE_URL,
      ),
    ).toThrow("untrusted_checkout_url");
  });
  it.each([
    `https://pay.sumopod.com:443/pay/${id}`,
    `https://checkout.pymnt.app:443/payment-links/${linkId}`,
  ])("accepts the default HTTPS port in %s", (payment_link_url) => {
    expect(
      parseSumopodCreatedPayment(
        input,
        { ...data, payment_link_url },
        SUMOPOD_LIVE_BASE_URL,
      ),
    ).toEqual({
      providerPaymentId: id,
      redirectUrl: new URL(payment_link_url).toString(),
    });
  });
  it("does not accept the LIVE-only hostname in sandbox", () => {
    expect(() =>
      parseSumopodCreatedPayment(input, {
        ...data,
        payment_link_url: liveCheckoutUrl,
      }),
    ).toThrow("untrusted_checkout_url");
  });
  it.each([400, 401, 409, 422, 429, 500])(
    "keeps undocumented HTTP %s rejection recoverable",
    async (status) => {
      const fetch = vi
        .fn()
        .mockResolvedValue(Response.json({ error: "rejected" }, { status }));
      vi.stubGlobal("fetch", fetch);
      await expect(
        new SumopodProvider(config).createPayment(input),
      ).rejects.toMatchObject({
        code: "sumopod_create_outcome_unknown",
        outcome: "unknown",
        diagnostics: { upstreamStatus: status },
      });
      expect(fetch).toHaveBeenCalledOnce();
    },
  );
  it.each([
    ["pending", "pending"],
    ["completed", "paid"],
    ["failed", "failed"],
    ["expired", "expired"],
    ["cancelled", "failed"],
  ])("normalizes observed %s as %s", (status, expected) => {
    expect(normalizeSumopodPayment({ ...data, status })).toMatchObject({
      provider: "sumopod",
      providerPaymentId: id,
      merchantReference: "NGUNL-test",
      amount: "49000.00",
      currency: "IDR",
      status: expected,
      providerStatus: status,
    });
  });
  it("fails safely for undocumented statuses, refunds, and status-query endpoint", async () => {
    expect(() =>
      normalizeSumopodPayment({ ...data, status: "refunded" }),
    ).toThrow("invalid_provider_response");
    await expect(
      new SumopodProvider(config).getPaymentStatus({
        providerOrderId: "NGUNL-test",
        providerPaymentId: id,
      }),
    ).rejects.toMatchObject({
      code: "sumopod_status_contract_missing",
      outcome: "unavailable",
    });
  });
  it("requires sandbox API and webhook configuration, and gates live creation", async () => {
    expect(
      new SumopodProvider({ ...config, apiKey: undefined }).isConfigured(),
    ).toBe(false);
    expect(
      new SumopodProvider({
        ...config,
        webhookToken: undefined,
      }).isConfigured(),
    ).toBe(false);
    expect(
      new SumopodProvider({
        ...config,
        baseUrl: SUMOPOD_LIVE_BASE_URL,
      }).isConfigured(),
    ).toBe(false);
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(
      new SumopodProvider({
        ...config,
        baseUrl: SUMOPOD_LIVE_BASE_URL,
      }).createPayment(input),
    ).rejects.toMatchObject({ outcome: "unavailable" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([`https://pay.sumopod.com/pay/${id}`, liveCheckoutUrl])(
    "allows one explicitly enabled LIVE create returning %s",
    async (payment_link_url) => {
      const fetch = vi.fn().mockResolvedValue(
        Response.json({
          ...data,
          payment_link_url,
        }),
      );
      vi.stubGlobal("fetch", fetch);
      const live = new SumopodProvider({
        ...config,
        baseUrl: SUMOPOD_LIVE_BASE_URL,
        liveEnabled: true,
      });
      expect(live.isSandbox()).toBe(false);
      await expect(live.createPayment(input)).resolves.toMatchObject({
        providerPaymentId: id,
        redirectUrl: payment_link_url,
      });
      expect(fetch).toHaveBeenCalledOnce();
      expect(fetch.mock.calls[0][0]).toBe(
        `${SUMOPOD_LIVE_BASE_URL}/api/v1/payments`,
      );
      expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
        order_id: input.merchantReference,
        amount: 49_000,
        payment_method_type_code: "QRIS",
      });
      fetch.mockClear();
      await expect(
        live.getPaymentStatus({
          providerOrderId: input.merchantReference,
          providerPaymentId: id,
        }),
      ).rejects.toMatchObject({
        code: "sumopod_status_contract_missing",
      });
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it.each([
    [
      "malformed JSON",
      "not-json-private-provider-body",
      "invalid_provider_response",
    ],
    [
      "invalid schema",
      JSON.stringify({ private: "provider-body" }),
      "invalid_provider_response",
    ],
    [
      "mismatched response",
      JSON.stringify({
        ...data,
        order_id: "wrong",
        payment_link_url: liveCheckoutUrl,
      }),
      "provider_response_mismatch",
    ],
    [
      "untrusted link",
      JSON.stringify({
        ...data,
        payment_link_url: `${liveCheckoutUrl}?token=private`,
      }),
      "untrusted_checkout_url",
    ],
  ])("retains HTTP status for %s", async (_description, body, code) => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(body, { status: 201 }));
    vi.stubGlobal("fetch", fetch);
    await expect(
      new SumopodProvider({
        ...config,
        baseUrl: SUMOPOD_LIVE_BASE_URL,
        liveEnabled: true,
      }).createPayment(input),
    ).rejects.toMatchObject({
      code,
      outcome: "unknown",
      diagnostics: { upstreamStatus: 201 },
    });
    expect(fetch).toHaveBeenCalledOnce();
  });
  it.each([
    { apiKey: undefined },
    { apiKey: " " },
    { webhookToken: undefined },
    { webhookToken: " " },
    { webhookSecret: "invalid-secret" },
    { baseUrl: "https://untrusted.example" },
    { baseUrl: `${SUMOPOD_LIVE_BASE_URL}/` },
    { liveEnabled: false },
  ])(
    "fails closed for incomplete/invalid LIVE settings %j",
    async (override) => {
      const live = new SumopodProvider({
        ...config,
        baseUrl: SUMOPOD_LIVE_BASE_URL,
        liveEnabled: true,
        ...override,
      });
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
      expect(live.isConfigured()).toBe(false);
      await expect(live.createPayment(input)).rejects.toMatchObject({
        outcome: "unavailable",
      });
      expect(fetch).not.toHaveBeenCalled();
    },
  );
});

describe("Sumopod verified webhooks", () => {
  const secret = `whsec_${Buffer.from("test-signing-secret").toString("base64")}`;
  function signed(raw: string, timestamp = Math.floor(Date.now() / 1000)) {
    const signature = createHmac(
      "sha256",
      Buffer.from(secret.slice(6), "base64"),
    )
      .update(`msg-test.${timestamp}.${raw}`)
      .digest("base64");
    return new Headers({
      "svix-id": "msg-test",
      "svix-timestamp": String(timestamp),
      "svix-signature": `v1,${signature}`,
    });
  }
  it("verifies signed LIVE settlement even when new LIVE creation is disabled", () => {
    const raw = JSON.stringify({
      event_type: "payment.completed",
      data: { ...data, status: "completed" },
    });
    const live = new SumopodProvider({
      baseUrl: SUMOPOD_LIVE_BASE_URL,
      liveEnabled: false,
      webhookSecret: secret,
    });
    expect(live.isConfigured()).toBe(false);
    expect(
      live.parseVerifiedWebhook(signed(raw), raw, "/payment/webhook/sumopod")
        .observation,
    ).toMatchObject({ status: "paid", provider: "sumopod" });
  });
  it("verifies the official Svix known-answer vector", () => {
    const timestamp = "1731705121";
    const headers = new Headers({
      "svix-id": "msg_loFOjxBNrRLzqYUf",
      "svix-timestamp": timestamp,
      "svix-signature": "v1,rAvfW3dJ/X/qxhsaXPOyyCGmRKsaKWcsNccKXlIktD0=",
    });
    expect(
      verifySumopodWebhook(
        headers,
        '{"event_type":"ping","data":{"success":true}}',
        { ...config, webhookSecret: "whsec_plJ3nmyCDGBKInavdOK15jsl" },
        Number(timestamp) * 1000,
      ),
    ).toBe(true);
  });
  it("verifies raw-body signatures and accepts rotation signature lists", () => {
    const raw = JSON.stringify({
      event_type: "payment.completed",
      data: { ...data, status: "completed" },
    });
    const headers = signed(raw);
    headers.set(
      "svix-signature",
      `v1,invalid ${headers.get("svix-signature")} v2,untrusted`,
    );
    expect(
      new SumopodProvider({
        ...config,
        webhookSecret: secret,
      }).parseVerifiedWebhook(headers, raw, "/payment/webhook/sumopod")
        .observation,
    ).toMatchObject({ status: "paid" });
    expect(
      verifySumopodWebhook(headers, raw + " ", {
        ...config,
        webhookSecret: secret,
      }),
    ).toBe(false);
  });
  it.each([-301, 301])(
    "rejects stale/future signed attempts (%s seconds)",
    (offset) => {
      const raw = JSON.stringify({ event_type: "payment.test" });
      const headers = signed(raw, Math.floor(Date.now() / 1000) + offset);
      headers.set("x-webhook-token", config.webhookToken);
      expect(
        verifySumopodWebhook(headers, raw, {
          ...config,
          webhookSecret: secret,
        }),
      ).toBe(false);
    },
  );
  it("verifies the official token alternative only when no signing secret is configured", () => {
    const headers = new Headers({ "x-webhook-token": config.webhookToken });
    expect(verifySumopodWebhook(headers, "{}", config)).toBe(true);
    expect(
      verifySumopodWebhook(headers, "{}", { ...config, webhookSecret: secret }),
    ).toBe(false);
    headers.set("x-webhook-token", "wrong");
    expect(verifySumopodWebhook(headers, "{}", config)).toBe(false);
    expect(
      verifySumopodWebhook(new Headers(), "{}", { baseUrl: config.baseUrl }),
    ).toBe(false);
  });
  it("authenticates before parsing, ignores test events, and rejects contradictory event/status", () => {
    const provider = new SumopodProvider(config);
    expect(() =>
      provider.parseVerifiedWebhook(
        new Headers(),
        "malformed",
        "/payment/webhook/sumopod",
      ),
    ).toThrow("bad_signature");
    const headers = new Headers({ "x-webhook-token": config.webhookToken });
    expect(
      provider.parseVerifiedWebhook(
        headers,
        '{"event_type":"payment.test"}',
        "/payment/webhook/sumopod",
      ).observation,
    ).toBeNull();
    expect(() =>
      provider.parseVerifiedWebhook(
        headers,
        JSON.stringify({ event_type: "payment.completed", data }),
        "/payment/webhook/sumopod",
      ),
    ).toThrow("bad_status");
  });
  it.each([
    ["payment.failed", "failed"],
    ["payment.expired", "expired"],
  ])("normalizes authenticated %s", (event_type, status) => {
    const raw = JSON.stringify({ event_type, data: { ...data, status } });
    expect(
      new SumopodProvider(config).parseVerifiedWebhook(
        new Headers({ "x-webhook-token": config.webhookToken }),
        raw,
        "/payment/webhook/sumopod",
      ).observation,
    ).toMatchObject({ status });
  });
});

describe("bounded provider requests", () => {
  it.each([SUMOPOD_SANDBOX_BASE_URL, SUMOPOD_LIVE_BASE_URL])(
    "times out %s creation without retry or provider fallback",
    async (baseUrl) => {
      vi.useFakeTimers();
      const fetch = vi.fn().mockImplementation(() => new Promise(() => {}));
      vi.stubGlobal("fetch", fetch);
      const request = new SumopodProvider({
        ...config,
        baseUrl,
        liveEnabled: true,
      }).createPayment(input);
      const rejected = expect(request).rejects.toMatchObject({
        code: "provider_timeout",
        outcome: "unknown",
      });
      expect(PROVIDER_REQUEST_TIMEOUT_MS).toBe(15_000);
      await vi.advanceTimersByTimeAsync(PROVIDER_REQUEST_TIMEOUT_MS - 1);
      expect(fetch.mock.calls[0][1].signal.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      await rejected;
      expect(fetch).toHaveBeenCalledOnce();
      expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
    },
  );
  it("bounds response-body reading as well as connection time", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ status: 200, text: () => new Promise(() => {}) }),
    );
    const rejected = expect(
      providerRequest("https://provider.example", {}),
    ).rejects.toMatchObject({
      code: "provider_timeout",
      diagnostics: { upstreamStatus: 200 },
    });
    await vi.advanceTimersByTimeAsync(PROVIDER_REQUEST_TIMEOUT_MS);
    await rejected;
  });
  it.each([false, true])(
    "classifies transport failure with headers received = %s",
    async (headersReceived) => {
      const error = new TypeError("private network failure details");
      const fetch = headersReceived
        ? vi.fn().mockResolvedValue({
            status: 201,
            text: async () => {
              throw error;
            },
          })
        : vi.fn().mockRejectedValue(error);
      vi.stubGlobal("fetch", fetch);
      await expect(
        providerRequest("https://provider.example", {}),
      ).rejects.toMatchObject({
        code: "provider_transport_error",
        outcome: "unknown",
        diagnostics: { upstreamStatus: headersReceived ? 201 : undefined },
      });
      expect(fetch).toHaveBeenCalledOnce();
    },
  );
});
