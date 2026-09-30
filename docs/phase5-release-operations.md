# Phase 5 release operations

The `container-release` workflow validates pull requests without publishing. A
manual dispatch and future pushes to `main` publish one
`linux/amd64` image to `ghcr.io/<repository owner>/<repository name>`, tagged
`sha-<full commit SHA>`. The workflow uploads `release-manifest.json` with the
authoritative `image@sha256:<digest>` reference. A tag is only a lookup aid;
never deploy by tag. The workflow does not deploy to any VM.

GitHub only accepts `workflow_dispatch` for a workflow present on the default
branch. While this workflow exists only on the feature branch, a push of a
commit whose message contains `[publish-image]` triggers the one-time release
validation publication on `feat/cloudflare-staging-migration`. Ordinary branch
pushes do not publish. Remove this bootstrap branch trigger after the workflow
is merged to `main`; manual dispatch then works normally.

## VM release bundle and environment

Install only `compose.prod.yml` and `scripts/deploy-prod.sh` (and, later,
`scripts/run-prod-cron.sh`) in `/opt/ngaturi-release`. The VM does not need
the application source, Node, `npm`, or a Docker build context. Docker Compose,
`curl`, and `flock` are required on the host.

Set `RUNTIME_ENV_FILE` to one absolute external file, for example
`/etc/ngaturi/ngaturi.env`. Make it readable only by the deployment operator
(`0600` recommended). This is the sole application secret source for the
production container. `docker compose --env-file /dev/null` prevents Compose
from loading a project `.env`; the production definition never refers to
`.dev.vars` or `.env.local`. Never pass secrets as build arguments or put the
runtime file inside the release bundle, image, or repository.

The optional host settings are `NGATURI_BIND_IP` (default `127.0.0.1`),
`NGATURI_HOST_PORT` (default `8080`), `NGATURI_CONTAINER_PORT` (default
`8080`), and `NGATURI_PROBE_HOST` (for a non-loopback bind). Use a host address
reachable by the future Cloudflare Tunnel. The app container runs as the
image's non-root user on normal Docker bridge networking, without source
mounts or persistent user-data volumes. State remains in Neon, R2, and
Upstash.

## Deploy and rollback

Set `RUNTIME_ENV_FILE` and run:

```sh
scripts/deploy-prod.sh 'ghcr.io/owner/repository@sha256:<64-hex-digest>'
```

The script rejects tag-only references. It pulls the exact digest, starts
the container, then checks `/api/health` and `/api/ready` with bounded retries.
Only a healthy, ready release is recorded in
`NGATURI_DEPLOY_STATE_DIR` (default `/var/lib/ngaturi-deploy`). Its `current`
and `previous` files contain only image references, never credentials. If a
candidate fails, the script restores the prior exact digest and checks both
probes again. A failed first deployment is stopped. A failed rollback requires
operator action. Deployment exit status is nonzero after any failed candidate.

For a manual rollback, read the `previous` file, inspect the exact digest,
then invoke `deploy-prod.sh` with that full reference. The deployment lock
prevents concurrent updates. Keep the previous image accessible in GHCR and
on the VM. This simple single-container update has a brief restart window.

Schema migrations are a separately controlled operator step or job. The
deployment script and container startup never run `db:push`, migrations,
seeds, `npm install`, or a build. Plan backward-compatible schema changes
before promoting a digest.

## Scheduler and legacy deployment

`ops/cron.prod.example` is intentionally inactive. In Phase 6, install its
entries only after disabling the old schedulers. The host helper locks each
task with `flock`, bounds execution to 250 seconds, and calls the existing
protected HTTP routes from inside the container using its runtime
`CRON_SECRET`. Logs contain task names and HTTP status, not the bearer token.
The existing schedules are Vercel edit locking at 01:00 UTC, Vercel archive
at 01:30 UTC, and Worker DOKU reconciliation every five minutes. The
repository also has a legacy local reconciliation helper.

The current `.github/workflows/deploy.yml` still deploys Vercel production
on `main` pushes. `vercel.json` disables Vercel's separate Git deployment
for `main`, but its cron entries remain. Before the Phase 6 merge/cutover,
disable or remove that workflow and retire old Vercel/Worker schedules in a
controlled sequence. The new container workflow only publishes to GHCR and
does not deploy to PROD.
