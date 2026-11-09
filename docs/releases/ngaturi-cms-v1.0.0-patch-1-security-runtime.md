# Ngaturi CMS v1.0.0 Patch 1 — Security & Runtime Compatibility

Status: implemented and locally/QAS-read-only validated on `fix/ngaturi-pre-upgrade-baseline` at `c69bd6d3a8862bb7c0c72fd63482e1862183c282`. No commit, push, QAS migration, production migration, or deployment was performed. The application package version remains unchanged at `0.1.0`.

## Scope delivered

- Upgraded the Node/Next security set and regenerated the npm lockfile with `npm ci --strict-peer-deps`.
- Aligned Next.js and `eslint-config-next` exactly at `16.4.5`.
- Added migration `0009_better_auth_issuer_compatibility`, which preserves the legacy `accounts.issuer` values and makes the column nullable for Better Auth 1.7.3+.
- Removed `issuer` from the Drizzle account model, matching Better Auth's restored 1.x account shape. The physical legacy column remains in place for historical data.
- Added a disposable PostgreSQL integration assertion that a post-migration OAuth account can be inserted without `issuer`.
- Left Vinext, Cloudflare Worker packages, Redis REST configuration, payment code, webhooks, scheduler, Dockerfile, Compose, and deployment configuration unchanged.

## Dependency and security matrix

| Package or compatibility edge | Before | Locked after | Reason |
| --- | ---: | ---: | --- |
| `next` / `eslint-config-next` | 16.3.3 | 16.4.5 / 16.4.5 | Aligned Next security release. |
| `react`, `react-dom`, `react-server-dom-webpack` | 19.2.8 | 19.3.1 | Compatible RSC set. |
| `@react-three/fiber` | 9.7.0 | 9.8.2 | Required for React 19.3 peer compatibility (`>=19 <19.4`). |
| `better-auth` | 1.7.2 | 1.7.18 | Includes the 1.7 issuer compatibility correction and security fixes. |
| `sharp` | 0.35.4 | 0.35.5 | Addresses the direct Sharp advisory. |
| `zod` | 4.5.2 | 4.6.7 | Addresses the direct Zod advisory. |
| `vite` | 8.3.0 | 8.3.6 | Addresses direct Vite advisories. |
| `vitest` / Node typings | 4.1.11 / Node 20 types | 5.1.0 / Node 24 types | Compatible strict-peer test toolchain. |
| `drizzle-orm` | 0.45.2 | 0.45.2 | Verified actual lock; satisfies Better Auth 1.7.18's `^0.45.2` peer range. |
| `vinext`, `@vinext/cloudflare`, `@cloudflare/vite-plugin`, `wrangler` | beta.11 / beta.9 / 1.57.2 / 4.136.2 | unchanged | Explicitly deferred to Patch 2. |

`npm audit --json` changed from 30 findings (2 critical, 9 high, 18 moderate, 1 low) to 22 (0 critical, 6 high, 16 moderate). `npm audit --omit=dev --json` reports 8 moderate findings and no high or critical findings.

Remaining findings are intentionally not force-fixed in this patch:

- Vinext's `@vercel/og`/`satori` chain and the retained Drizzle Kit chain account for the production-only moderates.
- Five of the full audit's high findings are in the deferred `@cloudflare/vite-plugin`/Wrangler/Miniflare chain, including Miniflare's nested `sharp@0.35.4` and `undici` path. The sixth is development-only `brace-expansion`, reached through ESLint 9's `minimatch@3` chain. The application and Next.js use locked `sharp@0.35.5`.
- npm currently proposes an incompatible downgrade of `eslint-config-next` to 15.5.29 for some TypeScript-ESLint findings. That would violate the required Next/eslint-config-next alignment.

## Better Auth `accounts.issuer` compatibility

The Better Auth 1.7.0–1.7.2 schema required `issuer`; Better Auth 1.7.3+ no longer writes it. A non-null legacy column would reject a newly linked OAuth account. This patch does not delete account rows, modify account identifiers, or rebuild account indexes:

```sql
ALTER TABLE "accounts" ALTER COLUMN "issuer" DROP NOT NULL;
```

