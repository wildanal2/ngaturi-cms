# Ngaturi production

Repository source lives in `ops/production/`. **The production VM installation is `/home/okee/ngaturi`**, containing `deploy.env`, the operation entry points and effective Compose/scheduler files. Do not create `/home/okee/ngaturi/ops/production` or extract an ops archive over the running installation.

## Release unit and prerequisites

The validated CI artifact `ngaturi-production-ops.tar.gz` contains the immutable image identity, Git revision, deployment protocol, every ops file and its SHA-256 checksum. CI also records the aggregate ops checksum in the image label `com.ngaturi.ops-sha256`. Deployment checks the registry image revision/source/platform and this checksum against the archive before changing runtime. An image tag/digest without its matching ops artifact is rejected. Download the artifact only from the successful official Git-tag workflow; the manifest binds integrity and identity, not the trustworthiness of an arbitrary download.

The VM requires Python 3.9+, Bash, Docker Compose v2, Buildx, curl and iproute2. Keep the existing Docker login, `/etc/ngaturi/ngaturi.env` (root-owned `0600`), ingress/firewall and boot service. Use sudo for deployment and state inspection. Existing `deploy.env` must retain project `ngaturi-prod`, the audited bind/port, state `/var/lib/ngaturi-deploy` and **`SCHEDULER_ENABLED=true`**. No application secrets enter artifacts or deployment state. Runtime environment contents are external and are not rolled back; do not change them during this release.

Both app and scheduler use the same immutable image. Scheduler runner and crontab are mounted read-only together. The fixed scheduler container name, existing Compose project, deployment lock and active-owner checks prevent a second managed scheduler. A disabled legacy timer is retained and must remain disabled/inactive.

## First deployment of the Neon CU fix

The example `v1.2.0` below must be replaced by the actual newly validated release tag. Obtain its matching `ngaturi-production-ops.tar.gz` from the official CI artifact and place it at the artifact path shown below. These are operator instructions; preparing this patch does not run them.

```sh
cd /home/okee/ngaturi
RELEASE_TAG=v1.2.0
RELEASE_ARTIFACT="/home/okee/releases/$RELEASE_TAG/ngaturi-production-ops.tar.gz"
STAGED_OPS="/home/okee/releases/$RELEASE_TAG/bootstrap"
mkdir -p "$STAGED_OPS"
# Extract the trusted control entry point outside the live runtime.
tar -xzf "$RELEASE_ARTIFACT" -C "$STAGED_OPS" deploy.sh rollback.sh release.py
sudo "$STAGED_OPS/deploy.sh" --dry-run "$RELEASE_TAG" --artifact "$RELEASE_ARTIFACT"
sudo "$STAGED_OPS/deploy.sh" "$RELEASE_TAG" --artifact "$RELEASE_ARTIFACT"
```

Do not invoke the existing legacy VM `deploy.sh` for this first upgrade: it does not enforce artifact pairing. The staged controller validates and installs the complete archive. Afterward normal deployment can also use `sudo ./deploy.sh "$RELEASE_TAG" --artifact "$RELEASE_ARTIFACT"`. A bare tag/digest invocation fails. A digest target is accepted only when it exactly matches the supplied official artifact; `latest`, `stable`, arbitrary image names and Staging candidates are rejected on this production VM.

Read-only preflight checks fail if the cwd/runtime is wrong, current release is unknown, the audited baseline files/image have drifted, the artifact is absent/corrupt, image/ops revision or checksum differs, scheduler contains anything besides the two daily jobs, an extra Ngaturi container exists, scheduler activation is false, or the legacy reconciliation timer is active/enabled. Registry pulls, release staging, scheduler/app stop and replacement happen only after these checks. Dry-run does not pull or replace the runtime (it takes the deployment lock).

## v1.1.0 fallback and transaction state

Before stopping either service on the first deployment, the controller requires the current release to be exactly:

