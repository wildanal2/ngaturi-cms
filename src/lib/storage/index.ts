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

/** Public URL for an object key (the bucket/custom domain must be public). */
export function publicUrl(key: string): string {
  return `${env.S3_PUBLIC_URL.replace(/\/$/, "")}/${key.replace(/^\//, "")}`;
}

export function isTrustedPublicUrl(value: string): boolean {
  try {
    const candidate = new URL(value);
    const base = new URL(`${env.S3_PUBLIC_URL.replace(/\/$/, "")}/`);
    return (
      candidate.origin === base.origin &&
      candidate.pathname.startsWith(base.pathname)
    );
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
  const bucket = getWorkerEnv()?.MEDIA_BUCKET;
  if (bucket) {
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
