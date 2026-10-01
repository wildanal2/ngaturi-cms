# Phase 6A: PROD VM pre-cutover validation

Phase 6A keeps production traffic and legacy schedulers on their existing
targets. The pinned candidate now runs privately on the PROD host. This is
not a production traffic cutover. The current image has no visible Sandbox
payment notice; the source fixes below require a separately authorized future
artifact before it can safely receive external review traffic.

## Artifact and access contract

Use only:

```text
ghcr.io/wildanal2/ngaturi-cms@sha256:5adb39ed37c30358df4d8e5f009e543255e4f960f690b53a0b2ba2bde5a8f6bc
```

Copy the Phase 5 release bundle (production Compose and deployment/scheduler
helpers) to the confirmed PROD VM. Do not clone application source or rebuild
the artifact there. Record the VM identity, architecture, resources, listeners,
Docker/Compose versions, existing services, and administrative access before
changing the host.

Use one absolute external `RUNTIME_ENV_FILE`, readable only by the operator
(`0600` recommended). No project-local env source is used. Confirm production
resource identities and separation from DEV before any provider probe. Do not
print values. Missing required configuration blocks candidate startup; do not
substitute DEV credentials. The configured Upstash instance is intentionally
PROD; DEV now uses local Redis. DOKU Sandbox is intentional for this review
environment, with the explicit Sandbox endpoint and canonical callbacks.
Turnstile is disabled when both site key and secret are absent. Invitation
domains are unused by application features: the source validator now makes
that variable optional. For the pinned image's older validator only, the sole
production env file contains a compatibility entry derived from its actual
trusted canonical hostname, rather than an invented domain.

Bind to the confirmed private host address and isolate the port before
starting the candidate. Use the deployment script with that host port and the
exact reference above. Confirm
that the Compose project will not replace any existing application. Do not
attach the production hostname during Phase 6A.

## Acceptance evidence required on the PROD VM

- Verify the direct Neon PROD connection with certificate verification and a
  lightweight read. Inspect the migration journal and actual schema read-only
  against the image's source commit. A healthy `select 1` is insufficient to
  establish schema compatibility. Do not use the repository's Drizzle command
  for this inspection: its config loads `.env.local`. Record any exact missing
  migration and stop until a separate operator step is authorized. Initial
  provisioning was separately authorized and completed as described below.
- Verify Upstash PROD identity, then use a unique temporary key with a short
  TTL for bounded write/read/delete checks. Confirm cleanup.
- Verify the R2 PROD bucket and public origin. Write one unique temporary
  object with no-store caching, compare signed API and public-read bytes and
  content type, delete it, and verify deletion. Record cleanup even on failure.
- Confirm Google OAuth's registered production origin and callback in the
  provider configuration. A locally constructed callback URL alone does not
  prove Google has registered it. Verify login initiation without completing a
  real-user session. Inspect DOKU configuration consistency without initiating
  a payment or reconciliation job.
- Record the pulled digest, container user, mounts, health/readiness statuses,
  homepage/login/static responses, Sharp loading, and production media checks.
- Determine whether cloudflared is on the PROD VM or a separate LXC. Confirm
  account/zone ownership and the actual production ingress route independently
  of public DNS. Cloudflare response headers do not identify the origin host.
- Keep `TRUST_CLOUDFLARE_INGRESS=false` until access is isolated. Retain
  `trustedProxyHeaders: false`. For separate-LXC ingress, permit only its
  verified source address to the published app port through the effective
  Docker forwarding path. For local cloudflared, retain loopback binding.
  Preserve admin access; persist rules and verify they survive reload/reboot
  before marking ingress secure. UFW configuration alone is insufficient.
- Install scheduler units but leave timers disabled and inactive. Check
  explicit UTC scheduling, journal logging/retention, route authorization, `flock`,
  and timeout behavior without executing production maintenance. The helper
  calls localhost inside the production container using that container's
  `CRON_SECRET`. Do not install active cron entries in Phase 6A.

## Separate operator migration job

