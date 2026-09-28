# Cloudflare vinext migration

This branch is a staging-only migration. It must not be pointed at DOKU
Production or promoted to the production Worker until every external check in
this document passes.

## Implemented runtime

- vinext and Vite build the existing Next.js App Router application for
  Cloudflare Workers.
- The custom Worker entry wraps each `fetch` and `scheduled` invocation in an
  isolated runtime context.
- Postgres.js/Drizzle creates one client lazily per invocation from
  `HYPERDRIVE.connectionString`, with `max: 5`. Node scripts and `next dev`
  retain the existing `DATABASE_URL` pool.
- Payment create, webhook, callback, candidate loading, and scheduled
  reconciliation explicitly pass the invocation database. `applyDokuResult`
  still runs its row lock and every fulfillment write on its transaction `tx`.
- Better Auth and application rate limits use an HTTP-based Redis client.
  OAuth/verification state uses atomic `GETDEL`; fixed-window counters use one
  atomic Lua increment-and-expire operation.
- Server-side objects use the `MEDIA_BUCKET` R2 binding. Browser presigned PUTs
  use `aws4fetch` and bind `Content-Type` into the signature.
- Image uploads use the `IMAGES` binding for crop, scale-down, and WebP output.
  Audio uploads bypass image processing and write directly to R2.
- The `*/5 * * * *` scheduled entrypoint invokes the existing DOKU
  reconciliation helper with its original 2-minute/24-hour window, batch size
  50, concurrency 5, and oldest-first selection.

Application/data caches are intentionally not configured. Create Hyperdrive
with query caching disabled for the first staging cycle.

## Phase 0 configuration boundary

`wrangler.jsonc` is intentionally a build/local compatibility configuration.
It contains no staging or production Hyperdrive ID, R2 bucket, Cron Trigger, or
external resource identifier and must not be deployed as a production config.
The Worker entry fails closed when a required binding or Redis REST setting is
missing.

Resource provisioning belongs to a later phase. Once real resources exist:

1. Keep staging and production in separate Wrangler configurations and Workers.
   Do not copy a staging resource identifier into production.
2. Add the real `HYPERDRIVE` and `MEDIA_BUCKET` bindings to the applicable
   environment-specific configuration. Do not commit a placeholder ID.
3. Configure the applicable Worker variables/secrets from `.env.example`.
   `DATABASE_URL` is only for Node development/migrations; Workers use the
   Hyperdrive binding. Provide `REDIS_REST_URL` and `REDIS_REST_TOKEN`; do not
   use the former TCP `REDIS_URL`. Set `R2_PUBLIC_URL` to the staging R2 Custom
   Domain while retaining `S3_PUBLIC_URL` for legacy media.
4. Configure the R2 S3 endpoint, bucket, public URL, and scoped R2 API token
   only if presigned uploads remain enabled.
   These credentials are used only to sign direct browser uploads; Worker-side
   uploads use the R2 binding.
5. Set Google OAuth's authorized redirect URI and Better Auth URLs to the
   staging hostname. Set DOKU callback and notification URLs to staging only.
6. Regenerate bindings and build:

   ```sh
   npm run cf:types
   npm run check:vinext
   npm run build:vinext
   ```

The complete environment ownership and rollback rules are in
`docs/phase-0-production-safety.md`.

The locally validated Node/Worker behavior matrix, background-work limits, and
bundle baseline are in `docs/phase-1-worker-runtime-equivalence.md`.

The Neon direct-endpoint contract, cache-disabled Hyperdrive requirement,
controlled migration procedure, and transaction staging gates are in
`docs/phase-2-neon-hyperdrive.md`.

The R2 binding, custom-domain origin, legacy URL coexistence, and media-copy
verification procedure are in `docs/phase-3-r2-migration.md`.

## Required staging gates

| Gate                                                                    | Current status                           |
| ----------------------------------------------------------------------- | ---------------------------------------- |
| Clean vinext compatibility scan                                         | PASS (20 supported, 2 partial, 0 issues) |
| TypeScript and unit tests                                               | PASS locally                             |
| vinext Worker production build                                          | PASS locally                             |
| Local Wrangler homepage/card/anonymous auth smoke                       | PASS                                     |
| Invalid DOKU webhook remains HTTP 401                                   | PASS locally                             |
| Real cache-disabled Hyperdrive rollback and `FOR UPDATE` serialization  | NOT VERIFIED                             |
| Concurrent webhook/callback exactly-once fulfillment through Hyperdrive | NOT VERIFIED                             |
| Redis REST OAuth state consumption, session refresh, and global limits  | NOT VERIFIED                             |
| Google OAuth callback, cookies, and profile creation on staging         | NOT VERIFIED                             |
| R2 direct upload, image crop, audio upload, and public delivery         | NOT VERIFIED                             |
| Scheduled missed-webhook recovery on staging                            | NOT VERIFIED                             |
| Real DOKU Sandbox webhook, callback, duplicate, and recovery suite      | NOT VERIFIED                             |
| Production deployment/readiness                                         | NOT VERIFIED / NO-GO                     |

The two partial compatibility items are expected: Google fonts are loaded from
the CDN under vinext, and `next/image` uses the configured Cloudflare Images
optimizer. Verify both visually in staging.
