#!/usr/bin/env bash
set -euo pipefail
repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
fixture=$(mktemp -d)
trap 'rm -rf -- "$fixture"' EXIT
mkdir -p "$fixture/bin" "$fixture/state"
printf 'CRON_SECRET=fixture-secret\n' > "$fixture/runtime.env"
real_docker=$(command -v docker)
package=ghcr.io/wildanal2/ngaturi-cms
image_a="$package@sha256:$(printf 'a%.0s' {1..64})"
image_b="$package@sha256:$(printf 'b%.0s' {1..64})"
image_c="$package@sha256:$(printf 'c%.0s' {1..64})"
export NGATURI_IMAGE=$image_a NGATURI_BIND_IP=127.0.0.1 NGATURI_PORT=18080
export NGATURI_PROJECT_NAME=ngaturi-tooling-fixture RUNTIME_ENV_FILE="$fixture/runtime.env"
export DEPLOY_STATE_DIR="$fixture/state" SCHEDULER_ENABLED=false PROBE_ATTEMPTS=1
export DEPLOY_CONFIG_FILE="$fixture/deploy.env"

printf 'production checks: shell syntax and Compose rendering\n'
bash -n "$repo_dir/ops/production/"*.sh
"$real_docker" compose --env-file /dev/null -f "$repo_dir/ops/production/compose.yml" --profile scheduler config --format json > "$fixture/render.json"
node --input-type=module - "$fixture/render.json" <<'JS'
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const c=JSON.parse(readFileSync(process.argv[2]));
assert.equal(c.services.app.image,process.env.NGATURI_IMAGE);
assert.equal(c.services.scheduler.image,c.services.app.image);
assert.equal(c.services.app.build,undefined);
assert.equal(c.services.app.volumes,undefined);
assert.equal(c.services.app.init,true);
assert.equal(c.services.app.environment.PORT,'8080');
assert.equal(c.services.app.ports[0].target,8080);
assert.equal(c.services.scheduler.depends_on.app.condition,'service_healthy');
assert.deepEqual(c.services.scheduler.profiles,['scheduler']);
assert.equal(c.services.scheduler.container_name,process.env.NGATURI_PROJECT_NAME+'-scheduler');
assert.equal(c.networks.default.driver,'bridge');
JS

cat > "$fixture/bin/docker" <<'MOCK'
#!/usr/bin/env bash
printf '%s %s\n' "${NGATURI_IMAGE:-}" "$*" >> "$TEST_LOG"
if [[ $1 == buildx ]]; then
  printf '%s\n' "$4" > "$TEST_RESOLVED_REF"
  [[ ${FAIL_RESOLVE:-false} != true ]] || exit 1
  printf '%s\n' "$RESOLVED_DIGEST"
elif [[ $1 == pull ]]; then
  [[ $2 != "${FAIL_PULL_IMAGE:-none}" ]]
elif [[ $1 == inspect ]]; then
  printf '%s\n' "${TEST_SCHEDULER_STATUS:-running}"
elif [[ $* == *'stop scheduler'* && ${FAIL_DRAIN:-false} == true ]]; then exit 1
elif [[ $* == *'--force-recreate app'* ]]; then
  [[ ${NGATURI_IMAGE:-} != "${FAIL_START_IMAGE:-none}" ]]
elif [[ $* == *'ps -q scheduler'* ]]; then printf 'fixture-container\n'
fi
MOCK
cat > "$fixture/bin/curl" <<'MOCK'
#!/usr/bin/env bash
if [[ $* == *'/api/ready'* && ${NGATURI_IMAGE:-} == "${FAIL_READY_IMAGE:-none}" ]]; then
  printf '503'
else printf '200'; fi
MOCK
cat > "$fixture/bin/ip" <<'MOCK'
#!/usr/bin/env bash
if [[ ! -f $TEST_ADDRESS_CHECK ]]; then touch "$TEST_ADDRESS_CHECK"; else
  printf '1: eth0 inet %s/24 scope global eth0\n' "$NGATURI_BIND_IP"
