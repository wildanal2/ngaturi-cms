#!/usr/bin/env bash
set -euo pipefail
umask 077

die() { printf 'deploy: %s\n' "$*" >&2; exit 1; }
log() { printf 'deploy: %s\n' "$*" >&2; }
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
mode=deploy
if [[ ${1:-} == --dry-run ]]; then mode=dry-run; shift; fi
if [[ ${1:-} == --rollback || ${1:-} == --recover ]]; then
  [[ $mode == deploy && $# -eq 1 ]] || die 'invalid arguments'
  mode=${1#--}; shift
else
  [[ $# -eq 1 ]] || die 'usage: ./deploy.sh [--dry-run] vX.Y.Z | sha-<full 40-hex commit> | sha256:<digest>'
fi
target=${1:-}

# Parse deployment data as literal values, never source it as shell code.
config_file=${DEPLOY_CONFIG_FILE:-"$script_dir/deploy.env"}
if [[ -f $config_file ]]; then
  while IFS= read -r line || [[ -n $line ]]; do
    [[ -z $line || $line == \#* ]] && continue
    [[ $line == *=* ]] || die 'invalid deploy.env line'
    key=${line%%=*}; value=${line#*=}
    case $key in
      NGATURI_PACKAGE|NGATURI_PROJECT_NAME|NGATURI_BIND_IP|NGATURI_PORT|RUNTIME_ENV_FILE|DEPLOY_STATE_DIR|SCHEDULER_ENABLED|PROBE_ATTEMPTS) ;;
      *) die "unknown deploy.env key: $key" ;;
    esac
    if [[ ! -v $key ]]; then printf -v "$key" '%s' "$value"; fi
  done < "$config_file"
fi
export NGATURI_PACKAGE=${NGATURI_PACKAGE:-ghcr.io/wildanal2/ngaturi-cms}
export NGATURI_PROJECT_NAME=${NGATURI_PROJECT_NAME:-ngaturi-prod}
export NGATURI_BIND_IP=${NGATURI_BIND_IP:-192.168.88.4}
export NGATURI_PORT=${NGATURI_PORT:-3009}
export RUNTIME_ENV_FILE=${RUNTIME_ENV_FILE:-/etc/ngaturi/ngaturi.env}
export DEPLOY_STATE_DIR=${DEPLOY_STATE_DIR:-/var/lib/ngaturi-deploy}
export SCHEDULER_ENABLED=${SCHEDULER_ENABLED:-false}
PROBE_ATTEMPTS=${PROBE_ATTEMPTS:-30}

[[ $NGATURI_PACKAGE =~ ^ghcr\.io/[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*$ ]] || die 'invalid configured GHCR package'
[[ $NGATURI_PROJECT_NAME =~ ^[a-z0-9][a-z0-9_-]{0,62}$ ]] || die 'invalid Compose project name'
[[ $NGATURI_BIND_IP =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] || die 'bind IP must be IPv4'
IFS=. read -r -a octets <<< "$NGATURI_BIND_IP"
for octet in "${octets[@]}"; do (( 10#$octet <= 255 )) || die 'invalid bind IP'; done
[[ $NGATURI_PORT =~ ^[1-9][0-9]{0,4}$ ]] && (( NGATURI_PORT <= 65535 )) || die 'invalid port'
[[ $PROBE_ATTEMPTS =~ ^[1-9][0-9]?$ ]] && (( PROBE_ATTEMPTS <= 60 )) || die 'PROBE_ATTEMPTS must be 1..60'
[[ $SCHEDULER_ENABLED == true || $SCHEDULER_ENABLED == false ]] || die 'SCHEDULER_ENABLED must be true or false'
[[ $RUNTIME_ENV_FILE = /* && -f $RUNTIME_ENV_FILE ]] || die 'external runtime env file is missing'
[[ $DEPLOY_STATE_DIR = /* && $DEPLOY_STATE_DIR != / && $DEPLOY_STATE_DIR != *$'\n'* ]] || die 'state directory must be an absolute path'

version_ok() { [[ $1 == unknown || $1 =~ ^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ || $1 =~ ^sha-[0-9a-f]{40}$ ]]; }
image_ok() { [[ $1 == "$NGATURI_PACKAGE"@sha256:* && ${1#*@} =~ ^sha256:[0-9a-f]{64}$ ]]; }
compose() { timeout --signal=TERM --kill-after=10s 300s docker compose --env-file /dev/null -f "$script_dir/compose.yml" -p "$NGATURI_PROJECT_NAME" "$@"; }
pull() { timeout --signal=TERM --kill-after=10s 180s docker pull "$1"; }

if [[ $mode != dry-run ]]; then
  mkdir -p -- "$DEPLOY_STATE_DIR"
  exec 9>"$DEPLOY_STATE_DIR/deploy.lock"
  flock -n 9 || die 'another deploy/rollback/recovery is running'
fi

CURRENT_VERSION=unknown CURRENT_IMAGE= PREVIOUS_VERSION=unknown PREVIOUS_IMAGE=
CURRENT_SCHEDULER_ENABLED=false PREVIOUS_SCHEDULER_ENABLED=false
if [[ -f $DEPLOY_STATE_DIR/releases.env ]]; then
  declare -A state_keys=()
  while IFS= read -r line || [[ -n $line ]]; do
    [[ $line == *=* ]] || die 'invalid release state'
    key=${line%%=*}; value=${line#*=}
    case $key in
      CURRENT_VERSION|CURRENT_IMAGE|PREVIOUS_VERSION|PREVIOUS_IMAGE|CURRENT_SCHEDULER_ENABLED|PREVIOUS_SCHEDULER_ENABLED)
        [[ ! -v state_keys[$key] ]] || die 'duplicate release state key'
        printf -v "$key" '%s' "$value"; state_keys[$key]=1 ;;
      *) die 'invalid release state key' ;;
    esac
  done < "$DEPLOY_STATE_DIR/releases.env"
  [[ ${#state_keys[@]} -eq 6 ]] || die 'incomplete release state'
  [[ -n $CURRENT_IMAGE ]] || die 'release state has no current digest'
else
  # Read-only import of the Phase 5/6A digest records, on first successful use.
  if [[ -f $DEPLOY_STATE_DIR/current ]]; then IFS= read -r CURRENT_IMAGE < "$DEPLOY_STATE_DIR/current" || true; fi
  if [[ -f $DEPLOY_STATE_DIR/previous ]]; then IFS= read -r PREVIOUS_IMAGE < "$DEPLOY_STATE_DIR/previous" || true; fi
fi
version_ok "$CURRENT_VERSION" && version_ok "$PREVIOUS_VERSION" || die 'invalid stored version'
[[ $CURRENT_SCHEDULER_ENABLED == true || $CURRENT_SCHEDULER_ENABLED == false ]] || die 'invalid current scheduler state'
[[ $PREVIOUS_SCHEDULER_ENABLED == true || $PREVIOUS_SCHEDULER_ENABLED == false ]] || die 'invalid previous scheduler state'
[[ -z $CURRENT_IMAGE ]] || image_ok "$CURRENT_IMAGE" || die 'invalid current digest'
[[ -z $PREVIOUS_IMAGE ]] || image_ok "$PREVIOUS_IMAGE" || die 'invalid previous digest'
[[ -n $CURRENT_IMAGE || -z $PREVIOUS_IMAGE ]] || die 'previous exists without current'

candidate_version=unknown
case $mode in
  rollback)
    [[ -n $PREVIOUS_IMAGE ]] || die 'no previous known-good digest recorded'
    candidate_image=$PREVIOUS_IMAGE; candidate_version=$PREVIOUS_VERSION
    export SCHEDULER_ENABLED=$PREVIOUS_SCHEDULER_ENABLED ;;
  recover)
    [[ -n $CURRENT_IMAGE ]] || die 'no known-good digest recorded'
    candidate_image=$CURRENT_IMAGE; candidate_version=$CURRENT_VERSION
    export SCHEDULER_ENABLED=$CURRENT_SCHEDULER_ENABLED ;;
  *)
    if [[ $target =~ ^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ || $target =~ ^sha-[0-9a-f]{40}$ ]]; then
      candidate_version=$target
      digest=$(timeout --signal=TERM --kill-after=5s 30s docker buildx imagetools inspect "$NGATURI_PACKAGE:$target" --format '{{.Manifest.Digest}}') || die 'version/candidate resolution failed'
      [[ $digest =~ ^sha256:[0-9a-f]{64}$ ]] || die 'registry returned an invalid digest'
      candidate_image="$NGATURI_PACKAGE@$digest"
    elif [[ $target =~ ^sha256:[0-9a-f]{64}$ ]]; then candidate_image="$NGATURI_PACKAGE@$target"
    else die 'expected vX.Y.Z, sha-<full 40-hex commit>, or sha256:<digest>; direct stable/latest and image names are rejected'; fi ;;
esac
export NGATURI_IMAGE=$candidate_image
compose config --quiet || die 'invalid production Compose configuration'
if [[ $mode == dry-run ]]; then
  printf 'version=%s\nimage=%s\nproject=%s\nscheduler=%s\n' "$candidate_version" "$candidate_image" "$NGATURI_PROJECT_NAME" "$SCHEDULER_ENABLED"
  exit 0
fi

atomic_write() {
  local destination=$1 temporary
  temporary=$(mktemp "$DEPLOY_STATE_DIR/.state.XXXXXX")
  cat > "$temporary"
  mv -f -- "$temporary" "$DEPLOY_STATE_DIR/$destination"
}
record_runtime() {
  printf 'NGATURI_IMAGE=%s\nNGATURI_PROJECT_NAME=%s\nNGATURI_BIND_IP=%s\nNGATURI_PORT=%s\nRUNTIME_ENV_FILE=%s\nSCHEDULER_ENABLED=%s\n' \
    "$NGATURI_IMAGE" "$NGATURI_PROJECT_NAME" "$NGATURI_BIND_IP" "$NGATURI_PORT" "$RUNTIME_ENV_FILE" "$SCHEDULER_ENABLED" | atomic_write compose.env
}
probe_host=$NGATURI_BIND_IP
[[ $probe_host != 0.0.0.0 ]] || probe_host=127.0.0.1
probe() {
  local path=$1 attempt code
  for ((attempt=1; attempt<=PROBE_ATTEMPTS; attempt++)); do
    code=$(curl --noproxy '*' --silent --output /dev/null --max-time 4 --write-out '%{http_code}' "http://$probe_host:$NGATURI_PORT$path") || code=000
    [[ $code != 200 ]] || return 0
    (( attempt == PROBE_ATTEMPTS )) || sleep 2
  done
  return 1
}
gate() { probe /api/health && probe /api/ready; }
wait_address() {
  local attempt
  [[ $NGATURI_BIND_IP != 0.0.0.0 ]] || return 0
  for ((attempt=1; attempt<=30; attempt++)); do
    if ip -4 -o address show | awk '{split($4,a,"/"); print a[1]}' | grep -Fxq "$NGATURI_BIND_IP"; then return 0; fi
    sleep 2
  done
  die 'configured bind address unavailable after 60 seconds'
}
start_app() { compose up -d --no-build --pull never --wait --wait-timeout 90 --force-recreate app; }
stop_scheduler() { compose --profile scheduler stop scheduler; }
start_scheduler() {
  if [[ $SCHEDULER_ENABLED == true ]]; then
    compose --profile scheduler up -d --no-build --pull never --no-deps --force-recreate scheduler || return 1
    local cid status
    sleep 2
    cid=$(compose --profile scheduler ps -q scheduler) || return 1
    [[ -n $cid ]] || return 1
    status=$(timeout 10s docker inspect --format '{{.State.Status}}' "$cid") || return 1
    [[ $status == running ]]
  fi
}

if [[ $mode == recover ]]; then wait_address; else
  log "pulling $candidate_image"
  pull "$candidate_image" || die 'candidate pull failed; running release unchanged'
fi
# Pull the fallback before changing anything, so automatic restoration is safe.
if [[ $mode != recover && -n $CURRENT_IMAGE && $CURRENT_IMAGE != "$candidate_image" ]]; then
  pull "$CURRENT_IMAGE" || die 'fallback pull failed; running release unchanged'
fi
printf 'VERSION=%s\nIMAGE=%s\n' "$candidate_version" "$candidate_image" | atomic_write candidate.env

restore() {
  trap - INT TERM ERR
  log 'candidate failed; restoring known-good runtime'
  if ! stop_scheduler; then log 'could not drain scheduler; manual intervention required'; return 1; fi
  if [[ -n $CURRENT_IMAGE ]]; then
    export NGATURI_IMAGE=$CURRENT_IMAGE
    export SCHEDULER_ENABLED=$CURRENT_SCHEDULER_ENABLED
    record_runtime
    if start_app && gate && start_scheduler; then log 'rollback health/readiness passed'; else
      stop_scheduler || true
      log 'rollback failed; manual intervention required'
    fi
  else
    compose stop app || true
    rm -f -- "$DEPLOY_STATE_DIR/compose.env"
    log 'no known-good release; failed candidate stopped'
  fi
}
trap 'restore; exit 130' INT
trap 'restore; exit 143' TERM
trap 'trap - ERR; restore; exit 1' ERR
if ! stop_scheduler; then die 'cannot drain scheduler; app was not replaced'; fi
record_runtime
log 'starting candidate; gating health and readiness'
if start_app && gate && start_scheduler; then
  if [[ $mode != recover ]]; then
    if [[ -n $CURRENT_IMAGE && $CURRENT_IMAGE != "$candidate_image" ]]; then
      PREVIOUS_IMAGE=$CURRENT_IMAGE; PREVIOUS_VERSION=$CURRENT_VERSION
      PREVIOUS_SCHEDULER_ENABLED=$CURRENT_SCHEDULER_ENABLED
    fi
    # A digest-only redeploy preserves an already known release version.
    if [[ $candidate_image == "$CURRENT_IMAGE" && $candidate_version == unknown ]]; then candidate_version=$CURRENT_VERSION; fi
    printf 'CURRENT_VERSION=%s\nCURRENT_IMAGE=%s\nPREVIOUS_VERSION=%s\nPREVIOUS_IMAGE=%s\nCURRENT_SCHEDULER_ENABLED=%s\nPREVIOUS_SCHEDULER_ENABLED=%s\n' \
      "$candidate_version" "$candidate_image" "$PREVIOUS_VERSION" "$PREVIOUS_IMAGE" "$SCHEDULER_ENABLED" "$PREVIOUS_SCHEDULER_ENABLED" | atomic_write releases.env
  fi
  trap - INT TERM ERR
  log "health/readiness passed; current=$candidate_image"
  exit 0
fi
restore
exit 1
