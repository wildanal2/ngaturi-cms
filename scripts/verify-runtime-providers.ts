/** Opt-in DEV probes. Never run automatically during builds or deployment. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import tls from "node:tls";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { readFile } from "node:fs/promises";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { Redis } from "@upstash/redis";
import { AwsClient } from "aws4fetch";
import { env } from "../src/lib/env";

const provider = process.argv[2];
assert(
  process.argv.includes("--confirm-dev"),
  "Confirm DEV resource identity before using --confirm-dev",
);
assert.equal(
  env.BETTER_AUTH_URL,
  "https://dev.ngaturi.com",
  "DEV app configuration required",
);
assert.equal(env.NODE_ENV, "development", "DEV environment required");
const runId = randomUUID().replaceAll("-", "");
const pass = (check: string) =>
  console.log(JSON.stringify({ provider, check, result: "PASS" }));

async function verifyDb() {
  assert(env.DATABASE_URL, "DATABASE_URL required");
  const target = new URL(env.DATABASE_URL);
  assert(
    target.hostname.endsWith(".neon.tech") &&
      !target.hostname.includes("-pooler."),
    "Direct Neon endpoint required",
  );
  const { getDb } = await import("../src/lib/db");
  const connect = tls.connect;
  let verifiedSockets = 0;
  // Observe the actual adapter's socket without replacing TLS verification.
  tls.connect = ((...args: Parameters<typeof tls.connect>) => {
    const socket = Reflect.apply(connect, tls, args) as tls.TLSSocket;
    socket.once("secureConnect", () => {
      const options = args[0] as tls.ConnectionOptions;
      if (
        socket.authorized &&
        options.rejectUnauthorized === true &&
        options.servername === target.hostname
      )
        verifiedSockets++;
    });
    return socket;
  }) as typeof tls.connect;
  const db = getDb();
  const client = globalThis.__pgClient!;
  const tableName = `ngaturi_phase1_${runId}`;
  const table = sql.identifier(tableName);
  let created = false;
  try {
    assert.equal(client.options.max, 5);
    assert.deepEqual(client.options.ssl, { rejectUnauthorized: true });
    assert.equal(client.options.connect_timeout, 10);
    assert.equal(client.options.idle_timeout, 20);
    assert.equal(client.options.max_lifetime, 300);
    const [clock] = await db.execute(
      sql`select current_setting('TimeZone') as zone, extract(timezone from now())::int as offset_seconds, localtimestamp = (now() at time zone 'UTC') as utc_clock`,
    );
    // Neon terminates TLS at its proxy, so pg_stat_ssl does not describe the
    // client socket. GMT is an equivalent server label for the UTC clock.
    assert(["UTC", "GMT", "Etc/UTC"].includes(String(clock.zone)));
    assert.equal(clock.offset_seconds, 0);
    assert.equal(clock.utc_clock, true);
    assert(verifiedSockets > 0);
    pass("direct_connection_verified_tls_utc_pool_options");

    for (const [name, sslOptions] of [
      [
        "hostname_mismatch_rejected",
        {
          rejectUnauthorized: true,
          checkServerIdentity: (_host: string, cert: tls.PeerCertificate) =>
            tls.checkServerIdentity("phase1.invalid", cert),
        },
      ],
      [
        "untrusted_chain_rejected",
        { rejectUnauthorized: true, ca: [] as string[] },
      ],
    ] as const) {
      const probe = postgres(env.DATABASE_URL, {
        max: 1,
        connect_timeout: 10,
        ssl: sslOptions,
      });
      try {
        await assert.rejects(probe`select 1`, (error: unknown) => {
          const code = (error as { code?: string }).code;
          return name === "hostname_mismatch_rejected"
            ? code === "ERR_TLS_CERT_ALTNAME_INVALID"
            : [
                "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
                "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
                "SELF_SIGNED_CERT_IN_CHAIN",
              ].includes(code ?? "");
        });
        pass(name);
      } finally {
        await probe.end({ timeout: 2 });
      }
    }

    await db.execute(
      sql`create table ${table} (id integer primary key, value integer not null)`,
    );
    created = true;
    await db.execute(sql`insert into ${table} values (1, 10)`);
    assert.equal(
      (await db.execute(sql`select value from ${table} where id = 1`))[0].value,
      10,
    );
    const rollback = new Error("fixture rollback");
    await assert.rejects(
      db.transaction(async (tx) => {
        await tx.execute(sql`update ${table} set value = 20 where id = 1`);
        throw rollback;
      }),
      (error: unknown) => error === rollback,
    );
    assert.equal(
      (await db.execute(sql`select value from ${table} where id = 1`))[0].value,
      10,
    );
    pass("write_read_rollback");

    let release!: () => void;
    let locked!: () => void;
    const releaseLock = new Promise<void>((resolve) => {
      release = resolve;
    });
    const acquired = new Promise<void>((resolve) => {
      locked = resolve;
    });
    const owner = db.transaction(async (tx) => {
      await tx.execute(sql`select * from ${table} where id = 1 for update`);
      locked();
      await releaseLock;
    });
    try {
      await Promise.race([acquired, owner]);
      await assert.rejects(
        db.transaction(async (tx) => {
          await tx.execute(sql`set local lock_timeout = '300ms'`);
          await tx.execute(sql`select * from ${table} where id = 1 for update`);
        }),
        (error: unknown) => {
          const e = error as { code?: string; cause?: { code?: string } };
          return (e.code ?? e.cause?.code) === "55P03";
        },
      );
    } finally {
      release();
      await owner;
    }
    await db.transaction(async (tx) => {
      await tx.execute(sql`select * from ${table} where id = 1 for update`);
    });
    pass("for_update_contention_and_release");

    const rows = await Promise.all(
      Array.from({ length: 10 }, () =>
        db.execute(sql`select pg_backend_pid() as pid, pg_sleep(0.15)`),
      ),
    );
    const pids = new Set(rows.map((row) => row[0].pid));
    assert(pids.size > 1 && pids.size <= 5);
    pass("concurrent_pool_bound");
  } finally {
    try {
      if (created) {
        await db.execute(sql`drop table ${table}`);
        const [row] = await db.execute(
          sql`select to_regclass(${tableName}) is null as removed`,
        );
        assert.equal(row.removed, true);
        pass("fixture_cleanup");
      }
    } finally {
      await client.end({ timeout: 5 });
      tls.connect = connect;
    }
  }
}

async function verifyRedis() {
  assert.equal(env.REDIS_TRANSPORT, "rest");
  const { redis } = await import("../src/lib/redis");
  const { rateLimit } = await import("../src/lib/rate-limit");
  const raw = new Redis({
    url: env.REDIS_REST_URL!,
    token: env.REDIS_REST_TOKEN!,
  });
  const keys = new Set<string>();
  const key = (name: string) => {
    const result = `phase1:${runId}:${name}`;
    keys.add(result);
    return result;
  };
  try {
    const plain = key("plain");
    await redis.set(plain, "value", 60);
    assert.equal(await redis.get(plain), "value");
    const state = key("state");
    await redis.set(state, "state-value", 60);
    const results = await Promise.all([
      redis.getAndDelete(state),
      redis.getAndDelete(state),
    ]);
    assert.equal(
      results.filter((result) => result === "state-value").length,
      1,
    );
    assert.equal(results.filter((result) => result === null).length, 1);
    pass("set_get_atomic_getdel");
    const counter = key("counter");
    const counts = await Promise.all(
      Array.from({ length: 12 }, () => redis.incrementWithTtl(counter, 30)),
    );
    assert.deepEqual(
      counts.sort((a, b) => a - b),
      Array.from({ length: 12 }, (_, i) => i + 1),
    );
    const ttl = await raw.ttl(counter);
    assert(ttl > 0 && ttl <= 30);
    await redis.incrementWithTtl(counter, 300);
    assert((await raw.ttl(counter)) <= ttl);
    pass("atomic_increment_fixed_ttl");
    const expires = key("expires");
    await redis.set(expires, "short", 1);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    assert.equal(await redis.get(expires), null);
    pass("expiration");
    for (const prefix of ["rsvp", "gb"]) {
      const name = `${prefix}:phase1:${runId}`;
      keys.add(`rl:${name}`);
      const decisions = await Promise.all(
        Array.from({ length: 6 }, () => rateLimit(name, 5, 60)),
      );
      assert.equal(decisions.filter(Boolean).length, 5);
      assert((await raw.ttl(`rl:${name}`)) > 0);
      pass(`${prefix}_limiter`);
    }
    const { auth } = await import("../src/lib/auth/config");
    const context = await auth.$context;
    const storage = context.options.secondaryStorage!;
    const session = key("session");
    await storage.set(session, JSON.stringify({ user: { id: "phase1" } }), 60);
    const retrieved = await storage.get(session);
    assert.deepEqual(
      typeof retrieved === "string" ? JSON.parse(retrieved) : retrieved,
      { user: { id: "phase1" } },
    );
    const require = createRequire(import.meta.url);
    const rateLimiterPath = join(
      dirname(require.resolve("better-auth")),
      "api/rate-limiter/index.mjs",
    );
    const { onRequestRateLimit } = await import(
      pathToFileURL(rateLimiterPath).href
    );
    const testContext = {
      ...context,
      rateLimit: { ...context.rateLimit, enabled: true, window: 60, max: 2 },
      options: {
        ...context.options,
        secondaryStorage: {
          ...storage,
          increment: async (name: string, ttl: number) => {
            keys.add(name);
            return storage.increment!(name, ttl);
          },
        },
      },
    };
    const request = new Request(
      `https://dev.ngaturi.com/api/auth/phase1-${runId}`,
      { headers: { "cf-connecting-ip": "192.0.2.1" } },
    );
    assert.equal(await onRequestRateLimit(request, testContext), undefined);
    assert.equal(await onRequestRateLimit(request, testContext), undefined);
    assert.equal((await onRequestRateLimit(request, testContext)).status, 429);
    pass("better_auth_session_and_limiter");
  } finally {
    await Promise.all([...keys].map((name) => redis.delete(name)));
    assert.equal(await raw.exists(...keys), 0);
    pass("fixture_cleanup");
    await globalThis.__pgClient?.end({ timeout: 5 });
  }
}

async function verifyStorage() {
  assert(
    new URL(env.AWS_ENDPOINT_URL_S3).hostname.endsWith(
      ".r2.cloudflarestorage.com",
    ),
    "R2 S3 endpoint required",
  );
  assert.equal(env.S3_BUCKET, "ngaturi-media-dev");
  assert.equal(env.S3_PUBLIC_URL, "https://media-dev.ngaturi.com");
  const { putObject, publicUrl, isTrustedPublicUrl } =
    await import("../src/lib/storage");
  const aws = new AwsClient({
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    service: "s3",
    region: env.AWS_REGION,
  });
  const keys: string[] = [];
  const fixtureId = randomUUID();
  async function objectRequest(key: string, method: string) {
    const url = `${env.AWS_ENDPOINT_URL_S3.replace(/\/$/, "")}/${env.S3_BUCKET}/${key}`;
    return fetch(await aws.sign(new Request(url, { method })), {
      signal: AbortSignal.timeout(15_000),
    });
  }
  try {
    const image = await readFile(
      new URL("../public/favicon-32x32.png", import.meta.url),
    );
    // Tiny valid PCM WAV. This is a storage probe, not an upload processor.
    const audio = Buffer.alloc(46);
    audio.write("RIFF", 0);
    audio.writeUInt32LE(38, 4);
    audio.write("WAVEfmt ", 8);
    audio.writeUInt32LE(16, 16);
    audio.writeUInt16LE(1, 20);
    audio.writeUInt16LE(1, 22);
    audio.writeUInt32LE(8000, 24);
    audio.writeUInt32LE(16000, 28);
    audio.writeUInt16LE(2, 32);
    audio.writeUInt16LE(16, 34);
    audio.write("data", 36);
    audio.writeUInt32LE(2, 40);
    for (const fixture of [
      {
        suffix: `${randomUUID()}.png`,
        bytes: image,
        type: "image/png",
        name: "image_bytes",
      },
      {
        suffix: `audio/${randomUUID()}.wav`,
        bytes: audio,
        type: "audio/wav",
        name: "audio",
      },
    ]) {
      const key = `invitations/${fixtureId}/${fixture.suffix}`;
      keys.push(key);
      await putObject({
        key,
        body: fixture.bytes,
        contentType: fixture.type,
        cacheControl: "no-store",
      });
      assert(isTrustedPublicUrl(publicUrl(key)));
      const response = await fetch(publicUrl(key), {
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), fixture.type);
      assert.deepEqual(
        Buffer.from(await response.arrayBuffer()),
        fixture.bytes,
      );
      pass(`${fixture.name}_signed_write_public_read`);
    }
    assert(
      env.LEGACY_MEDIA_PUBLIC_URLS.length > 0,
      "Preserved legacy media origins required",
    );
    for (const prefix of env.LEGACY_MEDIA_PUBLIC_URLS)
      assert(isTrustedPublicUrl(`${prefix}/phase1-probe.webp`));
    pass("legacy_url_trust");
  } finally {
    for (const key of keys) {
      const response = await objectRequest(key, "DELETE");
      assert(response.ok, "Fixture deletion failed");
      assert.equal((await objectRequest(key, "HEAD")).status, 404);
      const publicResponse = await fetch(publicUrl(key), {
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      assert.equal(publicResponse.status, 404);
    }
    pass("fixture_cleanup");
  }
}

try {
  if (provider === "db") await verifyDb();
  else if (provider === "redis") await verifyRedis();
  else if (provider === "storage") await verifyStorage();
  else throw new Error("Choose db, redis, or storage");
} catch (error) {
  // Raw provider errors may contain query inputs or credentials. Emit code only.
  console.error(
    JSON.stringify({
      provider,
      result: "FAIL",
      code: (error as { code?: string }).code ?? "PROBE_FAILED",
      location: (error as Error).stack?.match(
        /verify-runtime-providers\.ts:\d+:\d+/,
      )?.[0],
    }),
  );
  process.exitCode = 1;
}
