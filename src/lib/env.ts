import { z } from "zod";

/**
 * Server-side environment. Validated once at module load.
 * Never import this from Client Components or middleware (Edge).
 */
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  NEXT_PUBLIC_APP_URL: z.url().optional(),
  NEXT_PUBLIC_INVITATION_DOMAINS: z.string().min(1).optional(),
  SITE_INDEXING_ENABLED: z.enum(["true", "false"]).default("true"),

  // Node uses verified TLS directly. Workers use the HYPERDRIVE binding.
  DATABASE_URL: z.string().min(1).optional(),
  DATABASE_POOL_SIZE: z.coerce.number().int().positive().default(5),

  // Node defaults to REST. TCP is an explicit legacy fallback; Workers use REST.
  REDIS_TRANSPORT: z.enum(["rest", "tcp"]).default("rest"),
  REDIS_URL: z.string().min(1).optional(),
  REDIS_REST_URL: z.url().optional(),
  REDIS_REST_TOKEN: z.string().min(1).optional(),

  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_ENDPOINT_URL_S3: z.url(),
  AWS_REGION: z.string().default("auto"),
  S3_BUCKET: z.string().min(1),
  S3_PUBLIC_URL: z.url(),
  R2_PUBLIC_URL: z.url().optional(),
  LEGACY_MEDIA_PUBLIC_URLS: z
    .string()
    .default("")
    .transform((value, ctx) => {
      const prefixes: string[] = [];
      for (const entry of value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)) {
        try {
          const url = new URL(entry);
          if (
            !["http:", "https:"].includes(url.protocol) ||
            url.username ||
            url.password ||
            url.search ||
            url.hash
          ) {
            throw new Error("invalid media prefix");
          }
          prefixes.push(url.toString().replace(/\/$/, ""));
        } catch {
          ctx.addIssue({
            code: "custom",
            message:
              "Legacy media prefixes must be HTTP(S) URLs without credentials, query, or fragment",
          });
        }
      }
      return [...new Set(prefixes)];
    }),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(10),
  TRUST_CLOUDFLARE_INGRESS: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),

  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),

  CRON_SECRET: z.string().min(1),

  // Optional (fitur menyusul)
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  PAYMENT_PROVIDER: z.string().optional(),
  SUMOPOD_BASE_URL: z.string().optional(),
  SUMOPOD_API_KEY: z.string().optional(),
  SUMOPOD_WEBHOOK_SECRET: z.string().optional(),
  SUMOPOD_WEBHOOK_TOKEN: z.string().optional(),
  DOKU_CLIENT_ID: z.string().optional(),
  DOKU_SECRET_KEY: z.string().optional(),
  DOKU_BASE_URL: z.url().default("https://api-sandbox.doku.com"),
  DOKU_CALLBACK_URL: z.url().optional(),
  JAMENDO_CLIENT_ID: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

const validatedConfiguration = schema.superRefine((value, ctx) => {
  if (
    value.REDIS_TRANSPORT === "rest" &&
    (!value.REDIS_REST_URL || !value.REDIS_REST_TOKEN)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["REDIS_REST_URL"],
      message:
        "Primary Redis REST requires REDIS_REST_URL and REDIS_REST_TOKEN",
    });
  }
  if (Boolean(value.REDIS_REST_URL) !== Boolean(value.REDIS_REST_TOKEN)) {
    ctx.addIssue({
      code: "custom",
      path: ["REDIS_REST_URL"],
      message:
        "Redis REST requires REDIS_REST_URL and REDIS_REST_TOKEN together",
    });
  }
  if (
    value.REDIS_TRANSPORT === "tcp" &&
    (value.REDIS_REST_URL || value.REDIS_REST_TOKEN)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["REDIS_TRANSPORT"],
      message: "TCP fallback cannot be combined with Redis REST credentials",
    });
  }
  if (value.REDIS_TRANSPORT === "tcp" && !value.REDIS_URL) {
    ctx.addIssue({
      code: "custom",
      path: ["REDIS_URL"],
      message: "Explicit TCP fallback requires REDIS_URL",
    });
  }
  const endpoint = URL.canParse(value.AWS_ENDPOINT_URL_S3)
    ? new URL(value.AWS_ENDPOINT_URL_S3)
    : undefined;
  if (endpoint?.hostname.endsWith(".r2.cloudflarestorage.com")) {
    if (
      endpoint.protocol !== "https:" ||
      endpoint.pathname !== "/" ||
      endpoint.port ||
      endpoint.username ||
      endpoint.password ||
      endpoint.search ||
      endpoint.hash
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["AWS_ENDPOINT_URL_S3"],
        message:
          "R2 requires a root HTTPS S3 endpoint without credentials, port, query, or fragment",
      });
    }
    if (value.AWS_REGION !== "auto") {
      ctx.addIssue({
        code: "custom",
        path: ["AWS_REGION"],
        message: "R2 requires AWS_REGION=auto",
      });
    }
    const publicOrigin = URL.canParse(value.S3_PUBLIC_URL)
      ? new URL(value.S3_PUBLIC_URL)
      : undefined;
    if (
      !publicOrigin ||
      publicOrigin.protocol !== "https:" ||
      publicOrigin.hostname === "r2.dev" ||
      publicOrigin.hostname.endsWith(".r2.dev") ||
      publicOrigin.pathname !== "/" ||
      publicOrigin.port ||
      publicOrigin.username ||
      publicOrigin.password ||
      publicOrigin.search ||
      publicOrigin.hash
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["S3_PUBLIC_URL"],
        message: "R2 media requires an HTTPS custom-domain origin",
      });
    }
  }
  if (value.R2_PUBLIC_URL && URL.canParse(value.R2_PUBLIC_URL)) {
    const hostname = new URL(value.R2_PUBLIC_URL).hostname.toLowerCase();
    if (hostname === "r2.dev" || hostname.endsWith(".r2.dev")) {
      ctx.addIssue({
        code: "custom",
        path: ["R2_PUBLIC_URL"],
        message: "R2_PUBLIC_URL must use an R2 custom domain, not r2.dev",
      });
    }
  }
});

type ValidatedEnv = z.infer<typeof validatedConfiguration>;
let parsedEnv: ValidatedEnv | undefined;

export function getValidatedEnv(): ValidatedEnv {
  if (parsedEnv) return parsedEnv;
  const parsed = validatedConfiguration.safeParse(process.env);
  if (!parsed.success) {
    // Next may probe dynamic routes during prerender without runtime config.
    // The build still throws, but only real runtime failures need log detail.
    if (process.env.NGATURI_IMAGE_BUILD !== "1") {
      console.error(
        "❌ Invalid environment variables:",
        JSON.stringify(z.treeifyError(parsed.error), null, 2),
      );
    }
    throw new Error("Invalid environment variables");
  }
  parsedEnv = parsed.data;
  return parsedEnv;
}

// Next collects route modules during build. Validate only when request-time
// code needs configuration so OCI builds never require provider credentials.
export const env = new Proxy({} as ValidatedEnv, {
  get(_target, property) {
    return Reflect.get(getValidatedEnv(), property);
  },
  set(_target, property, value) {
    return Reflect.set(getValidatedEnv(), property, value);
  },
});
