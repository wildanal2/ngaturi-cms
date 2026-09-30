#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
fixture=$(mktemp -d)
trap 'rm -rf -- "$fixture"' EXIT
mkdir -p "$fixture/bin" "$fixture/state"
: > "$fixture/runtime.env"

cat > "$fixture/bin/docker" <<'MOCK'
#!/usr/bin/env bash
printf '%s %s\n' "${NGATURI_IMAGE:-}" "$*" >> "$TEST_LOG"
MOCK
cat > "$fixture/bin/curl" <<'MOCK'
#!/usr/bin/env bash
if [[ $* == *'/api/ready'* && ${NGATURI_IMAGE:-} == "${FAIL_READY_IMAGE:-none}" ]]; then exit 22; fi
exit 0
MOCK
chmod +x "$fixture/bin/docker" "$fixture/bin/curl"

export PATH="$fixture/bin:$PATH"
export TEST_LOG="$fixture/calls.log"
export RUNTIME_ENV_FILE="$fixture/runtime.env"
export NGATURI_COMPOSE_FILE="$repo_dir/compose.prod.yml"
export NGATURI_DEPLOY_STATE_DIR="$fixture/state"
export NGATURI_PROBE_ATTEMPTS=1

image_a="ghcr.io/example/ngaturi@sha256:$(printf 'a%.0s' {1..64})"
image_b="ghcr.io/example/ngaturi@sha256:$(printf 'b%.0s' {1..64})"

if "$repo_dir/scripts/deploy-prod.sh" 'ghcr.io/example/ngaturi:latest' 2>/dev/null; then
  printf 'mutable tag was accepted\n' >&2; exit 1
fi
[[ ! -s $TEST_LOG ]] || { printf 'invalid image reached Docker\n' >&2; exit 1; }

"$repo_dir/scripts/deploy-prod.sh" "$image_a"
[[ $(cat "$fixture/state/current") == "$image_a" ]]
[[ ! -e $fixture/state/previous ]]

export FAIL_READY_IMAGE=$image_b
if "$repo_dir/scripts/deploy-prod.sh" "$image_b"; then
  printf 'failed readiness was accepted\n' >&2; exit 1
fi
[[ $(cat "$fixture/state/current") == "$image_a" ]]
[[ ! -e $fixture/state/previous ]]
rg -F "$image_a" "$TEST_LOG" >/dev/null

unset FAIL_READY_IMAGE
"$repo_dir/scripts/deploy-prod.sh" "$image_b"
[[ $(cat "$fixture/state/current") == "$image_b" ]]
[[ $(cat "$fixture/state/previous") == "$image_a" ]]

"$repo_dir/scripts/deploy-prod.sh" "$image_a"
[[ $(cat "$fixture/state/current") == "$image_a" ]]
[[ $(cat "$fixture/state/previous") == "$image_b" ]]
printf 'deployment digest, readiness, and rollback checks passed\n'
