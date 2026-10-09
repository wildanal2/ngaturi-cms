import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { env } from "@/lib/env";
import {
  resolveCheckoutProvider,
  resolvePaymentProvider,
  paymentAvailability,
} from "./registry";

const original = {
  PAYMENT_PROVIDER: env.PAYMENT_PROVIDER,
  DOKU_CLIENT_ID: env.DOKU_CLIENT_ID,
  DOKU_SECRET_KEY: env.DOKU_SECRET_KEY,
  SUMOPOD_API_KEY: env.SUMOPOD_API_KEY,
  SUMOPOD_WEBHOOK_TOKEN: env.SUMOPOD_WEBHOOK_TOKEN,
  SUMOPOD_BASE_URL: env.SUMOPOD_BASE_URL,
  SUMOPOD_WEBHOOK_SECRET: env.SUMOPOD_WEBHOOK_SECRET,
};
beforeEach(() => {
  env.PAYMENT_PROVIDER = undefined;
  env.DOKU_CLIENT_ID = undefined;
  env.DOKU_SECRET_KEY = undefined;
  env.SUMOPOD_API_KEY = undefined;
  env.SUMOPOD_WEBHOOK_TOKEN = undefined;
  env.SUMOPOD_BASE_URL = undefined;
  env.SUMOPOD_WEBHOOK_SECRET = undefined;
});
afterEach(() => Object.assign(env, original));

describe("payment provider selection", () => {
  it("defaults only an absent selector to DOKU", () => {
    expect(resolveCheckoutProvider().name).toBe("doku");
  });
  it.each(["doku", "sumopod"])("selects explicit %s", (selector) => {
    env.PAYMENT_PROVIDER = selector;
    expect(resolveCheckoutProvider().name).toBe(selector);
  });
  it.each(["", "other", "SUMOPOD", "__proto__", "toString"])(
    "fails safely for unsupported selector %s",
    (selector) => {
      expect(() => resolveCheckoutProvider(selector)).toThrow(
        "unsupported_payment_provider",
      );
      env.PAYMENT_PROVIDER = selector;
      expect(paymentAvailability().configured).toBe(false);
    },
  );
  it("requires only the selected provider's credentials for availability", () => {
    env.PAYMENT_PROVIDER = "sumopod";
    expect(paymentAvailability().configured).toBe(false);
    env.SUMOPOD_API_KEY = "sandbox-test-key";
    env.SUMOPOD_WEBHOOK_TOKEN = "test-token";
    expect(paymentAvailability()).toMatchObject({
      configured: true,
      label: "Sumopod",
      sandbox: true,
    });
    expect(resolvePaymentProvider("doku").isConfigured()).toBe(false);
    env.PAYMENT_PROVIDER = "doku";
    expect(paymentAvailability().configured).toBe(false);
    env.DOKU_CLIENT_ID = "test-client";
    env.DOKU_SECRET_KEY = "test-secret";
    expect(paymentAvailability().configured).toBe(true);
  });
  it("resolves historical payments independently in both switching directions", () => {
    env.PAYMENT_PROVIDER = "sumopod";
    expect(resolvePaymentProvider("doku").name).toBe("doku");
    env.PAYMENT_PROVIDER = "doku";
    expect(resolvePaymentProvider("sumopod").name).toBe("sumopod");
  });
});
