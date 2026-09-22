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

## Provision staging

1. Create a non-production R2 bucket named `ngaturi-staging-media` (or update
   `wrangler.jsonc` to the chosen staging bucket).
2. Create a Hyperdrive configuration against the staging PostgreSQL database
   with caching disabled and replace `replace-with-hyperdrive-id` in
   `wrangler.jsonc`.
3. Configure the applicable Worker text bindings/secrets from `.env.example`.
   `DATABASE_URL` is only for Node development/migrations; Workers use the
   Hyperdrive binding. Provide `REDIS_REST_URL` and `REDIS_REST_TOKEN`; do not
   use the former TCP `REDIS_URL`.
4. Configure the R2 S3 endpoint, bucket, public URL, and scoped R2 API token.
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

For local Wrangler, keep credentials outside source control and map a local
database to Hyperdrive:

```sh
export CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE='postgres://...'
npm run start:vinext
```

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
