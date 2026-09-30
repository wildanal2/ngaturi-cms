import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth/config";
import { sanitizedAuthHeaders } from "@/lib/security/request-metadata";

const handlers = toNextJsHandler(auth.handler);

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

export function GET(request: Request) {
  return handlers.GET(withTrustedRequestMetadata(request));
}

export function POST(request: Request) {
  return handlers.POST(withTrustedRequestMetadata(request));
}
