# Phase 4 — Auth and payment integration readiness

This phase prepares the production-sensitive integrations for real Worker
staging. It does not provision services, change provider consoles, contact DOKU
or Google, deploy a Worker, or validate real provider delivery.

## Authentication and account state

Better Auth may satisfy a session read from its five-minute signed cookie
cache. Ngaturi therefore treats that result as session evidence, not current
account authorization. Every authenticated server request re-reads the user
row and accepts only `status=active`; a suspended/deleted status or missing row
is unauthenticated. React request caching still deduplicates the combined check
within one server request. A database failure is not converted into access.

The canonical `BETTER_AUTH_URL` is the source of OAuth callback URLs.
Forwarded host/protocol headers are deliberately not trusted to redefine it.
Behind Cloudflare, `cf-connecting-ip` is preferred for Better Auth, guestbook,
and RSVP rate limiting, with `x-forwarded-for` retained as the Node/local
fallback. The Worker origin must not be directly bypassable if these proxy
headers are used for security decisions.

Production-mode cookies are `Secure`, `SameSite=Lax`, and `Path=/`. Staging and
production must use HTTPS, separate secrets/provider clients, and separate
cookie jars. Do not add wildcard invitation domains to Better Auth trusted
origins.

## OAuth origin and callback contract

Use one canonical application origin per environment, without a path. Set
`BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to that same origin.

| Environment       | Canonical origin / trusted origin                                       | Google authorized redirect URI                   |
| ----------------- | ----------------------------------------------------------------------- | ------------------------------------------------ |
| Local Node        | `http://localhost:3030`                                                 | `http://localhost:3030/api/auth/callback/google` |
| Local Worker      | The exact local vinext origin selected by the operator                  | `<local-worker-origin>/api/auth/callback/google` |
| Staging Worker    | The exact HTTPS staging Worker/custom-domain origin selected in Phase 5 | `<staging-origin>/api/auth/callback/google`      |
| Production Worker | `https://ngaturi.com`                                                   | `https://ngaturi.com/api/auth/callback/google`   |

For Google, add the canonical origin itself as the authorized JavaScript origin
and the full `/api/auth/callback/google` URL as the authorized redirect URI.
The placeholders above are formulas, not values to paste: Phase 5 must first
record the actual local/staging origin, then configure its exact URL with no
wildcard. Cloudflare must preserve the request path, query string, `Host`, and
HTTPS scheme; callback generation still uses the static canonical base URL.

## Redis contract

Node development/rollback uses `REDIS_URL` through TCP. Workers use
`REDIS_REST_URL` and `REDIS_REST_TOKEN`; both are required and there is no
Worker fallback to TCP Redis. Better Auth secondary storage and production auth
rate limiting use the same REST adapter. Auth and public rate-limit increments
atomically create a fixed-window TTL; OAuth state consumption uses atomic
get-and-delete.

Missing Worker Redis configuration fails the Worker runtime contract. Runtime
Redis errors propagate: auth state/session writes and rate-limit checks are not
silently accepted. A valid signed cookie cache can avoid a Redis session read,
but it cannot bypass the authoritative current-account database check.

## DOKU Worker contract

The application uses the same signed DOKU implementation in Node and Worker
builds. Checkout and status requests sign the exact request target and body
digest. Notifications verify the raw request body before JSON parsing, and the
browser callback remains non-authoritative.

Configure these exact paths for each canonical environment origin:

- Browser callback: `<origin>/payment/callback` (`DOKU_CALLBACK_URL`).
- Server notification: `<origin>/payment/webhook/doku` (DOKU Back Office).

For production those are `https://ngaturi.com/payment/callback` and
`https://ngaturi.com/payment/webhook/doku`. Phase 5 must use the chosen exact
staging origin for both staging URLs and a staging DOKU client. Cloudflare must
not rewrite the notification pathname because it is part of signature
verification.

Transport ambiguity, malformed or untrusted checkout responses remain pending
for signed reconciliation. Only authenticated definitive rejection is failed.
Webhook, callback status checks, and scheduled reconciliation share the locked,
idempotent fulfillment transaction.

## Phase 5 staging checklist

1. Provision isolated staging Worker bindings from Phases 2 and 3:
   `HYPERDRIVE`, `MEDIA_BUCKET`, `IMAGES`, and `ASSETS`; configure the staging
   R2 custom-domain origin.
2. Provision isolated Redis REST and configure `REDIS_REST_URL` plus the
   `REDIS_REST_TOKEN` secret. Verify atomic get/delete and fixed-window expiry,
   then exercise Better Auth, guestbook, and RSVP limits under concurrency and
   forced Redis failure.
3. Choose and record one HTTPS staging app origin. Set `BETTER_AUTH_URL` and
   `NEXT_PUBLIC_APP_URL` to exactly that origin and keep production origins out
   of staging trusted origins.
4. Create a staging Google OAuth client. Configure the exact staging origin and
   `/api/auth/callback/google` redirect; verify login, callback, session read,
   logout, provider revocation/re-login, Secure/SameSite cookies, and rejected
   cross-origin requests.
5. Suspend an authenticated staging user, then delete a separate test user.
   Confirm their existing cookies immediately lose protected access while an
   active control user remains authorized.
6. Configure an isolated DOKU staging client, exact browser callback, and exact
   notification URL. Verify checkout, signed callback status, raw-body webhook,
   invalid signature/digest/target/client/amount/currency/invoice rejection,
   duplicate delivery, ambiguous checkout reconciliation, and scheduled retry.
7. Verify Cloudflare presents HTTPS and expected `Host`,
   `CF-Connecting-IP`, and forwarding headers without allowing a client to
   choose the canonical auth origin or security rate-limit identity.
8. Re-run the Phase 2 transaction checks over real Neon/Hyperdrive and the
   Phase 3 image/audio write plus public-read checks over real Images/R2.
9. Record logs, provider request IDs, cookie attributes, retry timing,
   transaction outcomes, and rollback criteria. Keep Node, the legacy database,
   legacy media, and provider settings available until staging acceptance.

Real OAuth consent, Redis service behavior, DOKU delivery/retries, Cloudflare
proxy headers, Hyperdrive locking, and R2/Images access remain unverified until
this checklist is executed in Phase 5.
