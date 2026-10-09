import { env } from "@/lib/env";
import { DokuProvider } from "./doku-provider";
import { SumopodProvider } from "./sumopod";
import { PaymentProviderError, type PaymentProvider } from "./provider";

const providers: Record<string, PaymentProvider> = {
  doku: new DokuProvider(),
  sumopod: new SumopodProvider(),
};

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