`db:migrate` remains the development Drizzle command; its config loads
`.env.local`. Production initial provisioning uses a separate bundled operator
job. Application startup and `deploy-prod.sh` never run migrations.

On the operator checkout, with locked dependencies already installed:

```sh
npm run db:operator-bundle -- /tmp/ngaturi-migration-job
```

The bundle reads SQL and journal from committed Git artifacts, includes an
official Drizzle migrator and a schema inventory, and records SQL hashes plus
source commit in a non-secret manifest. Copy only that bundle to the host,
for example `/opt/ngaturi-migration-job`; application source is not required
on the runtime host. The pinned image supplies Node for this separate job,
with a read-only operator-bundle mount. The application itself has no mounts.

Run as an administrator, with the one explicit production env source:

```sh
export RUNTIME_ENV_FILE=/etc/ngaturi/ngaturi.env
export NGATURI_IMAGE='ghcr.io/wildanal2/ngaturi-cms@sha256:5adb39ed37c30358df4d8e5f009e543255e4f960f690b53a0b2ba2bde5a8f6bc'
docker compose --env-file /dev/null -f /opt/ngaturi-migration-job/compose.migrate.yml \
  -p ngaturi-migration run --rm -T migrate --require-empty
# Check the direct Neon target against the independently confirmed PROD resource.
# Copy the non-secret target fingerprint reported by inspection:
export MIGRATION_TARGET_SHA256='<confirmed fingerprint>'
docker compose --env-file /dev/null -f /opt/ngaturi-migration-job/compose.migrate.yml \
  -p ngaturi-migration run --rm -T migrate --apply --require-empty
```

The operator checks verified TLS, acquires an advisory lock, rejects unmanaged
nonempty schemas and mismatched migration history, and uses only committed
migrations. Initial `0000`–`0007` application succeeded: eight journal entries
with exact SQL hashes/order and 14 application tables. A subsequent `--apply`
without `--require-empty` verified an idempotent no-op. No seeds or business
fixtures were created. Future schema changes remain separately authorized
operator steps; do not use `--require-empty` against an initialized database.

## Persistent ingress and inactive scheduler

Install `scripts/install-prod-ingress.sh` as root with explicitly supplied
`NGATURI_BIND_IP`, `NGATURI_HOST_PORT`, and `NGATURI_INGRESS_SOURCE`. It validates
IPv4/port inputs, checks nft syntax, and owns only `inet ngaturi_ingress`.
Its prerouting chain at priority `-110` permits the trusted LXC and drops other
sources before Docker DNAT (`-100`), including paths that bypass DOCKER-USER.
It preserves SSH and unrelated firewall tables. The enabled oneshot unit and
Docker `Requires`/`After` drop-in load the rules before Docker on boot.
An active firewall unit is reloaded, not restarted, to avoid restarting Docker.
The global nftables service is not enabled: its flush-all configuration would
destroy existing Docker and host rules.

LXC health/readiness and unrelated-LAN rejection were verified. Rule reload
was verified; a full host reboot was not performed. Cloudflare ingress trust
remains false, and `trustedProxyHeaders: false` is unchanged.

`ops/ngaturi-cron@.service` uses `/etc/ngaturi/scheduler.conf` for non-secret
host settings only (env-file path and port/bind configuration). Application
credentials remain solely in the runtime file/container. Install the three
`ops/ngaturi-*.timer` units without enabling or starting them. Their schedules
explicitly use UTC regardless of the host timezone. `Persistent=false` avoids
catch-up runs during eventual activation. The helper retains per-task `flock`,
bounded execution, protected container-local requests, and journal logging.
Do not install the cron example alongside these timers.

## Review safety and artifact boundary

Minimal source fixes add a runtime-derived Sandbox notice to upgrade/renewal,
payment callback, and invitation detail pages. The pinned container does not
contain those fixes and must remain private. No replacement application image
was built or published. A future authorized artifact must prove the visible
notice before public review traffic is enabled.

