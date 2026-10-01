# Phase 0 — Production safety prerequisites

This document is the configuration and rollback contract for the Cloudflare
migration. It does not authorize provisioning, deployment, DNS changes, provider
console changes, or production cutover.

## Runtime contract

| Runtime                  | Database                | Redis                                | Object writes             | Image processing          | Configuration policy                                        |
| ------------------------ | ----------------------- | ------------------------------------ | ------------------------- | ------------------------- | ----------------------------------------------------------- |
| Local Node development   | `DATABASE_URL`          | `REDIS_URL`                          | S3-compatible credentials | Intentionally unavailable | `.env.local`, never committed                               |
| Local Worker development | `HYPERDRIVE`            | `REDIS_REST_URL`, `REDIS_REST_TOKEN` | `MEDIA_BUCKET`            | `IMAGES`                  | Local Wrangler overrides and local secrets, never committed |
| Staging Worker           | Staging `HYPERDRIVE`    | Staging REST Redis                   | Staging `MEDIA_BUCKET`    | `IMAGES`                  | Dedicated staging Worker/configuration and secrets          |
| Production Worker        | Production `HYPERDRIVE` | Production REST Redis                | Production `MEDIA_BUCKET` | `IMAGES`                  | Dedicated production Worker/configuration and secrets       |

`wrangler.jsonc` is build-only during Phase 0. It deliberately contains no
external resource identifiers. After resources are provisioned in a later
phase, staging and production must use separate configurations containing their
real, non-secret binding identifiers. Never add a fabricated Hyperdrive ID.

The Worker must not fall back to `DATABASE_URL`, TCP Redis, or signed S3 writes
when a required Worker binding is missing. Startup/request preflight requires:

- `ASSETS`
- `HYPERDRIVE`
- `IMAGES`
- `MEDIA_BUCKET`
- `R2_PUBLIC_URL`
- `REDIS_REST_URL`
- `REDIS_REST_TOKEN`

## Configuration ownership

Only names are documented here. Values belong in local untracked environment
files, Cloudflare variables, Cloudflare secrets, or provisioned bindings.

| Class                      | Names                                                                                                                                                                                                                                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cloudflare secrets         | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `BETTER_AUTH_SECRET`, `CRON_SECRET`, `DOKU_CLIENT_ID`, `DOKU_SECRET_KEY`, `GOOGLE_CLIENT_SECRET`, `JAMENDO_CLIENT_ID`, `REDIS_REST_TOKEN`, `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`                                                                                                     |
| Worker variables           | `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `BETTER_AUTH_URL`, `DOKU_BASE_URL`, `DOKU_CALLBACK_URL`, `EMAIL_FROM`, `GOOGLE_CLIENT_ID`, `MAX_UPLOAD_MB`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_INVITATION_DOMAINS`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NODE_ENV`, `R2_PUBLIC_URL`, `REDIS_REST_URL`, `S3_BUCKET`, `S3_PUBLIC_URL`, `SENTRY_DSN` |
| Cloudflare bindings        | `ASSETS`, `HYPERDRIVE`, `IMAGES`, `MEDIA_BUCKET`                                                                                                                                                                                                                                                                                      |
| Local/development only     | `ALLOWED_DEV_ORIGINS`, `DATABASE_POOL_SIZE`, `DATABASE_URL`, `GARAGE_RPC_SECRET`, `POSTGRES_DB`, `POSTGRES_PASSWORD`, `POSTGRES_USER`, `REDIS_URL`                                                                                                                                                                                    |
| Tooling/seed only          | `ADMIN_EMAILS`                                                                                                                                                                                                                                                                                                                        |
| Obsolete/legacy candidates | `DOKU_NOTIFICATION_URL`, `DOKU_PUBLIC_URL`                                                                                                                                                                                                                                                                                            |

`NEXT_PUBLIC_*` values are build-time public configuration, not secrets. A
staging build must not be promoted with production public configuration, or the
reverse. Optional integrations may remain unset only when the corresponding
feature is deliberately disabled and fails closed.

## Node rollback policy

The existing Node/PM2 runtime remains the rollback runtime until Worker staging
acceptance is complete. Its database, authentication, payment, scheduled HTTP
cron, rendering, audio upload, and S3-compatible storage paths remain supported.

Image upload and image re-crop are Worker-only during the migration because the
current implementation depends on `IMAGES`. Node returns an explicit `503`
capability error for those operations. This is an intentional temporary
limitation; Phase 0 does not add a second image-processing stack. Rollback
operators must account for this limitation and must not describe Node image
processing as available.

Rolling back Worker code or traffic does not roll back database rows, provider
transactions, OAuth configuration, Redis state, object writes, DNS, or any
other external state. Evaluate and reverse each external change separately.

## Database migration rules

- Exactly one controlled operator or CI job may apply schema migrations.
- Never run schema migrations automatically on application startup or every
  Worker deployment.
- Use backward-compatible expand → deploy → contract changes.
- Do not deploy a contract migration until the previous application version no
  longer depends on the old schema and the rollback window is closed.
- Test forward migration, application rollback against the expanded schema, and
  database restore before production cutover.
- Hyperdrive query caching remains disabled until a later, separately approved
  phase.

## Storage migration rules

- Legacy storage and existing public media URLs remain readable throughout the
  migration and rollback window.
- Do not rewrite stored media URLs in bulk.
- Do not delete legacy objects, buckets, credentials, or media metadata during
  Phase 0.
- Verify copied object counts and integrity before changing new writes or reads.
- Storage cleanup requires a separate retention and reference-safety decision.

## Backup gates

Before a database migration, verify a current provider backup or snapshot,
restore access, retention, the migration start marker, and a tested restore
procedure. Record the responsible operator and rollback deadline.

Before a media migration, inventory object counts and key namespaces, preserve
legacy credentials/read access, capture an integrity manifest where practical,
and verify that a sample can be restored and served from both old and new
storage.

Before production cutover, verify database and media backup gates again; record
the deployed revision and configuration versions; export or record provider
callback settings; confirm the Node rollback artifact and runbook; and confirm
monitoring, alert ownership, and the decision authority for rollback.

Phase 0 creates no custom backup infrastructure. It establishes the mandatory
checks that later migration phases must satisfy.
