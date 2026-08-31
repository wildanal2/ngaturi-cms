/**
 * Minimal fake env so modules that import `@/lib/env` can load under Vitest.
 * These values are never used to talk to a real service in unit tests.
 */
const FAKE: Record<string, string> = {
  NODE_ENV: "test",
  NEXT_PUBLIC_APP_URL: "http://localhost:3030",
  NEXT_PUBLIC_INVITATION_DOMAINS: "localhost:3030",
  DATABASE_URL: "postgres://user:pass@localhost:5432/test",
  REDIS_URL: "redis://localhost:6379",
  AWS_ACCESS_KEY_ID: "test",
  AWS_SECRET_ACCESS_KEY: "test",
  AWS_ENDPOINT_URL_S3: "https://s3.example.com",
  S3_BUCKET: "test",
  S3_PUBLIC_URL: "https://cdn.example.com",
  BETTER_AUTH_SECRET: "test-secret",
  BETTER_AUTH_URL: "http://localhost:3030",
  GOOGLE_CLIENT_ID: "test",
  GOOGLE_CLIENT_SECRET: "test",
  CRON_SECRET: "test",
};

for (const [k, v] of Object.entries(FAKE)) {
  process.env[k] ??= v;
}
