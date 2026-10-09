# Payment providers and Sumopod sandbox acceptance

`PAYMENT_PROVIDER` selects **new creation only**. An absent selector defaults to
`doku`; an unsupported selector or incomplete selected-provider configuration
returns safe checkout HTTP 503. Existing callbacks, webhooks, and reconciliation
resolve the adapter from `payments.provider`. There is no automatic provider
fallback or automatic retry of payment creation.

## Architecture and financial safety

`PaymentProvider` owns `createPayment`, `getPaymentStatus`, and
`parseVerifiedWebhook`, together with provider authentication, status mapping,
and trusted checkout URL validation. `applyPaymentObservation` owns shared
financial recording and invitation fulfillment. Observations are checked under a
payment row lock against stored provider, merchant reference, known provider ID,
exact amount, and currency. Money comparisons use decimal strings and BigInt
minor units, matching the existing PostgreSQL numeric(10,2) representation.

Checkout locks the owned invitation, validates eligibility and server catalog
price, and checks unresolved attempts of the same kind across all providers.
It commits the durable pending row before calling the provider. Both create and
status HTTP calls have 15-second deadlines covering response-body reads.
An ambiguous creation outcome remains pending and blocks replacement creation.
An authenticated definitive DOKU rejection can mark its pending attempt failed.
Sumopod HTTP errors stay unresolved because rejection guarantees are undocumented.

Provider IDs can be recorded after settlement. A conflicting or failed reference
write returns HTTP 502, records review metadata where the database is available,
and preserves the financial state. Shared fulfillment also locks the invitation:
two distinct paid unlocks record two financial successes, but only the first
grants quota and changes the plan. The second is flagged
`duplicate_successful_unlock`; it cannot downgrade the existing plan. Distinct
valid renewals still stack 90 days each. DOKU refunds remain financial-only;
partial or ambiguous refund evidence requires the existing operator review.
Sumopod refund operations fail explicitly rather than routing to DOKU.

## Official Sumopod contract and implementation boundary

Sources inspected on 2026-10-09:

