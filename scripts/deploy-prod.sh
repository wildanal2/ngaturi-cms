#!/usr/bin/env bash
set -euo pipefail
umask 077

die() { printf 'deploy: %s\n' "$*" >&2; exit 1; }
log() { printf 'deploy: %s\n' "$*" >&2; }

image=${1:-}
[[ $# -eq 1 ]] || die 'usage: deploy-prod.sh ghcr.io/owner/package@sha256:<64 hex characters>'
[[ $image =~ ^ghcr\.io/[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._/-]*@sha256:[0-9a-f]{64}$ ]] || die 'image must be an exact lowercase GHCR sha256 digest reference'

: "${RUNTIME_ENV_FILE:?Set RUNTIME_ENV_FILE to one absolute external runtime env file}"
[[ $RUNTIME_ENV_FILE = /* && -f $RUNTIME_ENV_FILE ]] || die 'RUNTIME_ENV_FILE must name an existing absolute file'

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
compose_file=${NGATURI_COMPOSE_FILE:-"$script_dir/../compose.prod.yml"}
[[ -f $compose_file ]] || die 'compose.prod.yml is missing'
state_dir=${NGATURI_DEPLOY_STATE_DIR:-/var/lib/ngaturi-deploy}
mkdir -p -- "$state_dir"
exec 9>"$state_dir/deploy.lock"
flock -n 9 || die 'another deployment is running'

export NGATURI_BIND_IP=${NGATURI_BIND_IP:-127.0.0.1}
export NGATURI_HOST_PORT=${NGATURI_HOST_PORT:-8080}
export NGATURI_CONTAINER_PORT=${NGATURI_CONTAINER_PORT:-8080}
[[ $NGATURI_HOST_PORT =~ ^[0-9]{1,5}$ && $NGATURI_CONTAINER_PORT =~ ^[0-9]{1,5}$ ]] || die 'ports must be numeric'
(( NGATURI_HOST_PORT >= 1 && NGATURI_HOST_PORT <= 65535 && NGATURI_CONTAINER_PORT >= 1 && NGATURI_CONTAINER_PORT <= 65535 )) || die 'ports must be between 1 and 65535'

probe_host=${NGATURI_PROBE_HOST:-$NGATURI_BIND_IP}
[[ $probe_host = 0.0.0.0 ]] && probe_host=127.0.0.1
[[ $probe_host =~ ^[a-zA-Z0-9.:-]+$ ]] || die 'invalid probe host'
probe_attempts=${NGATURI_PROBE_ATTEMPTS:-30}
[[ $probe_attempts =~ ^[0-9]{1,3}$ ]] || die 'NGATURI_PROBE_ATTEMPTS must be numeric'
(( probe_attempts >= 1 && probe_attempts <= 120 )) || die 'NGATURI_PROBE_ATTEMPTS must be between 1 and 120'

compose() {
  docker compose --env-file /dev/null -f "$compose_file" "$@"
}

probe() {
  local path=$1 attempt
  for ((attempt=1; attempt<=probe_attempts; attempt++)); do
    if curl --noproxy '*' --fail --silent --output /dev/null --max-time 3 \
      "http://$probe_host:$NGATURI_HOST_PORT$path"; then
      return 0
    fi
    (( attempt == probe_attempts )) || sleep 2
  done
  return 1
}

write_state() {
  local target=$1 value=$2 temporary
  temporary=$(mktemp "$state_dir/.${target}.XXXXXX")
  printf '%s\n' "$value" > "$temporary"
  mv -f -- "$temporary" "$state_dir/$target"
}

old_image=
if [[ -f $state_dir/current ]]; then
  IFS= read -r old_image < "$state_dir/current" || true
  [[ $old_image =~ ^ghcr\.io/[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._/-]*@sha256:[0-9a-f]{64}$ ]] || die 'stored current image reference is invalid'
fi

export NGATURI_IMAGE=$image
compose config --quiet || die 'production Compose configuration is invalid'
log 'pulling exact image digest'
docker pull "$image"
log 'starting candidate'
if ! compose up -d --no-build --force-recreate; then
  log 'candidate startup failed'
else
  if probe /api/health && probe /api/ready; then
    if [[ -n $old_image && $old_image != "$image" ]]; then
      write_state previous "$old_image"
    elif [[ -z $old_image ]]; then
      rm -f -- "$state_dir/previous"
    fi
    write_state current "$image"
    log 'health and readiness passed; digest recorded'
    exit 0
  fi
  log 'candidate failed health or readiness gate'
fi

if [[ -n $old_image ]]; then
  log 'restoring previous known-good digest'
  export NGATURI_IMAGE=$old_image
  if compose up -d --no-build --force-recreate && probe /api/health && probe /api/ready; then
    log 'rollback health and readiness passed'
  else
    log 'rollback failed; operator intervention required'
  fi
else
  log 'no previous known-good digest; stopping failed candidate'
  compose stop || true
fi
exit 1