QAS was inspected read-only before this migration was written. At inspection time, `public.accounts` had two rows, `issuer` was non-null and nonblank for both, its only index was `accounts_pkey`, and there were no duplicate `(provider_id, account_id)` or `(provider_id, account_id, issuer)` groups. Therefore no index drop, data backfill, deduplication, or historical migration rewrite is necessary for this QAS source.

The migration is additive/relaxing: retained issuer values remain available, and new Better Auth records may omit the field. The Drizzle model deliberately omits the legacy column, so the current library does not try to write it.

## Validation evidence

| Check | Result |
| --- | --- |
| `npm ci --strict-peer-deps` | PASS; clean strict install completed. |
| `npm run typecheck` | PASS. |
| `npm run lint` | PASS with 0 errors and 1 pre-existing unused-variable warning in `src/sections/navigation/nav-shared.test.ts`. |
| `npm test -- --reporter=dot` | PASS: 97 files passed, 1 skipped; 951 tests passed, 33 skipped. |
| `node scripts/test-payments-postgres.mjs` | PASS: 33 disposable PostgreSQL tests; includes migration nullability and issuer-free account insertion. |
| `npm run db:check` | PASS. |
| `docker build --tag ngaturi-cms-patch1-qas:local .` | PASS; local standalone image manifest `sha256:a46103c2ce3024c7ce8c8c59974fbd0e67b922a42a529b6da2e29c6c462a28e7`. |
| Isolated runtime smoke | PASS: image ran with `--network none`; in-container `GET /api/health` returned `200 {"status":"ok"}`; container removed. |
| `npm audit --omit=dev --json` | PASS execution; 8 residual moderate findings, 0 high/critical. |
| `npm audit --json` | PASS execution; 22 residual findings documented above. |

Not run: Vinext build/check, Cloudflare Worker build/deploy, authenticated Google OAuth flow, real Redis/QAS readiness, provider payment checkout/webhook calls, and production deployment. These are intentionally outside Patch 1 or require external credentials and acceptance.

## QAS validation and migration runbook

Run only in the QAS operator environment, after setting its direct, TLS-verified `DATABASE_URL`. Do not use `db:push`, Better Auth CLI generation, or application startup to alter the schema.

```bash
npm ci --strict-peer-deps
npm run db:check

# Read-only account preflight: it must return zero rows.
node --env-file=.env.qas --input-type=module -e '
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { max: 1, ssl: { rejectUnauthorized: true } });
try {
  console.table(await sql`select provider_id, account_id, count(*)::int as rows from accounts group by provider_id, account_id having count(*) > 1`);
  console.table(await sql`select indexname, indexdef from pg_indexes where schemaname = current_schema() and tablename = '\''accounts'\'' order by indexname`);
} finally { await sql.end({ timeout: 2 }); }
'
```

After an approved QAS backup/snapshot and an authentication write pause, build an operator bundle from the reviewed, committed release revision and apply it once using the established controlled operator path. Confirm the journal contains `0009_better_auth_issuer_compatibility`, then run the issuer-free account creation test and Google returning-user/fresh-login smoke before resuming writes.

## Production rollout and rollback plan

1. Merge/review the exact patch first; build and record an immutable image digest. Do not replace release-image provenance with a mutable tag.
2. In a maintenance window, verify a usable database backup/restore path, pause authentication/account-link writes, and repeat the QAS duplicate/index preflight against production.
3. Build the migration bundle from the committed release SHA and apply `0009` once through the controlled migration operator. Verify the Drizzle journal and `information_schema.columns.is_nullable = 'YES'` for `accounts.issuer`.
4. Deploy the immutable image using the existing release procedure; do not run migrations in the application container. Gate with `/api/health`, bounded `/api/ready`, existing-session checks, returning Google login, fresh Google login, and payment/webhook regression smoke.
5. Resume writes only after the checks pass. Keep the prior immutable application image available.

Application rollback is safe only while no new account row has a null `issuer`: old code continues to write a value into a now-nullable column. Once Better Auth 1.7.3+ has created issuer-free accounts, package-only rollback to the older issuer-writing behavior is unsafe. Do not re-add `NOT NULL` until an explicit account audit proves zero null issuers and a separately reviewed recovery plan is approved. The database migration is deliberately retained during ordinary application rollback.
