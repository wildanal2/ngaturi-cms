import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

// A fresh local container with a disposable tmpfs database. Never reads .env.local.
const name = `ngaturi-payment-test-${randomUUID().slice(0, 12)}`;
const docker = (args) =>
  execFileSync("docker", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
let started = false;
try {
  docker(["image", "inspect", "postgres:16-alpine"]); // No implicit pulls or existing database reuse.
  docker([
    "run",
    "--rm",
    "-d",
    "--name",
    name,
    "--label",
    "ngaturi.payment-test=true",
    "-e",
    "POSTGRES_HOST_AUTH_METHOD=trust",
    "-e",
    "POSTGRES_DB=ngaturi_payment_test",
    "-p",
    "127.0.0.1::5432",
    "--tmpfs",
    "/var/lib/postgresql/data:rw",
    "postgres:16-alpine",
  ]);
  started = true;
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      docker([
        "exec",
        name,
        "pg_isready",
        "-U",
        "postgres",
        "-d",
        "ngaturi_payment_test",
      ]);
      ready = true;
      break;
    } catch {
      /* booting */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!ready) throw new Error("Isolated PostgreSQL did not become ready");
  const binding = docker(["port", name, "5432/tcp"]);
  const match = /^127\.0\.0\.1:(\d+)$/.exec(binding);
  if (!match) throw new Error("Unexpected test database binding");
  const child = spawn(
    process.execPath,
    [
      "node_modules/vitest/vitest.mjs",
      "run",
      "src/lib/payments/postgres.integration.test.ts",
    ],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        PAYMENTS_TEST_ISOLATED: "1",
        PAYMENTS_TEST_DATABASE_URL: `postgres://postgres@127.0.0.1:${match[1]}/ngaturi_payment_test`,
      },
    },
  );
  process.exitCode = await new Promise((resolve) =>
    child.once("exit", (code) => resolve(code ?? 1)),
  );
} catch {
  console.error(
    "Isolated PostgreSQL validation failed; no production database was used.",
  );
  process.exitCode = 1;
} finally {
  if (started) docker(["rm", "-f", name]);
}
