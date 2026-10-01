# Phase 1 — Worker runtime equivalence

This phase validates the existing vinext/Cloudflare Worker path locally. It does
not authorize Cloudflare resource provisioning, provider access, deployment, or
Phase 2 database work. Phase 0 remains the configuration and rollback baseline.

## Node and Worker regression matrix

| Capability               | Node runtime                                                   | Worker runtime                                                        | Local evidence                                                           |
| ------------------------ | -------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| App rendering            | Next.js server supported                                       | vinext fetch handler supported                                        | Next and vinext production builds                                        |
| PostgreSQL               | Process-local Postgres.js TCP pool from `DATABASE_URL`         | Invocation-scoped Postgres.js client from `HYPERDRIVE`, max 5         | Runtime context/database tests; missing binding fails closed             |
| Redis                    | `ioredis` TCP via `REDIS_URL`                                  | REST adapter via build-time alias and REST pair                       | Transport and atomic-operation tests; missing configuration fails on use |
| Auth                     | Better Auth route and server helpers supported                 | Same route/helpers compiled into Worker build with REST Redis adapter | Auth route/helper tests and vinext build; real OAuth remains unverified  |
| Builder/save             | Server Actions, validation, ownership checks, and transactions | Same application code through invocation database proxy               | Existing invitation action tests and vinext build                        |
| Public invitation        | SSR, visibility, owner preview, personalization, guestbook     | Same behavior through vinext RSC/route handlers                       | Public page, visibility, and guestbook tests                             |
| Payments                 | DOKU signing, callbacks, webhook, reconciliation, row locks    | Same code with Node compatibility APIs                                | Payment regression tests and vinext build                                |
| Audio/object upload      | S3-compatible signed write                                     | `MEDIA_BUCKET` write                                                  | Upload/storage tests; missing Worker bucket cannot fall back to S3       |
| Image upload/re-crop     | Intentionally unavailable with explicit `503`                  | Supported only with `IMAGES`, then written through `MEDIA_BUCKET`     | Runtime-specific upload tests                                            |
| Background analytics     | Next.js `after()`                                              | vinext maps `after()` to request execution context/`waitUntil`        | Scheduling/write/error-isolation tests; real duration remains unverified |
| HTTP cron                | Supported with `CRON_SECRET`                                   | Available but not used by native schedule                             | Existing cron route tests                                                |
| Scheduled reconciliation | Not applicable; Linux cron calls HTTP route                    | Native `scheduled()` uses `ctx.waitUntil()`                           | Worker entrypoint and bounded concurrency tests                          |

An active Worker invocation is an explicit runtime boundary. Database and object
storage adapters throw when their Worker binding is absent; they never fall back
to Node credentials. Node behavior remains selected only when no Worker
invocation context exists.

## Focused flow matrix

| Flow                      | Local validation                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Auth API initialization   | Better Auth GET/POST handler wiring imports without provider access                                                                  |
| Session/protected helpers | Session headers, missing-session redirect, and admin authorization tested                                                            |
| Redis selection           | Node TCP and Worker REST transports tested independently; REST absence fails safely                                                  |
| Builder read/save         | Existing action suite covers ownership, input policy, transactions, stale-template protection, and expiry enforcement                |
| Public rendering          | Active, expired, owner preview, and personalized guest paths tested                                                                  |
| Guestbook/RSVP            | Active, expired, and owner-preview API paths tested                                                                                  |
| Payment                   | Signing/verification, ambiguous checkout recovery, callback/webhook validation, terminal states, and exactly-once fulfillment tested |
| Uploads                   | Node image limitation, Node audio path, Worker image transform, and Worker R2 binding selection tested                               |
| Scheduled reconciliation  | Payment-disabled skip, invocation database injection, partial failure propagation, batch cap, and concurrency cap tested             |

No test substitutes fabricated resource identifiers for real staging evidence.

## `after()` and analytics

One public page render registers one `after()` callback. The callback performs a
bounded sequence: insert one view, increment one invitation counter, and, only
for a personalized link, conditionally mark the guest opened. There is no retry
loop or adapter-level rescheduling.

The request data is read before `after()` and passed through the callback
closure. A background failure is logged with a safe invitation identifier and
category, then contained so it cannot change the already-rendered response.

Local tests prove scheduling and error isolation, not Cloudflare execution time.
The work still depends on the platform `waitUntil` lifetime and real Hyperdrive
latency. Staging must measure completion/error rate; analytics redesign or Queues
remain outside Phase 1.

## Scheduled reconciliation

Each run selects at most 50 pending DOKU payments from the existing 2-minute to
24-hour window, oldest first. At most five candidates execute concurrently.
Candidate errors are isolated and counted; a summary containing errors rejects
the scheduled `waitUntil` promise so the platform can report/retry the failed
run. Fulfillment continues through the shared locked transaction.

This is locally safe enough to enter staging. Five concurrent DOKU checks plus
Hyperdrive transactions are close enough to Worker outbound/concurrency limits
that CPU time, wall time, open connections, retry behavior, and provider latency
must be measured with real staging bindings before changing the limits.

## Build and bundle baseline

The Phase 1 vinext production build succeeds and emits approximately 31 MiB in
`dist`. The largest current client chunks are:

- `stage-*`: 922,432 bytes.
- `nav-shared-*`: 645,920 bytes.
- `builder-shell-*`: 292,188 bytes.

The build warns for chunks above 500 kB. No bundle refactor is performed in this
phase. Three.js, React Three Fiber, and GSAP optimization remains future work
only if production measurements justify it.

`vinext check` remains 95% compatible: 20 supported, 2 partial, 0 issues. The
partial items are Google fonts being loaded from a CDN instead of self-hosted at
build time and partial `next/image`/Cloudflare Images behavior. Some routes also
remain statically unclassified by vinext analysis. These are staging validation
items, not Phase 1 architecture changes.

## Staging evidence still required

- Real Hyperdrive connection creation, transactions, rollback, and row locking.
- Better Auth sessions and atomic OAuth state through the configured Redis REST
  service.
- Cloudflare Images transforms and R2 writes/public reads.
- `after()` completion rate and duration under real database latency.
- Scheduled CPU, wall time, outbound connections, and Cron delivery.
- DOKU signing/verification and duplicate delivery inside the deployed Worker.

Proceeding to Phase 2 does not make any of these checks pass automatically.
