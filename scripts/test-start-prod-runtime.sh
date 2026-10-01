#!/usr/bin/env bash
set -euo pipefail
repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
fixture=$(mktemp -d)
trap 'rm -rf -- "$fixture"' EXIT
mkdir -p "$fixture/bin" "$fixture/state"
: > "$fixture/runtime.env"
cat > "$fixture/bin/ip" <<'MOCK'
#!/usr/bin/env bash
if [[ ! -f $TEST_FIRST_ADDRESS_CHECK ]]; then
  touch "$TEST_FIRST_ADDRESS_CHECK"
  printf '[]\n'
else
  touch "$TEST_ADDRESS_READY"
  printf '[{"addr_info":[{"local":"203.0.113.20"}]}]\n'
fi
MOCK
cat > "$fixture/bin/docker" <<'MOCK'
#!/usr/bin/env bash
[[ -f $TEST_ADDRESS_READY ]]
printf '%s %s\n' "${NGATURI_IMAGE:-}" "$*" >> "$TEST_LOG"
MOCK
cat > "$fixture/bin/curl" <<'MOCK'
#!/usr/bin/env bash
exit "${TEST_PROBE_EXIT:-0}"
MOCK
cat > "$fixture/bin/sleep" <<'MOCK'
#!/usr/bin/env bash
exit 0
MOCK
chmod +x "$fixture/bin/"*
export PATH="$fixture/bin:$PATH" TEST_LOG="$fixture/calls.log" TEST_FIRST_ADDRESS_CHECK="$fixture/address-checked" TEST_ADDRESS_READY="$fixture/address-ready"
export RUNTIME_ENV_FILE="$fixture/runtime.env" NGATURI_DEPLOY_STATE_DIR="$fixture/state" NGATURI_BIND_IP=203.0.113.20
export NGATURI_COMPOSE_FILE="$repo_dir/compose.prod.yml"
image="ghcr.io/example/ngaturi@sha256:$(printf 'a%.0s' {1..64})"
printf '%s\n' "$image" > "$fixture/state/current"
bash "$repo_dir/scripts/start-prod-runtime.sh"
calls=$(< "$TEST_LOG")
[[ $calls == *"$image compose --env-file /dev/null"* ]]
[[ $calls == *"--no-build --pull never --force-recreate app"* ]]
[[ $(cat "$fixture/state/current") == "$image" ]]
export TEST_PROBE_EXIT=22
if bash "$repo_dir/scripts/start-prod-runtime.sh" >/dev/null 2>&1; then
  printf 'readiness failure was accepted\n' >&2; exit 1
fi
unset TEST_PROBE_EXIT
: > "$TEST_LOG"
printf 'ghcr.io/example/ngaturi:latest\n' > "$fixture/state/current"
if bash "$repo_dir/scripts/start-prod-runtime.sh" >/dev/null 2>&1; then exit 1; fi
[[ ! -s $TEST_LOG ]]
printf 'boot address wait, exact digest, cached image, and readiness checks passed\n'
