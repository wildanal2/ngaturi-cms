import { env } from "@/lib/env";
import { getWorkerEnv } from "@/lib/runtime/context";

export const TRUSTED_CLIENT_IP_HEADER = "x-ngaturi-trusted-client-ip";

function normalizedIp(value: string | null): string | null {
  if (!value || value !== value.trim() || value.includes(",")) return null;
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)) {
    const parts = value.split(".");
    return parts.every(
      (part) => Number(part) <= 255 && (part === "0" || !part.startsWith("0")),
    )
      ? parts.map(Number).join(".")
      : null;
  }
  if (!/^[0-9a-fA-F:.]+$/.test(value) || !value.includes(":")) return null;
  try {
    const host = new URL(`http://[${value}]/`).hostname;
    return host.startsWith("[") && host.endsWith("]")
      ? host.slice(1, -1)
      : null;
  } catch {
    return null;
  }
}

/** Node may trust Cloudflare's header only after its ingress is isolated. */
export function hasTrustedCloudflareIngress(): boolean {
  return Boolean(getWorkerEnv()) || env.TRUST_CLOUDFLARE_INGRESS;
}

export function trustedClientIp(
  headers: Headers,
  trustedIngress = hasTrustedCloudflareIngress(),
): string | null {
  return trustedIngress ? normalizedIp(headers.get("cf-connecting-ip")) : null;
}

/** Better Auth sees only the IP that our own trust decision has accepted. */
export function sanitizedAuthHeaders(
  headers: Headers,
  trustedIngress = hasTrustedCloudflareIngress(),
): Headers {
  const safe = new Headers(headers);
  safe.delete("cf-connecting-ip");
  safe.delete("x-forwarded-for");
  safe.delete(TRUSTED_CLIENT_IP_HEADER);
  const ip = trustedClientIp(headers, trustedIngress);
  if (ip) safe.set(TRUSTED_CLIENT_IP_HEADER, ip);
  return safe;
}
