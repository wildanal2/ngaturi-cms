import { toNextJsHandler } from "better-auth/next-js";
import { sanitizedAuthHeaders } from "@/lib/security/request-metadata";

export const dynamic = "force-dynamic";

async function getHandlers() {
  const { auth } = await import("@/lib/auth/config");
  return toNextJsHandler(auth.handler);
}

function withTrustedRequestMetadata(request: Request): Request {
  // Next can wrap Request objects whose private state cannot be copied directly.
  return new Request(request.url, {
    method: request.method,
    headers: sanitizedAuthHeaders(request.headers),
    body: request.body,
    signal: request.signal,
    ...(request.body && { duplex: "half" }),
  });
}

export async function GET(request: Request) {
  const handlers = await getHandlers();
  return handlers.GET(withTrustedRequestMetadata(request));
}

export async function POST(request: Request) {
  const handlers = await getHandlers();
  return handlers.POST(withTrustedRequestMetadata(request));
}
