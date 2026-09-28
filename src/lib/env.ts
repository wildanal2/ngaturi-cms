import { z } from "zod";

/**
 * Server-side environment. Validated once at module load.
 * Never import this from Client Components or middleware (Edge).
 */
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_INVITATION_DOMAINS: z.string().min(1),

  // Node development/migrations only. Workers use the HYPERDRIVE binding.
  DATABASE_URL: z.string().min(1).optional(),
  DATABASE_POOL_SIZE: z.coerce.number().int().positive().default(10),

  // Node development/PM2 uses TCP. Workers use the REST pair below.
  REDIS_URL: z.string().min(1).optional(),
  REDIS_REST_URL: z.url().optional(),
  REDIS_REST_TOKEN: z.string().min(1).optional(),

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
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  DOKU_CLIENT_ID: z.string().optional(),
  DOKU_SECRET_KEY: z.string().optional(),
  DOKU_BASE_URL: z.string().default("https://api-sandbox.doku.com"),
  DOKU_CALLBACK_URL: z.string().optional(),
  JAMENDO_CLIENT_ID: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

const completeRedisRestCredentials = schema.superRefine((value, ctx) => {
  if (Boolean(value.REDIS_REST_URL) !== Boolean(value.REDIS_REST_TOKEN)) {
    ctx.addIssue({
      code: "custom",
      path: ["REDIS_REST_URL"],
      message:
        "Cloudflare Worker Redis requires REDIS_REST_URL and REDIS_REST_TOKEN together",
    });
  }
});

const parsed = completeRedisRestCredentials.safeParse(process.env);

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
