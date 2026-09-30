import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth/config";
import { sanitizedAuthHeaders } from "@/lib/security/request-metadata";

const handlers = toNextJsHandler(auth.handler);

function withTrustedRequestMetadata(request: Request): Request {
  return new Request(request, {
    headers: sanitizedAuthHeaders(request.headers),
  });
}

export function GET(request: Request) {
  return handlers.GET(withTrustedRequestMetadata(request));
}

export function POST(request: Request) {
  return handlers.POST(withTrustedRequestMetadata(request));
}
