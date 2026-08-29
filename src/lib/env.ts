import { z } from "zod";

/**
 * Server-side environment. Validated once at module load.
 * Never import this from Client Components or middleware (Edge).
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_INVITATION_DOMAINS: z.string().min(1),

  DATABASE_URL: z.string().min(1),
  DATABASE_POOL_SIZE: z.coerce.number().int().positive().default(10),

  REDIS_URL: z.string().min(1),

  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_ENDPOINT_URL_S3: z.url(),
  AWS_REGION: z.string().default("auto"),
  S3_BUCKET: z.string().min(1),
  S3_PUBLIC_URL: z.url(),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(10),

  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),

  CRON_SECRET: z.string().min(1),

  // Optional (fitur menyusul)
  TURNSTILE_SECRET_KEY: z.string().optional(),
  MIDTRANS_SERVER_KEY: z.string().optional(),
  MIDTRANS_IS_PRODUCTION: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables:",
    JSON.stringify(z.treeifyError(parsed.error), null, 2),
  );
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;

export const invitationDomains = env.NEXT_PUBLIC_INVITATION_DOMAINS.split(",")
  .map((d) => d.trim())
  .filter(Boolean);
