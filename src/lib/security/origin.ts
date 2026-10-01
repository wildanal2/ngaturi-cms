import { env } from "@/lib/env";

/** The configured application origin, never inferred from a request header. */
export function canonicalApplicationOrigin(
  raw = env.BETTER_AUTH_URL,
  nodeEnv = env.NODE_ENV,
): string {
  if (raw.includes("\\"))
    throw new Error("Invalid canonical application origin");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid canonical application origin");
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(
    url.hostname.toLowerCase(),
  );
  if (
    (url.protocol !== "https:" &&
      !(nodeEnv !== "production" && local && url.protocol === "http:")) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error("Invalid canonical application origin");
  return url.origin;
}