`SITE_INDEXING_ENABLED=false` selects review mode at server runtime: page
responses include `X-Robots-Tag: noindex, nofollow`, root and invitation
metadata prohibit indexing/following, robots disallows crawling, and the sitemap
omits review URLs without querying invitations. Unset or `true` preserves
commercial indexing. For commercial launch, set `true` in the one external
runtime env and recreate the container with the same image digest; no rebuild
is required. This server flag is not a `NEXT_PUBLIC_*` build value.

## Legacy inventory: evidence and outstanding checks

The repository declares an automatic Vercel PROD deployment on `main` in
`.github/workflows/deploy.yml`; GitHub reports that workflow as enabled.
`vercel.json` disables Vercel's separate Git deployment for `main` and declares
edit locking at 01:00 UTC and archiving at 01:30 UTC. Verify which deployed
Vercel project actually owns those schedules; declarations do not prove that
they are currently executing.

The checked-in `wrangler.jsonc` targets `ngaturi-dev` and declares DOKU
reconciliation every five minutes. This is DEV configuration, not proof of an
active production Worker scheduler. Inventory the production Cloudflare
account's deployed Workers and schedules before selecting anything to retire.
Also inspect legacy-host crontabs, systemd timers, PM2 jobs, and external
schedulers. Record each job's production resource identity and current owner.
Do not disable a DEV job as part of production cutover.

The PROD VM has no preexisting Ngaturi cron entries. Its prepared timers are
disabled/inactive. The tunnel LXC process inventory confirms cloudflared, but
its privileged Docker/configuration and root scheduler inventory are not
available to the supplied non-root account. Vercel deployed cron ownership and
any deployed production Worker schedules still need provider-console evidence;
checked-in declarations alone cannot establish the complete active inventory.

## Phase 6B switch order (not executed in Phase 6A)

1. Complete all acceptance evidence above. Record the current production
   ingress destination and rollback procedure, retain the legacy runtime, and
   verify database/media compatibility between old and new runtimes. Resolve
   any data migration or divergent backing-store issue before enabling writes.
2. Freeze legacy automatic deployments. Disable the Vercel production workflow
   before a merge can trigger it; confirm there are no in-flight deployments
   and verify the Vercel Git integration setting. GHCR publication may remain
   enabled because it does not deploy a VM.
3. Disable each confirmed legacy production scheduler at its actual owner.
   Wait for in-flight runs to finish and verify no further runs are starting.
   This includes production DOKU reconciliation wherever it is actually
   installed, plus invitation edit locking and archiving. Keep VM cron disabled.
4. Reconfirm candidate readiness, persistent ingress isolation, and the exact
   digest. Change the production ingress to the verified VM target during the
   separately authorized cutover. Validate production routes, login initiation,
   media, and readiness before enabling scheduled work.
5. Enable one VM scheduler owner for each production task only after the old
   owner is confirmed stopped. Confirm the host schedule uses UTC and observe
   protected invocation and logs. DOKU Sandbox reconciliation is appropriate for
   this review environment only when its configuration is complete and every
   old owner targeting the same resources is stopped.
6. Retain the legacy runtime and ingress rollback information through the
   agreed observation window. Retire it only after cutover acceptance.

## Rollback and deployment state

The Phase 5 deployer stores only full image references in `current` and
`previous`, under `NGATURI_DEPLOY_STATE_DIR` (default
`/var/lib/ngaturi-deploy`). Verify the actual location and references on PROD;
do not copy secrets into this directory. The script checks health and readiness
after restoring the prior digest and returns nonzero for a failed candidate.

On the first VM deployment, there is no previous known-good VM digest. A
failed candidate is stopped; production remains served by the legacy target.
A successful private deployment records `current` but does not establish a
previous VM release or prove traffic-cutover readiness.

After a Phase 6B cutover failure, stop new VM scheduler invocations and drain
in-flight work before restoring the recorded legacy ingress destination.
Verify the legacy runtime can safely use current production data, then restore
only its original scheduler owners. If backing stores diverged, stop and use
the separately approved data recovery plan; changing ingress alone cannot
repair that divergence. Subsequent VM releases can roll back through
`deploy-prod.sh` using the exact recorded previous reference, without rebuilding.
