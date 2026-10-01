import { AwsClient } from "aws4fetch";
import { env } from "@/lib/env";
import { getWorkerEnv } from "@/lib/runtime/context";

export interface PutObjectInput {
  key: string;
  body: ArrayBuffer | ArrayBufferView;
  contentType: string;
  cacheControl?: string;
}

function objectUrl(key: string): URL {
  const endpoint = env.AWS_ENDPOINT_URL_S3.replace(/\/$/, "");
  const bucket = encodeURIComponent(env.S3_BUCKET);
  const path = key
    .replace(/^\//, "")
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  return new URL(`${endpoint}/${bucket}/${path}`);
}

function signingClient(): AwsClient {
  return new AwsClient({
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    service: "s3",
    region: env.AWS_REGION,
  });
}

function joinPublicUrl(base: string, key: string): string {
  return `${base.replace(/\/$/, "")}/${key.replace(/^\//, "")}`;
}

function r2PublicUrl(): string | undefined {
  const workerEnv = getWorkerEnv();
  return workerEnv ? workerEnv.R2_PUBLIC_URL : env.R2_PUBLIC_URL;
}

function requireR2PublicUrl(): string {
  const base = r2PublicUrl();
  if (!base) {
    throw new Error(
      "R2_PUBLIC_URL is required in the Cloudflare Worker runtime",
    );
  }
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    throw new Error("R2_PUBLIC_URL must use an HTTPS R2 custom domain");
  }
  const hostname = url.hostname.toLowerCase();
  if (
    url.protocol !== "https:" ||
    hostname === "r2.dev" ||
    hostname.endsWith(".r2.dev")
  ) {
    throw new Error("R2_PUBLIC_URL must use an HTTPS R2 custom domain");
  }
  return base;
}

/** Public URL matching the storage target used by the current runtime. */
export function publicUrl(key: string): string {
  if (getWorkerEnv()) {
    return joinPublicUrl(requireR2PublicUrl(), key);
  }
  return legacyPublicUrl(key);
}

/** Public URL for signed S3 writes (R2 in the primary Node configuration).
 * Kept as an alias for the existing presign route.
 */
export function legacyPublicUrl(key: string): string {
  return joinPublicUrl(env.S3_PUBLIC_URL, key);
}

/** Configured media prefixes that remain readable during the migration. */
export function trustedPublicMediaPrefixes(): string[] {
  return [
    ...new Set(
      [
        env.S3_PUBLIC_URL,
        r2PublicUrl(),
        ...env.LEGACY_MEDIA_PUBLIC_URLS,
      ].filter(Boolean),
    ),
  ] as string[];
}

export function isTrustedPublicUrl(value: string): boolean {
  try {
    const candidate = new URL(value);
    if (
      !["http:", "https:"].includes(candidate.protocol) ||
      candidate.username ||
      candidate.password
    ) {
      return false;
    }
    return trustedPublicMediaPrefixes().some((prefix) => {
      const base = new URL(`${prefix.replace(/\/$/, "")}/`);
      return (
        candidate.origin === base.origin &&
        candidate.pathname.startsWith(base.pathname)
      );
    });
  } catch {
    return false;
  }
}

/** Store server-originated bytes through R2 in Workers or signed S3 fetch in Node. */
export async function putObject({
  key,
  body,
  contentType,
  cacheControl,
}: PutObjectInput): Promise<void> {
  const workerEnv = getWorkerEnv();
  if (workerEnv) {
    const bucket = workerEnv.MEDIA_BUCKET;
    if (!bucket) {
      throw new Error(
        "MEDIA_BUCKET binding is required in the Cloudflare Worker runtime",
      );
    }
    await bucket.put(key, body, {
      httpMetadata: { contentType, cacheControl },
    });
    return;
  }

  const request = await signingClient().sign(
    new Request(objectUrl(key), {
      method: "PUT",
      headers: {
        "content-type": contentType,
        ...(cacheControl ? { "cache-control": cacheControl } : {}),
      },
      body: body as BodyInit,
    }),
  );
  const response = await fetch(request);
  if (!response.ok) {
    throw new Error(`Object upload failed with status ${response.status}`);
  }
}

/** Presigned PUT URL for direct browser uploads. */
export async function presignPut(
  key: string,
  contentType: string,
  expiresIn = 600,
): Promise<string> {
  const url = objectUrl(key);
  url.searchParams.set("X-Amz-Expires", String(expiresIn));
  const signed = await signingClient().sign(
    new Request(url, {
      method: "PUT",
      headers: { "content-type": contentType },
    }),
    { aws: { signQuery: true } },
  );
  return signed.url;
}

/** Presigned GET URL for private objects. */
export async function presignGet(
  key: string,
  expiresIn = 600,
): Promise<string> {
  const url = objectUrl(key);
  url.searchParams.set("X-Amz-Expires", String(expiresIn));
  const signed = await signingClient().sign(new Request(url), {
    aws: { signQuery: true },
  });
  return signed.url;
}