fi
MOCK
cat > "$fixture/bin/sleep" <<'MOCK'
#!/usr/bin/env bash
exit 0
MOCK
chmod +x "$fixture/bin/"*
export PATH="$fixture/bin:$PATH" TEST_LOG="$fixture/calls.log"
export TEST_ADDRESS_CHECK="$fixture/address-checked" TEST_RESOLVED_REF="$fixture/resolved-ref" RESOLVED_DIGEST=${image_a#*@}
deploy="$repo_dir/ops/production/deploy.sh"
rollback="$repo_dir/ops/production/rollback.sh"
reject() { if "$@" >/dev/null 2>&1; then printf 'unexpected success: %s\n' "$*" >&2; exit 1; fi; }
state() { sed -n "s/^$1=//p" "$DEPLOY_STATE_DIR/releases.env"; }

for target in latest stable sha-a1b2c3d sha-invalid sha-$(printf 'A%.0s' {1..40}) "${image_a}" v01.2.3 1.2.3 v1.2 v1.2.3-beta 'v1.2.3;false' "$package:latest" ghcr.io/other/image@sha256:$(printf 'a%.0s' {1..64}); do reject "$deploy" "$target"; done
[[ ! -s $TEST_LOG ]]
reject "$rollback"
reject "$rollback" v1.0.0

"$deploy" --dry-run v0.1.0 > "$fixture/dry-run"
grep -Fq "image=$image_a" "$fixture/dry-run"
[[ ! -f $DEPLOY_STATE_DIR/releases.env && ! -f $DEPLOY_STATE_DIR/compose.env ]]
export FAIL_RESOLVE=true
reject "$deploy" v0.1.0
unset FAIL_RESOLVE
export RESOLVED_DIGEST=invalid
reject "$deploy" v0.1.0
export RESOLVED_DIGEST=${image_a#*@}

# Failed first deployment never establishes a known-good release.
export FAIL_READY_IMAGE=$image_a
reject "$deploy" v0.1.0
[[ ! -f $DEPLOY_STATE_DIR/releases.env && ! -f $DEPLOY_STATE_DIR/compose.env ]]
grep -Fq 'stop app' "$TEST_LOG"
unset FAIL_READY_IMAGE
"$deploy" v0.1.0
[[ $(state CURRENT_IMAGE) == "$image_a" && $(state CURRENT_VERSION) == v0.1.0 && -z $(state PREVIOUS_IMAGE) ]]
grep -Fq "NGATURI_IMAGE=$image_a" "$DEPLOY_STATE_DIR/compose.env"

export FAIL_READY_IMAGE=$image_b
reject "$deploy" "${image_b#*@}"
[[ $(state CURRENT_IMAGE) == "$image_a" && -z $(state PREVIOUS_IMAGE) ]]
grep -Fq "NGATURI_IMAGE=$image_a" "$DEPLOY_STATE_DIR/compose.env"
unset FAIL_READY_IMAGE
export FAIL_START_IMAGE=$image_b
reject "$deploy" "${image_b#*@}"
[[ $(state CURRENT_IMAGE) == "$image_a" ]]
unset FAIL_START_IMAGE

export RESOLVED_DIGEST=${image_b#*@}
"$deploy" v0.2.0
[[ $(state CURRENT_IMAGE) == "$image_b" && $(state PREVIOUS_IMAGE) == "$image_a" && $(state PREVIOUS_VERSION) == v0.1.0 ]]
"$deploy" "${image_b#*@}"
[[ $(state CURRENT_VERSION) == v0.2.0 && $(state PREVIOUS_IMAGE) == "$image_a" ]]
export FAIL_READY_IMAGE=$image_a
reject "$rollback"
[[ $(state CURRENT_IMAGE) == "$image_b" && $(state PREVIOUS_IMAGE) == "$image_a" ]]
unset FAIL_READY_IMAGE
"$rollback"
[[ $(state CURRENT_IMAGE) == "$image_a" && $(state PREVIOUS_IMAGE) == "$image_b" && $(state CURRENT_VERSION) == v0.1.0 ]]

# Pull failure and failure to drain scheduler leave the running app/state alone.
: > "$TEST_LOG"
export FAIL_PULL_IMAGE=$image_c
reject "$deploy" "${image_c#*@}"
unset FAIL_PULL_IMAGE
[[ $(state CURRENT_IMAGE) == "$image_a" ]]
! grep -Fq -- '--force-recreate app' "$TEST_LOG"
: > "$TEST_LOG"
export FAIL_DRAIN=true
reject "$deploy" "${image_c#*@}"
unset FAIL_DRAIN
! grep -Fq -- '--force-recreate app' "$TEST_LOG"

# A concurrent operator cannot change state or the runtime.
( flock -n 9; reject "$deploy" "${image_c#*@}" ) 9>"$DEPLOY_STATE_DIR/deploy.lock"

# Recovery waits for DHCP, recreates the recorded image, and never pulls.
: > "$TEST_LOG"
"$deploy" --recover
[[ -f $TEST_ADDRESS_CHECK ]]
! grep -Eq '^.* pull ' "$TEST_LOG"
[[ $(state CURRENT_IMAGE) == "$image_a" ]]
export FAIL_READY_IMAGE=$image_a
reject "$deploy" --recover
unset FAIL_READY_IMAGE

# Scheduler is opt-in; failed startup restores current, success drains first.
export SCHEDULER_ENABLED=true TEST_SCHEDULER_STATUS=restarting
reject "$deploy" "${image_b#*@}"
[[ $(state CURRENT_IMAGE) == "$image_a" ]]
export TEST_SCHEDULER_STATUS=running
: > "$TEST_LOG"
"$deploy" "${image_b#*@}"
[[ $(state CURRENT_IMAGE) == "$image_b" ]]
[[ $(state CURRENT_SCHEDULER_ENABLED) == true && $(state PREVIOUS_SCHEDULER_ENABLED) == false ]]
"$rollback"
[[ $(state CURRENT_SCHEDULER_ENABLED) == false && $(state CURRENT_IMAGE) == "$image_a" ]]
"$deploy" --recover
[[ $(state CURRENT_SCHEDULER_ENABLED) == false ]]
node --input-type=module - "$TEST_LOG" <<'JS'
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const calls=readFileSync(process.argv[2],'utf8').split('\n');
assert(calls.findIndex(x=>x.includes('stop scheduler'))<calls.findIndex(x=>x.includes('--force-recreate app')));
assert(calls.findIndex(x=>x.includes('--force-recreate app'))<calls.findIndex(x=>x.includes('--force-recreate scheduler')));
assert(calls.filter(x=>x.includes(' pull ')).every(x=>/pull ghcr\.io\/wildanal2\/ngaturi-cms@sha256:[a-f0-9]{64}$/.test(x)));
JS

# A full Staging SHA resolves to a digest, records candidate identity, and rolls back.
export SCHEDULER_ENABLED=false RESOLVED_DIGEST=${image_c#*@}
candidate_tag="sha-$(printf 'c%.0s' {1..40})"
"$deploy" --dry-run "$candidate_tag" > "$fixture/candidate-dry-run"
[[ $(cat "$TEST_RESOLVED_REF") == "$package:$candidate_tag" ]]
grep -Fq "image=$image_c" "$fixture/candidate-dry-run"
"$deploy" "$candidate_tag"
[[ $(state CURRENT_VERSION) == "$candidate_tag" && $(state CURRENT_IMAGE) == "$image_c" ]]
[[ $(state PREVIOUS_IMAGE) == "$image_a" ]]
"$deploy" "${image_c#*@}"
[[ $(state CURRENT_VERSION) == "$candidate_tag" ]]
"$rollback"
[[ $(state CURRENT_IMAGE) == "$image_a" && $(state PREVIOUS_VERSION) == "$candidate_tag" ]]
"$rollback"
[[ $(state CURRENT_IMAGE) == "$image_c" && $(state CURRENT_VERSION) == "$candidate_tag" ]]

# Import existing candidate records without losing rollback identity.
rm "$DEPLOY_STATE_DIR/releases.env"
printf '%s\n' "$image_a" > "$DEPLOY_STATE_DIR/current"
printf '%s\n' "$image_b" > "$DEPLOY_STATE_DIR/previous"
"$deploy" "${image_a#*@}"
[[ $(state CURRENT_IMAGE) == "$image_a" && $(state PREVIOUS_IMAGE) == "$image_b" ]]
printf 'CURRENT_IMAGE=%s:latest\n' "$package" > "$DEPLOY_STATE_DIR/releases.env"
reject "$rollback"
reject "$deploy" "${image_c#*@}"
printf 'production Compose, version/digest, deploy, rollback, recovery and state checks passed\n'