- `v1.1.0`, revision `8c2afb2ae19587e0d2c01e68b1b8df036d9d424f`;
- image `ghcr.io/wildanal2/ngaturi-cms@sha256:996375272d57a49aeae3d0e6af464e1d9329acc680b8f4e39e93f6ed74b7406d`;
- the audited VM's Compose, scheduler, deploy/rollback and runtime-unit file checksums embedded in the bootstrap guard.

It verifies the running containers and cached image identity, snapshots the complete installed v1.1.0 ops files and non-secret deployment configuration, and durably records **current=v1.1.0 and previous=v1.1.0**. This replaces v1.0.0 in both managed and compatibility fallback records before runtime replacement. Missing/drifted evidence blocks the upgrade; there is no guessed or image-only bootstrap fallback. A failed first candidate restores this v1.1.0 snapshot. A successful candidate records that same complete v1.1.0 unit as previous.

`/var/lib/ngaturi-deploy/units/<unit-id>/` stores checked release files, original release scripts, image identity and `runtime-config.json`. `units.json` is the authoritative atomic current/previous record. `.active-release` in the VM runtime selects the complete ops unit; root runtime files link through it. The app and scheduler are stopped/drained before switching the selected unit and recreated only after all files/configuration match. Image-only and scheduler-only activation are unsupported.

The root `deploy.sh`/`rollback.sh` are guarded management entry points. For managed releases, their controller is selected from the matching release unit. The historical v1.1.0 scripts remain intact in its bootstrap snapshot for provenance, but are never executed: a guarded controller is retained during a bootstrap rollback so the legacy scripts cannot select v1.0.0 or perform an image-only operation. This is a management-layer migration exception; v1.1.0's application image, Compose, scheduler runner, crontab and saved configuration are restored together without substituting new scheduler files.

`pending.json` is written and fsynced before runtime changes. A pre-commit interruption restores the complete origin unit; an interruption after the atomic `units.json` commit recovers the committed complete unit. Compatibility `releases.env`, `compose.env`, `current` and `previous` remain available, but never select v1.0.0. No cleanup deletes previous units or images.

## Rollback and interrupted operations

```sh
cd /home/okee/ngaturi
sudo ./rollback.sh
```

Rollback validates and restores the entire previous unit: exact digest, Compose, runtime configuration, scheduler runner, crontab and versioned release files/scripts. It drains both services, selects the previous unit, recreates both containers and gates health/readiness before committing the new current/previous state. A failed rollback restores its complete origin unit; it does not proceed to an older fallback.

A bootstrap rollback to v1.1.0 intentionally restores its original three-job schedule, including five-minute reconciliation. This prioritizes exact payment/runtime compatibility and cancels CU acceptance. Re-deploy the validated optimization release to regain the two-job schedule. Later rollback between optimized releases restores the previous two-job scheduler from that release. Never manually combine old images with new scheduler files or overwrite symlinked ops files.

For an interrupted deploy/rollback or power loss:

```sh
cd /home/okee/ngaturi
sudo ./deploy.sh --recover
```

Recovery honors the pending journal, waits for the configured host address, uses cached immutable images and runs bounded readiness checks. It performs no builds, pulls or database migrations. The installed one-shot boot service already uses this cwd and entry point; preserve that service and ingress dependencies. It does not periodically monitor readiness. If interruption occurred before the guarded root entry points were installed, invoke `sudo "$STAGED_OPS/deploy.sh" --recover` from the same cwd instead. If restoration fails, the journal remains and automatic deployment is blocked; inspect state/logs before retrying recovery. Do not remove the journal or edit release state manually.

## Production verification

After deployment, run from the actual runtime:

