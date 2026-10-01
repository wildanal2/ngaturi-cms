# Phase 6A: PROD VM pre-cutover validation

Phase 6A keeps production traffic and legacy schedulers on their existing
targets. The replacement review candidate now runs privately on the PROD host.
This is not a production traffic cutover. Provider-side scheduler ownership
and the exact legacy ingress settings remain user-confirmation gates. One
controlled reboot proved firewall persistence and exposed a late-address bind
race; the recovery helper is corrected but has not had a second reboot test.

## Artifact and access contract

Use only:

```text
ghcr.io/wildanal2/ngaturi-cms@sha256:2231d9cda0ee2e6f6409967e8c980e9eaae65a01355180063d24dc9702fbd5ee
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
export NGATURI_IMAGE='ghcr.io/wildanal2/ngaturi-cms@sha256:2231d9cda0ee2e6f6409967e8c980e9eaae65a01355180063d24dc9702fbd5ee'
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

LXC health/readiness and unrelated-LAN rejection were verified after the
controlled reboot. The ingress unit entered active state before Docker.
Docker's raw prerouting rule also rejects direct container-IP access from
outside its bridge; direct routing is disabled, its bridge has one container,
and IPv6 is disabled. After these checks, Cloudflare ingress trust was enabled
in the external runtime env. `trustedProxyHeaders: false` remains unchanged.
Runtime IP-helper checks accept only a single valid Cloudflare IP, discard
untrusted forwarded headers, replace a forged internal header, and reject
chained IPs. Public Cloudflare-to-candidate traffic is still not routed.

`ops/ngaturi-cron@.service` uses `/etc/ngaturi/scheduler.conf` for non-secret
host settings only (env-file path and port/bind configuration). Application
credentials remain solely in the runtime file/container. Install the three
`ops/ngaturi-*.timer` units without enabling or starting them. Their schedules
explicitly use UTC regardless of the host timezone. `Persistent=false` avoids
catch-up runs during eventual activation. The helper retains per-task `flock`,
bounded execution, protected container-local requests, and journal logging.
Do not install the cron example alongside these timers.

## Review safety and artifact boundary

The replacement image was published by the existing Container release workflow
from source commit `ab133aa5250f0a2339cf591cf078b7e3204600d8`, run
`36818818173`. Registry metadata verified `linux/amd64` and the exact revision.
The PROD deployment pulled its exact digest and recorded the earlier private
candidate as `previous`; no application build ran on PROD.

Runtime acceptance confirmed health/readiness, homepage/login/templates/static
assets, Sharp, Upstash write/read/TTL/cleanup, Google initiation with the
canonical callback, and signed/public R2 PNG write/read/delete with exact bytes
and subsequent 404s. The unauthenticated payment callback visibly includes
the Sandbox/simulated-payment notice without initiating a transaction.
No DEV hostname appeared in the checked pages.

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

The public GitHub API shows a successful legacy Vercel production deployment on
2026-09-09. This establishes historical deployment, not current DNS ownership or
current cron execution. Public requests traverse Cloudflare; response headers
do not identify Vercel or another actual origin. Three uncached public health
requests did not increment the private candidate's trusted-ingress counter.

### Required user confirmations (no credentials requested)

| Item | Location and exact values to inspect | Evidence to record without secrets |
| --- | --- | --- |
| Legacy Vercel project | Vercel dashboard: identify the project whose Settings → Domains includes `ngaturi.com`; inspect its current Production deployment | Project name, production deployment URL/ID, whether the domain still aliases it |
| Edit locking | That project's Settings → Cron Jobs: `/api/cron/lock-expired-edits`, expected `0 1 * * *`; View Logs | Enabled/disabled, last invocation/result, actual production resource identity |
| Archiving | Same page: `/api/cron/archive-expired`, expected `30 1 * * *`; View Logs | Enabled/disabled, last invocation/result, actual production resource identity |
| DOKU reconciliation | Cloudflare Workers & Pages: inspect each production Worker, Settings → Triggers → Cron Triggers; View events under Trigger Events | Worker name, trigger expressions, execution history, PROD versus DEV resource identity; do not classify `ngaturi-dev` as PROD from its name alone |
| Current DNS ingress | Cloudflare zone `ngaturi.com` → DNS → Records: apex and `www` | Record type, content/target, proxy state, TTL; retain an export/screenshot |
| Tunnel ingress, if used | Cloudflare Networking → Tunnels: select the tunnel identified by the LXC's `cloudflared-ngaturi.service`; Routes → Published application | Existing `ngaturi.com`/`www` hostname and path entries, exact service URL, origin options, route ordering |
| Worker ingress, if used | Workers & Pages → selected Worker → Settings → Domains & Routes | Custom domain or route matching `ngaturi.com`/`www`, Worker identity/version, fail-open setting |
| Other ingress policies | Zone rules/load balancing if they override the above | Applicable rule/pool/redirect identity and prior values; explicitly confirm none if absent |
| LXC privileged scheduler | Proxmox LXC console/operator root access: inspect all user crontabs and system timers | Any production Ngaturi task owners; readable system cron and timer listings currently show none |

These locations follow the official [Vercel cron management guide](https://vercel.com/docs/cron-jobs/manage-cron-jobs),
[Cloudflare tunnel guide](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel/),
and [Cloudflare Cron Triggers guide](https://developers.cloudflare.com/workers/configuration/cron-triggers/).
No provider access was added and no legacy resource was modified.

### Intended scheduler ownership at cutover

| Responsibility | Current owner | Sole intended VM owner | Separately authorized Phase 6B action |
| --- | --- | --- | --- |
| Edit locking | Vercel declaration exists; live owner requires confirmation | `ngaturi-lock-expired-edits.timer`, 01:00 UTC | Disable the confirmed legacy project cron, drain existing runs, then enable this timer after ingress acceptance |
| Archiving | Vercel declaration exists; live owner requires confirmation | `ngaturi-archive-expired.timer`, 01:30 UTC | Same owner verification/drain; enable only this timer |
| DOKU reconciliation | PROD owner unknown; checked-in Worker schedule is DEV-only | `ngaturi-reconcile-doku-payments.timer`, every five minutes UTC | Retire only confirmed PROD reconciliation triggers/processes, wait for propagation/in-flight work, then enable this Sandbox-configured timer |

Vercel supports a project-level **Disable Cron Jobs** control. Do not execute it
now. For a Wrangler-managed production Worker, update its production `crons`
configuration so a later deployment cannot recreate a retired schedule.
Do not retire a DEV schedule as a substitute for identifying the PROD owner.

## Controlled reboot and recovery evidence

SSH, Docker, and the ingress unit are enabled at boot, the candidate and other
Docker containers use `unless-stopped`, and Ngaturi timers remain inactive.
The unrelated API-Mikrotik PM2 runtime had no boot unit. Read-only inspection
found its existing saved configuration exactly matched both running processes.
After the authorized reboot, the existing saved configuration was resurrected
under its original owner; both processes returned online. No unrelated startup
configuration was changed, and the recovery paths are recorded outside Git.

The host boot ID changed, SSH recovered, other Docker containers recovered,
and firewall-before-Docker ordering was verified. The Ngaturi candidate failed
its initial automatic port bind because Docker started before DHCP assigned
the narrow host address. A later start also left it without network attachments
after Docker's failed setup. The firewall was not weakened and the binding was
not widened.

`scripts/start-prod-runtime.sh` and `ops/ngaturi-runtime.service` correct this
race: wait at most 60 seconds for the configured IPv4 address, read and validate
the exact `current` digest, force-recreate only the app from its cached image,
and gate health/readiness. No pull, build, migration, env fallback, or source
mount occurs. The enabled runtime unit depends on Docker and the persistent
ingress unit, using the same non-secret host settings file as the inactive
scheduler. Focused tests cover late address availability, immutable reference
enforcement, cached-image recreation, and readiness failure.

The new runtime unit was started successfully on the rebooted host; LXC probes
returned 200 and unrelated LAN traffic remained blocked. Only one reboot was
authorized/performed. Automatic recovery with this revised unit still requires
a separately authorized subsequent reboot test before claiming that gate fully
passed. Firewall persistence itself is verified by the completed reboot.

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

The new private candidate is `current`; the earlier private digest
`sha256:5adb39ed37c30358df4d8e5f009e543255e4f960f690b53a0b2ba2bde5a8f6bc`
is now `previous`. This establishes an artifact rollback option without
claiming that either private candidate was the legacy public origin.
The earlier image lacks the review notice/noindex controls and must not be
promoted to public review traffic as a substitute for ingress rollback.

The Phase 5 deployer stores only full image references in `current` and
`previous`, under `NGATURI_DEPLOY_STATE_DIR` (default
`/var/lib/ngaturi-deploy`). Verify the actual location and references on PROD;
do not copy secrets into this directory. The script checks health and readiness
after restoring the prior digest and returns nonzero for a failed candidate.

On the first VM deployment, there is no previous known-good VM digest. A
failed candidate is stopped; production remains served by the legacy target.
A successful private deployment records `current` but does not establish a
previous VM release or prove traffic-cutover readiness.

### Public ingress rollback: confirmation required before Phase 6B

Do not substitute the new VM origin or a guessed Vercel hostname for the old
origin. The exact existing production target is not visible through current
host access. Populate an operator-owned, non-secret rollback record outside
Git with the dashboard values listed above: DNS record IDs/type/content/proxy
state/TTL, any matching Worker route/version, tunnel hostname/path/service and
origin options, any overriding rule/pool, the legacy deployment URL, and each
task's prior scheduler owner/enabled state. Until those values are confirmed,
the rollback ingress gate is unresolved and Phase 6B is not ready.

The separately authorized rollback sequence is:

1. Disable/stop all three VM timers and confirm their service instances have
   finished; do not start legacy schedulers while VM work is still running.
2. Restore only the ingress resources actually changed during cutover, using
   the recorded original values. A tunnel rollback uses **Networking → Tunnels
   → recorded tunnel → Routes → Published application**, restoring the original
   service URL/options for the production hostname/path. A DNS rollback uses
   **zone → DNS → Records**, restoring the recorded apex/`www` record values.
   Restore an original matching Worker route/custom domain/version only if
   cutover changed it. These are user dashboard actions with current access.
3. Verify the recorded legacy deployment is healthy and public homepage/login,
   OAuth initiation, and a known legacy media URL work. Confirm requests no
   longer reach the new VM application port. Keep the VM timers stopped.
4. Restore only the recorded original scheduler owners/enabled states, observe
   their logs, and verify there is one owner for each responsibility. Vercel
   deployment rollback does not automatically restore/change cron schedules;
   scheduler state must be restored explicitly.

This procedure was documented, not executed. Production DNS, tunnel routes,
Worker routes, legacy deployments, and scheduled jobs were not changed.

After a Phase 6B cutover failure, stop new VM scheduler invocations and drain
in-flight work before restoring the recorded legacy ingress destination.
Verify the legacy runtime can safely use current production data, then restore
only its original scheduler owners. If backing stores diverged, stop and use
the separately approved data recovery plan; changing ingress alone cannot
repair that divergence. Subsequent VM releases can roll back through
`deploy-prod.sh` using the exact recorded previous reference, without rebuilding.
