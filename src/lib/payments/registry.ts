import { env } from "@/lib/env";
import { DokuProvider } from "./doku-provider";
import { SumopodProvider } from "./sumopod";
import {
  PaymentProviderError,
  type PaymentProvider,
  type PaymentProviderName,
} from "./provider";

const providers: Record<string, PaymentProvider> = {
  doku: new DokuProvider(),
  sumopod: new SumopodProvider(),
};

/** Capabilities describe contracts, independently of the NEW-checkout selector. */
export function statusReconciliationProviders(): PaymentProviderName[] {
  return Object.values(providers)
    .filter((provider) => provider.supportsStatusReconciliation === true)
    .map((provider) => provider.name);
}

/** Existing payments always resolve by the immutable stored provider. */
export function resolvePaymentProvider(provider: string): PaymentProvider {
  if (!Object.hasOwn(providers, provider)) {
    throw new PaymentProviderError(
      "unsupported_payment_provider",
      "unavailable",
    );
  }
  return providers[provider];
}

/** This selector is used only for NEW checkout creation. */
export function resolveCheckoutProvider(
  selector = env.PAYMENT_PROVIDER,
): PaymentProvider {
  return resolvePaymentProvider(selector === undefined ? "doku" : selector);
}

export function paymentAvailability() {
  try {
    const provider = resolveCheckoutProvider();
    return {
      configured: provider.isConfigured(),
      label: provider.label,
      sandbox: provider.isSandbox(),
    };
  } catch {
    return { configured: false, label: "", sandbox: false };
  }
}
