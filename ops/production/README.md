# Ngaturi production

**Flow:** feature → Staging candidate → main → Git tag `vX.Y.Z` → GHCR release → deploy resolved digest. See [Git & Release Flow](GIT_RELEASE.md). GitHub never deploys the VM. Each official release artifact includes image metadata and `ngaturi-production-ops.tar.gz`.

## Initial setup

The VM needs Docker Compose v2+, Docker Buildx (registry inspection), Bash, curl, flock, timeout and iproute2. Extract the ops artifact into `/opt/ngaturi` (no application checkout):

```sh
sudo mkdir -p /opt/ngaturi
sudo tar -xzf ngaturi-production-ops.tar.gz -C /opt/ngaturi
cd /opt/ngaturi
sudo cp -n deploy.env.example deploy.env
```

Edit `deploy.env` for the host. Create the external application secret file `/etc/ngaturi/ngaturi.env` with mode `0600`. For a private package, authenticate the same operator/root Docker account with `docker login ghcr.io` and a read-packages credential. Run commands below as that operator with Docker and state-directory access.

The existing VM has a DHCP bind-address race: replace its boot recovery unit with `ngaturi-runtime.service` in `/etc/systemd/system`, then `systemctl daemon-reload` and `systemctl enable ngaturi-runtime.service`. It uses the recorded digest and cached image, waits for the address, and runs no builds/pulls/migrations. Preserve the existing `ngaturi-ingress.service` firewall. Do not start the replacement during private-candidate review.

## Deploy

```sh
cd /opt/ngaturi
./deploy.sh --dry-run v1.2.0
./deploy.sh v1.2.0
# Candidate: ./deploy.sh sha-<full 40-character commit SHA>
# Exact artifact: ./deploy.sh sha256:<64 hex>
```

A version resolves through GHCR to an exact digest before pulling. Compose uses only that digest. Health and readiness must pass before current/previous records change. Failure restores the known-good digest and verifies it, or stops a failed first deployment. State is non-secret in `/var/lib/ngaturi-deploy`: `releases.env` records versions/digests atomically; `compose.env` records the active runtime; `candidate.env` records the attempted release. First use imports the old Phase 5 `current`/`previous` digest records. Database migrations remain a separate operator step. A release briefly restarts the app.

## Check

```sh
docker compose --env-file /var/lib/ngaturi-deploy/compose.env ps
docker compose --env-file /var/lib/ngaturi-deploy/compose.env logs -f app
docker compose --env-file /var/lib/ngaturi-deploy/compose.env --profile scheduler logs -f scheduler
```

## Rollback

```sh
./rollback.sh
```

Pulls and restores the previous exact digest and its scheduler activation state, then checks health/readiness before swapping current/previous. Failed rollback restores the current release. Schema changes must remain compatible with the previous image; no source rebuild or migration runs.

## Scheduler

One non-root Node runner in the same immutable image calls protected `http://app:8080/api/cron/...` endpoints with `CRON_SECRET`. UTC schedules: edit locking 01:00, archiving 01:30, reconciliation every five minutes. Per-task locks, 240-second deadlines, no immediate retries/catch-up, graceful drain, and bounded container logs. Uncertain request completion blocks that task until app and scheduler restart together; inspect logs before `./deploy.sh` redeploys the current digest.

`SCHEDULER_ENABLED=false` keeps the scheduler stopped. **Only at the separately approved cutover:** stop/drain old production schedulers (including disabled host timers), confirm one owner, set `SCHEDULER_ENABLED=true`, then redeploy the same digest. Never install `scheduler.crontab` into host cron. Deployment stops/drains the scheduler before replacing the app, and starts it only after health/readiness. Updating ops files alone never activates it.

## Version policy and secrets

Feature/PR = validation; Staging = SHA candidate; main = production-ready source. Only a strict Git tag `vX.Y.Z` reachable from main releases production. Git tags supply versions; `package.json.version` is package metadata. Version/SHA collisions fail; matching candidates/retries reuse their digest. `stable` moves after a complete official release and is not a deploy input. Normal production deploys use `vX.Y.Z`; the runtime identity is always the resolved digest.

Application secrets exist only in `/etc/ngaturi/ngaturi.env`, never in Git, deploy config, release artifacts or state. Update operation files by extracting the next ops artifact into `/opt/ngaturi`, retaining `deploy.env` and state. Phase 6B ingress/provider acceptance remains separately authorized.