- [Sumopod Managed Payment dashboard](https://sumopod.com/dashboard/managed-payment),
  its official Quick Start, Webhooks, and Return URLs sections. The public
  dashboard assets were inspected directly; no unofficial SDK was used.
- [Svix manual verification](https://docs.svix.com/receiving/verifying-payloads/how-manual)
  for the signature envelope, exact signed bytes, timestamp verification, and
  constant-time comparison. A published known-answer vector is regression-tested.
- The official **sandbox** create API response using the supplied sandbox API key.

Established create contract:

- Sandbox API: `https://api-pay-sandbox.sumopod.com`.
- Production API shown by Quick Start: `https://api-pay.sumopod.com`.
- `POST /api/v1/payments`, authenticated with `X-Api-Key`.
- Payload: durable `order_id`, integer-IDR `amount`, `currency: IDR`,
  `expires_in_hours: 24`, `success_return_url`, `cancel_return_url`, and
  `payment_method_type_code: QRIS`.
- Response: `payment_id`, `order_id`, `amount`, `currency` when present,
  `payment_link_url`, `status`, and `expires_at`.
- The actual sandbox returned
  `https://sumo.sandbox.pymnt.global/payment-links/<uuid>`; its link UUID differs
  from `payment_id`. This exact host/path is permitted only for the sandbox base.
  The Quick Start example `https://pay.sumopod.com/pay/<payment_id>` is also
  validated. Arbitrary domains, userinfo, non-HTTPS URLs, ports, query overrides,
  and fragments are rejected.

Established webhook contract:

- Fixed endpoint: `/payment/webhook/sumopod`.
- Events: `payment.completed`, `payment.failed`, `payment.expired`, `payment.test`.
- Financial data: `payment_id`, `order_id`, `amount`, `status`; the official
  IDR-only example omits currency. An explicit mismatched currency is rejected.
- Svix headers: `svix-id`, `svix-timestamp`, `svix-signature`; HMAC-SHA256 over
  `id.timestamp.rawBody`, keyed by the decoded `whsec_` secret. Multiple v1
  signatures support rotation. This implementation uses a five-minute tolerance.
- Official alternative: direct `X-Webhook-Token` comparison. When a signing
  secret is configured, token authentication cannot bypass signature verification.
- Authenticate the raw body before parsing or business processing. Valid test
  events return 200 without fulfillment; repeated financial deliveries are
  idempotent. Database failures return 500 so legitimate retries remain possible.
- Dashboard guidance requires a 2xx acknowledgment within ten seconds and offers
  manual resend. Automatic retry intervals and retention were not established.

**Still missing:** an authoritative public API-key status-query endpoint and
response contract; lookup/recovery by merchant reference after ambiguous create;
creation idempotency guarantees; reference length/uniqueness restrictions; complete
lifecycle ordering; automatic webhook retry policy; refunds and rate limits.
Quick Start establishes optional expiry with a 24-hour maximum, but the exact
failed/cancelled/completed ordering is not an API recovery specification.

`SumopodProvider.getPaymentStatus` therefore explicitly reports
`sumopod_status_contract_missing`; it makes no guessed request. Live creation is
disabled until recovery is implemented and accepted. Callback can display stored
trusted webhook state, but cannot independently recover Sumopod success. QRIS is
requested by the API; the UI does not advertise other unverified Sumopod methods.

## Environment

Server-only configuration names:

- `PAYMENT_PROVIDER`
- `SUMOPOD_BASE_URL`, `SUMOPOD_API_KEY`
- `SUMOPOD_WEBHOOK_SECRET` **or** `SUMOPOD_WEBHOOK_TOKEN`
- Existing `DOKU_CLIENT_ID`, `DOKU_SECRET_KEY`, `DOKU_BASE_URL`, `DOKU_CALLBACK_URL`

Provider credentials are validated lazily. Missing inactive-provider credentials
do not prevent startup. Sumopod checkout currently requires the exact sandbox
base, API key, and valid webhook authentication configuration. Historical DOKU
processing still needs its own credentials even when Sumopod is selected.
Historical Sumopod webhook authentication is independent of the creation selector.

`.env.sumopod.sandbox.local` is ignored. The explicit sandbox probe reads that
file; Next does not automatically load its custom filename. Inject its server
variables through the existing runtime environment before application acceptance.
For this local working tree, only the supplied Sumopod variables were merged into
ignored `.env.local`, preserving unrelated configuration. On the continuation
acceptance run, the supplied signing secret and token were both present and were
loaded into the existing DEV Compose app by recreating that app service without
building or pulling an image. Only the identified DEV runtime was reloaded.
No secrets belong in `NEXT_PUBLIC_*` variables. The Worker DEV variable allowlist
includes the new names; it was not synchronized or deployed during this task.

## Database migration and deployment order

Additive migration: `src/lib/db/migrations/0008_payment_provider_sumopod.sql`:

```sql
ALTER TYPE "public"."payment_provider" ADD VALUE IF NOT EXISTS 'sumopod';
```

The Drizzle schema, snapshot 0008, and journal entry 8 include the new enum value.
No payment rows are rewritten and no columns are added. The project migrator
wraps migrations in a transaction: PostgreSQL rejects use of a newly added enum
value before that transaction commits (`55P04`).

Deployment sequence after manual review:

1. Build the migration bundle from the reviewed committed release revision.
   The existing operator bundler reads Git HEAD, so it does **not** include an
   uncommitted migration from this working tree.
2. Apply and **commit** migration 0008 using the established migration operator.
3. Deploy the provider-capable application, configure its server credentials and
   fixed webhook endpoints, and then enable the accepted provider for creation.
4. Sumopod live creation additionally requires the missing recovery contract,
   implementation, and deliberate sandbox/live acceptance.

No production database migration was run. During the continuation acceptance run,
the existing DEV runtime's database identity and all eight applied migration
hashes/timestamps were checked before applying the sole pending migration 0008.
The DEV migration committed successfully; the journal now has nine entries and
the new enum value is usable. Isolated PostgreSQL 16 tests verified the old
enum rejection, same-transaction enum restriction, committed Drizzle migration,
preserved DOKU rows, and repeatable `IF NOT EXISTS` behavior.

## Reconciliation and rollback

The existing `/api/cron/reconcile-doku-payments` endpoint and scheduler ownership
are retained. Their service now reconciles mixed providers from each stored row.
Batches remain 50 with five concurrent checks and a two-minute initial delay.
There is no maximum-age cutoff. Durable `rawWebhook.reconciliation.attemptedAt`
rotation prevents permanently stuck oldest rows from starving unattempted rows.
Safe categories expose old backlog, missing references, unavailable adapters,
timeouts, and contradictory terminal evidence without logging customer payloads.

Legacy locally expired rows without provider evidence are still recoverable and
block replacement purchases until resolved. Authoritative conflicting terminal
observations record durable review metadata rather than silently disappearing.
Sumopod rows without an available status API remain unresolved and are rotated
with `sumopod_status_contract_missing`; a verified webhook can still settle them.

Once any Sumopod row exists, rollback must use a version that can process **both**
providers. An old pre-adapter build is unsafe. Operationally switching new
creation back to `PAYMENT_PROVIDER=doku` does not change the provider of existing
payments or disable the Sumopod webhook.

## Validation and remaining acceptance

Run non-financial regression tests with `npm test`, and isolated real PostgreSQL
locking/migration tests with `node scripts/test-payments-postgres.mjs`. The latter
uses a fresh loopback-bound PostgreSQL 16 container with tmpfs storage, removes
only that container, and simulates provider HTTP. It never connects to an existing
database. Ordinary Vitest runs intentionally skip these DB tests.

Explicit sandbox contract probe:

```sh
npx tsx scripts/verify-sumopod-sandbox.ts /path/to/ignored/sandbox.env
```

This sends exactly one QRIS sandbox create request with a unique reference and
dummy return URLs, creates no Ngaturi database row, performs no simulated success,
and never retries creation. To revalidate a previously accepted response without
another create, pass its private evidence JSON path as a second argument.
Evidence is written outside the repository with mode 0600, without API keys or
webhook secrets.

Actual external acceptance on 2026-10-09: two deliberate unique-reference QRIS
create probes returned HTTP 201 and pending responses. The first exposed the
Quick Start host mismatch; the second retained evidence for corrected validation.
The existing second response passed the adapter's exact amount/reference/status
and URL validators. Its hosted link returned HTTP 307, then HTTP 200 HTML on the
same sandbox host; the page contained QRIS. No charge or success simulation was
performed. No production financial or Ngaturi payment record was created.

The continuation acceptance run loaded the supplied sandbox webhook credentials,
created one actual Ngaturi DEV checkout, opened its hosted QRIS page in Chromium,
and exercised the public webhook endpoint with locally signed test and invalid
financial events. See [the continuation acceptance evidence](sumopod-sandbox-acceptance.md)
for the exact distinction between those checks and actual provider delivery.
The dashboard operator subsequently confirmed Save & Test success and completed
the new sandbox payment. Public delivery logs and the persisted DEV state verified
the completed webhook, pending-to-paid transition, exactly-once initial grant,
callbacks before/after settlement, and controlled duplicate financial delivery.
Pending-safe reconciliation was also exercised on that DEV payment. Authoritative
status/recovery, automatic provider retries, and failed/expired simulation remain
unverified. Completed sandbox acceptance does not establish live readiness.

Validation results for this working tree:

- Payment/callback/webhook/reconciliation/Worker/environment regression run: 198 passed;
  the 26 real-DB cases are skipped by the ordinary runner.
- Full Vitest run: 590 passed, 26 isolated-DB cases skipped, 68 files passed.
- Disposable PostgreSQL runner: 26 passed with real row locks, migration ordering,
  duplicate deliveries, conflicting references, mixed-provider checkout, and
  concurrent distinct unlock/renewal transactions. Provider HTTP is simulated.
- Existing scheduler/container-release Node tests: 14 passed.
- TypeScript and ESLint passed; lint reports one existing unused-variable warning
  in `src/sections/navigation/nav-shared.test.ts`.
- Drizzle check passed; subsequent generation reports no schema changes. Snapshot
  0008 follows snapshot 0006 (0007 is a data-only migration), with only the provider
  enum addition. `git diff --check` passed.
- Next production standalone build passed with the existing
  `NGATURI_IMAGE_BUILD=1` convention. A plain build also completed but reported
  existing local Redis REST configuration errors during dynamic-route probing.
- Vinext compiled all five stages, then standalone packaging failed resolving
  `__CLOUDFLARE_MODULE__CompiledWasm__`. An isolated archive of unmodified HEAD
  reproduced the same error, confirming a pre-existing tooling limitation.
- Next and vinext both generate `.next/types/routes.d.ts`; an overlapping build
  initially caused a type-generation conflict. The sequential Next rebuild passed.
- A scan of 362 generated client artifacts found no supplied Sumopod API key or
  DOKU secret. No credentials are included in this report or repository changes.

No commit, push, deployment, live financial request, or production migration was
performed. The isolated test containers were removed. The two initial provider
probe orders were left unresolved rather than calling an undocumented public
cancellation API. The continuation Ngaturi sandbox order is now paid following an
actual verified provider webhook. Its test payment and owned invitation are
retained for manual review and possible legitimate delivery retries; no local
expiry or cleanup was used to change financial state.
Manual review and the remaining official recovery contract are required before
live acceptance.
