#!/usr/bin/env bash
# Inactive until the Phase 6B scheduler cutover. Invoke from a host scheduler.
set -euo pipefail
umask 077

case ${1:-} in
  lock-expired-edits|archive-expired|reconcile-doku-payments) task=$1 ;;
  *) printf 'cron: expected lock-expired-edits, archive-expired, or reconcile-doku-payments\n' >&2; exit 2 ;;
esac
[[ $# -eq 1 ]] || exit 2
: "${RUNTIME_ENV_FILE:?Set RUNTIME_ENV_FILE to an absolute external runtime env file}"
[[ $RUNTIME_ENV_FILE = /* && -f $RUNTIME_ENV_FILE ]] || { printf 'cron: runtime env file is missing\n' >&2; exit 1; }

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
compose_file=${NGATURI_COMPOSE_FILE:-"$script_dir/../compose.prod.yml"}
state_dir=${NGATURI_DEPLOY_STATE_DIR:-/var/lib/ngaturi-deploy}
[[ -f $state_dir/current ]] || { printf 'cron: no deployed digest recorded\n' >&2; exit 1; }
IFS= read -r NGATURI_IMAGE < "$state_dir/current" || true
[[ $NGATURI_IMAGE =~ ^ghcr\.io/[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._/-]*@sha256:[0-9a-f]{64}$ ]] || { printf 'cron: invalid deployed digest\n' >&2; exit 1; }
export NGATURI_IMAGE

mkdir -p -- "$state_dir/cron-locks"
exec 9>"$state_dir/cron-locks/$task.lock"
if ! flock -n 9; then
  printf 'cron: %s already running; skipped\n' "$task"
  exit 0
fi

# The bearer secret stays inside the running container and never enters the host command line.
timeout --signal=TERM --kill-after=10s 250s \
  docker compose --env-file /dev/null -f "$compose_file" exec -T app \
  node -e '
    const task = process.argv[1];
    const secret = process.env.CRON_SECRET;
    if (!secret) { console.error("cron: CRON_SECRET is missing"); process.exit(1); }
    fetch(`http://127.0.0.1:${process.env.PORT || 8080}/api/cron/${task}`, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(240000),
    }).then(response => {
      console.log(JSON.stringify({ task, status: response.status }));
      if (!response.ok) process.exitCode = 1;
    }).catch(() => { console.error("cron: request failed"); process.exitCode = 1; });
  ' "$task"
