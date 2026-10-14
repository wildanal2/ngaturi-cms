import { PaymentProviderError } from "./provider";

export const PROVIDER_REQUEST_TIMEOUT_MS = 15_000;

/** Bound both connection time and response-body consumption. Never retry creation. */
export async function providerRequest(
  url: string,
  init: RequestInit,
  timeoutMs = PROVIDER_REQUEST_TIMEOUT_MS,
): Promise<{ response: Response; rawBody: string }> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        const response = await fetch(url, {
          ...init,
          signal: controller.signal,
          redirect: "error",
        });
        return { response, rawBody: await response.text() };
      })(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new PaymentProviderError("provider_timeout"));
        }, timeoutMs);
      }),
    ]);
  } catch (error) {
    if (error instanceof PaymentProviderError) throw error;
    throw new PaymentProviderError("provider_transport_error");
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
