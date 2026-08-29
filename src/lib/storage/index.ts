import { S3Client } from "@aws-sdk/client-s3";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

/**
 * S3-compatible client (Tigris). Server-only.
 */
export const s3 = new S3Client({
  region: env.AWS_REGION,
  endpoint: env.AWS_ENDPOINT_URL_S3,
  forcePathStyle: false,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export const S3_BUCKET = env.S3_BUCKET;

/** Public URL untuk sebuah object key (bucket harus public-read). */
export function publicUrl(key: string): string {
  return `${env.S3_PUBLIC_URL.replace(/\/$/, "")}/${key.replace(/^\//, "")}`;
}

/** Presigned PUT URL untuk upload langsung dari browser. */
export function presignPut(
  key: string,
  contentType: string,
  expiresIn = 600,
): Promise<string> {
  return getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn },
  );
}

/** Presigned GET URL (untuk object private). */
export function presignGet(key: string, expiresIn = 600): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }),
    { expiresIn },
  );
}
