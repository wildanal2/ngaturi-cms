#!/usr/bin/env bash
# Boot recovery only: use the recorded digest and cached image, never build/pull.
set -euo pipefail
umask 077
: "${RUNTIME_ENV_FILE:?Set the one external runtime env file}"
: "${NGATURI_BIND_IP:?Set the host application IPv4 address}"
[[ $RUNTIME_ENV_FILE = /* && -f $RUNTIME_ENV_FILE ]] || { printf 'runtime: external env file missing\n' >&2; exit 1; }
state_dir=${NGATURI_DEPLOY_STATE_DIR:-/var/lib/ngaturi-deploy}
[[ -f $state_dir/current ]] || { printf 'runtime: no deployed digest recorded\n' >&2; exit 1; }
IFS= read -r NGATURI_IMAGE < "$state_dir/current" || true
[[ $NGATURI_IMAGE =~ ^ghcr\.io/[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._/-]*@sha256:[0-9a-f]{64}$ ]] || { printf 'runtime: invalid recorded digest\n' >&2; exit 1; }
export NGATURI_IMAGE NGATURI_BIND_IP
export NGATURI_HOST_PORT=${NGATURI_HOST_PORT:-8080}

# network-online.target alone does not guarantee DHCP has assigned the bind IP.
python3 - <<'PY'
import ipaddress,json,os,subprocess,time
target=ipaddress.IPv4Address(os.environ['NGATURI_BIND_IP'])
if target.is_unspecified or target.is_multicast:
    raise SystemExit('runtime: a specific host IPv4 address is required')
if not os.environ['NGATURI_HOST_PORT'].isdigit() or not 1 <= int(os.environ['NGATURI_HOST_PORT']) <= 65535:
    raise SystemExit('runtime: invalid host port')
deadline=time.monotonic()+60
while time.monotonic()<deadline:
    interfaces=json.loads(subprocess.check_output(['ip','-j','-4','address','show'],timeout=3))
    if any(info.get('local')==str(target) for interface in interfaces for info in interface.get('addr_info',[])):
        break
    time.sleep(2)
else:
    raise SystemExit('runtime: host bind address unavailable after 60 seconds')
PY

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
compose_file=${NGATURI_COMPOSE_FILE:-"$script_dir/../compose.prod.yml"}
# Recreate only this application: a failed Docker boot bind can leave its
# existing container without network attachments even after a later start.
docker compose --env-file /dev/null -f "$compose_file" up -d --no-build --pull never --force-recreate app
for ((attempt=1; attempt<=12; attempt++)); do
  if curl --noproxy '*' --fail --silent --output /dev/null --max-time 3 "http://$NGATURI_BIND_IP:$NGATURI_HOST_PORT/api/health" &&
     curl --noproxy '*' --fail --silent --output /dev/null --max-time 3 "http://$NGATURI_BIND_IP:$NGATURI_HOST_PORT/api/ready"; then
    printf 'runtime: recorded image recovered; health and readiness passed\n'
    exit 0
  fi
  sleep 2
done
printf 'runtime: health/readiness recovery gate failed\n' >&2
exit 1
