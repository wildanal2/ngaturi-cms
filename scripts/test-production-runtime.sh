#!/usr/bin/env bash
set -euo pipefail
repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
fixture=$(mktemp -d)
trap 'rm -rf -- "$fixture"' EXIT
mkdir -p "$fixture/state"
printf 'CRON_SECRET=fixture-secret\n' > "$fixture/runtime.env"
real_docker=$(command -v docker)
package=ghcr.io/wildanal2/ngaturi-cms
image_a="$package@sha256:$(printf 'a%.0s' {1..64})"
export NGATURI_IMAGE=$image_a NGATURI_BIND_IP=127.0.0.1 NGATURI_PORT=18080
export NGATURI_PROJECT_NAME=ngaturi-tooling-fixture RUNTIME_ENV_FILE="$fixture/runtime.env"
export DEPLOY_STATE_DIR="$fixture/state" SCHEDULER_ENABLED=true PROBE_ATTEMPTS=1

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
assert(c.services.app.healthcheck.test.join(' ').includes('/api/health'));
assert(!c.services.app.healthcheck.test.join(' ').includes('/api/ready'));
assert.equal(c.services.scheduler.healthcheck,undefined);
for (const file of ['scheduler.mjs','scheduler.crontab']) {
  const mount=c.services.scheduler.volumes.find(x=>x.target==='/app/ops/production/'+file);
  assert(mount && mount.read_only, 'Current runner and schedule must survive image rollback together');
}
assert.equal(c.services.scheduler.depends_on.app.condition,'service_healthy');
assert.deepEqual(c.services.scheduler.profiles,['scheduler']);
assert.equal(c.services.scheduler.container_name,process.env.NGATURI_PROJECT_NAME+'-scheduler');
assert.equal(c.networks.default.driver,'bridge');
JS

# Lifecycle/interrupt tests use a disposable filesystem and mocked Docker backend only.
python3 "$repo_dir/scripts/production-runtime.test.py"
printf 'production Compose, release-unit, deploy, rollback and interruption checks passed\n'