```sh
cd /home/okee/ngaturi
dc() { sudo docker compose --env-file /var/lib/ngaturi-deploy/compose.env --project-directory "$PWD" -f "$PWD/compose.yml" -p ngaturi-prod --profile scheduler "$@"; }
dc ps app scheduler
sudo docker inspect --format '{{.Name}} status={{.State.Status}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}} restarts={{.RestartCount}}' $(dc ps -q app scheduler)
sudo docker ps --filter label=com.docker.compose.project=ngaturi-prod --format '{{.Names}}'
dc exec -T scheduler cat /app/ops/production/scheduler.crontab
dc exec -T scheduler node --input-type=module -e 'import {readFileSync} from "node:fs"; import {parseCrontab} from "./ops/production/scheduler.mjs"; console.log(parseCrontab(readFileSync("./ops/production/scheduler.crontab","utf8")).map(j=>j.task));'
systemctl is-enabled ngaturi-reconcile-doku-payments.timer
systemctl is-active ngaturi-reconcile-doku-payments.timer
sudo docker inspect --format '{{json .Config.Healthcheck}}' $(dc ps -q app)
dc logs --since 15m --tail 200 scheduler app
sudo cat /var/lib/ngaturi-deploy/units.json
sudo readlink /home/okee/ngaturi/.active-release
```

Expect app running/healthy, exactly one running scheduler with no increasing restart count, and only these effective UTC cron entries (comments aside):

```cron
0 1 * * * lock-expired-edits
30 1 * * * archive-expired
```

The parser accepts exactly those schedules. No `reconcile-doku-payments` schedule or new five-minute reconciliation loop may appear. The legacy timer must remain `disabled` and `inactive` (those `systemctl` results intentionally have nonzero exit status). Both containers stay running. The scheduler preflight calls `/api/health` only when a daily task is due; the app Docker probe calls it every ten seconds. This endpoint is DB-free. `/api/ready` checks PostgreSQL/Redis and must remain a bounded deployment/recovery-only gate. Never use readiness or reconciliation as recurring uptime probes. Old pre-deploy log entries do not indicate a current loop.

## Payment regression and Neon acceptance

First perform one controlled Sumopod checkout on a dedicated invitation using the existing configured environment. Confirm the server-derived amount/currency and pending state. Complete through Sumopod and receive its actual verified webhook, then use legitimate provider redelivery for the same event. Confirm one transition/fulfillment, paid state, entitlement/quota granted exactly once, and duplicate `transitioned:false`/`fulfilled:false`. Do not change webhook verification, synthesize a production success, or mutate the pre-existing pending payment. A `payment.test` connectivity event alone does not prove fulfillment. Local tests are not live provider acceptance.

Then stop intentional application traffic, close pages polling APIs and stop manual SQL queries. **Wait at least ten minutes**, and longer than the configured Neon suspend window if necessary, after the final regression/readiness activity. In Neon Console verify production compute becomes **Idle/Inactive**, and the **Rows metrics no longer show periodic UPDATE spikes approximately every five minutes**. Inspect scheduler logs over that same window: there must be no five-minute reconciliation attempts. Do not poll PostgreSQL to prove idleness, since doing so wakes compute. Avoid the daily 01:00/01:30 UTC jobs (08:00/08:30 WIB) during this quiet window.

VM evidence cannot prove Cloudflare Worker, Vercel or external uptime ownership. Verify those dashboards/configurations separately after deployment, including that DEV Worker/legacy jobs do not target production DB or production reconciliation/readiness. The repository's DEV Worker still declares a five-minute trigger. No remote configuration is changed by this patch. Daily maintenance, actual users/webhooks and deliberate deployment/recovery checks can still wake Neon.

## Payment recovery behavior retained

The protected legacy-named reconciliation route remains available manually. Only providers with explicit status capability are selected (currently DOKU); Sumopod relies on verified webhooks and never performs status lookup. Existing permanent conditions are excluded without rewriting metadata; newly discovered permanent errors are recorded once as non-retryable. Ambiguous payments remain pending without authoritative evidence. HTTP 200 covers successful/no-work/skipped/review outcomes; genuine transient/internal failures retain 5xx. No supported work causes no payment mutation, but manual selection can still wake PostgreSQL. This release adds no schema migration or Redis queue and does not alter payment verification, idempotency or fulfillment.
