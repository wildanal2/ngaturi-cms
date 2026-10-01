# Phase 2 — Neon and Hyperdrive

This phase prepares the database path for Cloudflare staging. It does not
provision resources, copy production data, deploy a Worker, or switch the
production database. Phase 0 backup and rollback rules remain mandatory.

## Schema and migration ownership

- `src/lib/db/schema.ts` is the application schema source of truth.
- `drizzle.config.ts`, the committed SQL files in `src/lib/db/migrations`, and
  `src/lib/db/migrations/meta/_journal.json` own migration history.
- The current journal contains migrations `0000` through `0007` and passes
  `npm run db:check`.
- `npm run db:migrate` may be run by exactly one controlled operator or CI job.
  It must never run at application startup or as an automatic Worker deploy
  step.
- `db:push` is for disposable local development only. It must not be used for
  staging, production, or a data-bearing migration because it bypasses the
  reviewed SQL migration history.
- Use expand → deploy → contract changes. Do not apply a contract migration
  until the Node rollback version no longer needs the old shape and the
  rollback window has closed.

Phase 2 requires no schema change.

## Connection contract

| Consumer                  | Connection source                                   | Pool/lifecycle                                       | Purpose                                |
| ------------------------- | --------------------------------------------------- | ---------------------------------------------------- | -------------------------------------- |
| Node development/rollback | `DATABASE_URL`                                      | Process-local Postgres.js pool; `DATABASE_POOL_SIZE` | Existing runtime remains available     |
| Controlled migration job  | `DATABASE_URL` set only in the operator environment | One process                                          | Drizzle migrations and verification    |
| Worker                    | `HYPERDRIVE.connectionString`                       | One Postgres.js client per invocation; `max: 5`      | Application traffic through Hyperdrive |

For staging and production planning, create Neon in AWS Asia Pacific
(Singapore). Hyperdrive must use the Neon **direct/unpooled** endpoint, not a
hostname containing `-pooler`; Hyperdrive supplies the connection pooling.
Keep TLS requirements from the Neon-provided direct connection string.

The Neon origin credential is supplied only while creating or updating the
Hyperdrive configuration. It is not a Worker variable and must not be committed.
The Worker receives only the `HYPERDRIVE` binding. Node keeps its independent
`DATABASE_URL`, which can continue pointing at the existing database during the
staging acceptance and rollback window.

Create the Hyperdrive configuration with query caching disabled. This is a
correctness requirement for authentication, payments, permissions, locks, and
read-after-write behavior; enabling caching is outside Phase 2. Verify the
resulting configuration reports caching as disabled before binding it.

## Backup and restore gate

Before importing or migrating real data, record and verify all of the following:

1. A current source-database backup or provider snapshot and its retention.
2. Credentials and documented steps that can restore into an isolated database.
3. A completed restore rehearsal with critical table counts and migration
   journal checked against the source.
4. The migration start marker, responsible operator, deployed revision, and
   rollback decision deadline.
5. The existing Node artifact and its database connection remain available.

If any item is missing, do not migrate data or change application traffic.
Worker rollback does not reverse database writes or schema changes.

## Staging procedure

1. Provision a staging Neon project in Singapore, isolated from production.
2. Obtain its direct connection string with pooling disabled. Confirm the host
   does not contain `-pooler`; keep the value only in the controlled operator
   environment.
3. Complete the backup/restore gate before copying any existing data.
4. Create a staging Hyperdrive configuration against that direct URL with
   `--caching-disabled`. Verify its reported caching state is disabled.
5. Add the resulting non-secret configuration ID as the staging `HYPERDRIVE`
   binding in a dedicated staging Wrangler configuration. Do not put it in the
   build-only `wrangler.jsonc` and do not reuse it for production.
6. In one controlled migration process, set `DATABASE_URL` to the staging Neon
   direct URL, run `npm run db:check`, then run `npm run db:migrate` once.
   Never run `db:push`.
7. Inspect the Drizzle migration table and confirm every committed migration is
   present once and in order. Compare critical table counts if data was copied.
8. With real staging bindings, validate commit and forced rollback, competing
   `SELECT ... FOR UPDATE` operations, concurrent checkout creation, duplicate
   webhook/callback fulfillment, and invitation save/update rollback.
9. Keep the existing database and Node runtime readable and deployable until
   Worker staging acceptance is complete.

Resource provisioning, data copy, the migration command against Neon, and the
real transaction checks are manual staging gates; none are performed by this
phase.

## Transaction invariants

The current application already keeps the required statements on one Drizzle
transaction client:

- Checkout creation locks the invitation before checking/replacing a pending
  payment and inserting a new attempt.
- DOKU fulfillment locks the payment row before state transition and applies
  payment, invitation, quota, subscription, or renewal writes on the same `tx`.
- Duplicate trusted results observe the terminal payment state and do not grant
  entitlement again.
- Invitation create/template/save operations retain their existing ownership,
  validation, row-lock, and rollback boundaries.

Hyperdrive uses transaction-mode pooling, so a transaction remains pinned for
its duration. Local tests validate application orchestration; only a real
Hyperdrive-to-Neon staging test can prove networked locking and rollback.
