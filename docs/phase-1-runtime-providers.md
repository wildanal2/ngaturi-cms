# Phase 1 — portable Node runtime providers

This phase changes provider selection, connection security and media-origin
configuration. Docker packaging, image processing, deployment, schedulers and
business rules are outside its scope. Earlier Worker migration documents remain
historical references; this document supersedes their Node TCP/legacy-write
recommendations for the primary Node runtime.

## Provider contract

| Area             | Node primary                                                        | Worker fallback                      |
| ---------------- | ------------------------------------------------------------------- | ------------------------------------ |
| PostgreSQL       | Direct Neon `DATABASE_URL`, process-wide Postgres.js/Drizzle pool   | Invocation-scoped Hyperdrive adapter |
| Redis            | Existing Upstash REST adapter                                       | Same REST adapter through Vite alias |
| Object writes    | Existing `aws4fetch` signed S3 HTTP pointed at R2                   | `MEDIA_BUCKET` binding               |
| Public media     | `S3_PUBLIC_URL` configured to the R2 custom domain                  | `R2_PUBLIC_URL`                      |
| Legacy media     | Explicit `LEGACY_MEDIA_PUBLIC_URLS` plus configured current origins | Same trust helper                    |
| Image processing | Still unavailable (503)                                             | Existing Images binding              |

### PostgreSQL

`DATABASE_POOL_SIZE` defaults to 5. Each process reuses one pool, with
`connect_timeout=10`, `idle_timeout=20`, and `max_lifetime=300` (seconds).
Node explicitly sets `ssl.rejectUnauthorized=true`; Node's default hostname
verification remains enabled. This overrides URL `sslmode=require`, which
otherwise disables certificate verification in the installed Postgres.js driver.
Plaintext local PostgreSQL is not the primary configuration.

Keep `connection.TimeZone=UTC`. Neon may report the equivalent `GMT` label;
validation must also prove zero offset and UTC wall-clock behavior. Because
Neon's proxy terminates client TLS, `pg_stat_ssl` alone cannot prove or disprove
the application's TLS connection. Validate the actual Node TLS socket.

Migration tooling continues to use the direct endpoint through `DATABASE_URL`.
Use `sslmode=verify-full` there. No application migrations are required by this
phase. Do not run migrations at startup or use `db:push` on data-bearing systems.

### Redis

`REDIS_TRANSPORT` defaults to `rest`, requiring both `REDIS_REST_URL` and
`REDIS_REST_TOKEN`. Missing/partial REST settings fail rather than selecting TCP.
A complete REST pair takes precedence over an unused `REDIS_URL`.

Legacy TCP requires `REDIS_TRANSPORT=tcp`, `REDIS_URL`, and removal of both REST
variables. Mixed TCP/REST selection is rejected. Worker builds remain REST-only;
do not forward the Node TCP selector to Worker variables.

GETDEL and increment-with-TTL continue using the existing atomic commands/Lua.
No session format, expiry or rate-limit policy changes are introduced.

### R2 and legacy media

Configure `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`,
`AWS_REGION`, `S3_BUCKET`, and `S3_PUBLIC_URL` using existing DEV R2 credentials.
The API endpoint is the account's root HTTPS S3 endpoint, the region is `auto`,
and the public origin is an HTTPS custom domain (not `r2.dev`). The DEV public
origin is `https://media-dev.ngaturi.com`. No AWS SDK is needed.

Before replacing `S3_PUBLIC_URL`, add its previous value to
`LEGACY_MEDIA_PUBLIC_URLS`. This optional comma-separated list preserves URL
prefix paths, trims/deduplicates entries, and rejects credentials, query strings,
fragments and non-HTTP(S) URLs. It adds read trust; it never selects a write target
or rewrites stored URLs. Keep Garage/legacy media publicly readable while used.

Object keys and upload routes remain unchanged. The old `legacyPublicUrl`
function name remains as a compatibility alias for the configured S3 public URL.
Worker server writes still use `MEDIA_BUCKET`; the Worker env-sync allowlist now
includes legacy media prefixes. Updating ignored local variables does not update
deployed Worker secrets or provision provider resources.

## Focused verification

Unit tests use fake credentials and mocks. Live checks are separate and opt-in:

```sh
npx tsx --env-file=.env.local scripts/verify-runtime-providers.ts db --confirm-dev
npx tsx --env-file=.env.local scripts/verify-runtime-providers.ts redis --confirm-dev
npx tsx --env-file=.env.local scripts/verify-runtime-providers.ts storage --confirm-dev
```

Before using `--confirm-dev`, independently confirm the configured Neon endpoint
belongs to the intended DEV branch, the Upstash database is DEV, and the R2 bucket
and custom domain are the intended DEV resources. The app's DEV URL alone is not
proof of provider identity. Never invoke these probes automatically in CI,
application startup or deployment.

- DB checks observe verified TLS, reject bad hostname/untrusted certificate chain,
  check UTC, create one uniquely named fixture table, test write/read, rollback,
  row-lock contention/release and bounded pooling, then drop only that table.
- Redis checks use uniquely named keys, atomic GETDEL and increment/TTL, expiration,
  real Better Auth secondary-storage limiting and RSVP/guestbook limiter helpers.
  Exact test keys are deleted and checked afterward.
- Storage checks upload existing image bytes without processing and a tiny valid
  WAV, compare public readback, verify legacy trust, and delete only test objects.
  Fixtures request `no-store`; deletion is checked through S3 and the public URL.
- Cleanup failure is a failed probe, not a PASS. Raw provider exceptions and
  secret values are never printed by the probe's failure handler.

The probe requires DEV configuration. It never invokes checkout, real OAuth,
application migrations, Worker deployment, DNS changes or image processing.

## Validation record

- Node DEV DB host matched the existing DEV Hyperdrive origin through read-only
  provider inspection. The user-designated project/branch is `ngaturi`/`staging`;
  Neon management API branch metadata was not independently available.
- Direct Node Neon: verified TLS and both negative TLS cases passed. UTC-equivalent
  `GMT` clock, write/read, rollback, row locks and pool bound passed; fixture removed.
- Configured DEV Upstash: REST operations, atomicity, expiration, Better Auth,
  RSVP and guestbook limiting passed; fixture keys removed.
- R2 bucket and public domain were confirmed through read-only Cloudflare API.
  Existing legacy S3 keys returned HTTP 400 against the DEV R2 bucket. Live signed
  R2 write/read validation awaits appropriate existing R2 S3 credentials.
- The previous Node media origin was preserved in ignored local configuration.
  URL trust checks passed; no matching existing `media_assets` row was found for
  a live legacy-object read, so legacy object availability is not verified.
- Focused unit/regression validation: 107 tests across 15 files passed. No full
  suite, production build, image processing or provider deployment was run.

Current result: **PARTIAL**. Ignored Node DEV configuration now uses verified
TLS, a pool of five and REST Redis. Its S3 write endpoint/public URL remain on
the previous configuration until existing DEV R2 S3 credentials are supplied
and validated; no misleading R2 write-success claim is made.

Do not mark all of Phase 1 PASS or Phase 2 ready until R2 configuration and live
write/read/cleanup checks have completed.
