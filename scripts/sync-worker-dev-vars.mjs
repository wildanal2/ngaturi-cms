import { open, readFile, rename, rm } from "node:fs/promises";
import { parse } from "dotenv";

// Wrangler would otherwise load every value from .env.local, including the
// direct database URL and operator credentials. Keep Worker inputs explicit.
const WORKER_KEYS = [
  "NODE_ENV",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_INVITATION_DOMAINS",
  "REDIS_REST_URL",
  "REDIS_REST_TOKEN",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_ENDPOINT_URL_S3",
  "AWS_REGION",
  "S3_BUCKET",
  "S3_PUBLIC_URL",
  "R2_PUBLIC_URL",
  "LEGACY_MEDIA_PUBLIC_URLS",
  "MAX_UPLOAD_MB",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "CRON_SECRET",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "TURNSTILE_SECRET_KEY",
  "DOKU_CLIENT_ID",
  "DOKU_SECRET_KEY",
  "DOKU_BASE_URL",
  "DOKU_CALLBACK_URL",
  "JAMENDO_CLIENT_ID",
];

const source = parse(await readFile(".env.local"));
if (source.NODE_ENV !== "development") {
  throw new Error(".env.local must identify a development runtime");
}
if (new URL(source.DOKU_BASE_URL).hostname !== "api-sandbox.doku.com") {
  throw new Error(".env.local must use the DOKU Sandbox API");
}

const required = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_INVITATION_DOMAINS",
  "REDIS_REST_URL",
  "REDIS_REST_TOKEN",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
];
const missing = required.filter((key) => !source[key]);
if (missing.length) {
  throw new Error(`Missing Worker DEV inputs: ${missing.join(", ")}`);
}

const body = [
  "# Generated from .env.local by npm run worker:dev-vars. Do not edit.",
  ...WORKER_KEYS.filter((key) => source[key]).map(
    (key) => `${key}=${JSON.stringify(source[key])}`,
  ),
  "",
].join("\n");

const temporaryPath = ".dev.vars.tmp";
const handle = await open(temporaryPath, "wx", 0o600);
try {
  await handle.writeFile(body);
  await handle.sync();
  await handle.close();
  await rename(temporaryPath, ".dev.vars");
} catch (error) {
  await handle.close().catch(() => {});
  await rm(temporaryPath, { force: true });
  throw error;
}

console.log("Synced allowlisted Worker DEV variables to ignored .dev.vars");
