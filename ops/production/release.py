#!/usr/bin/env python3
"""Host-side release-unit controller. No application/DB clients or third-party packages."""
import argparse
from contextlib import contextmanager
import fcntl
import hashlib
import io
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import tarfile
import tempfile
import time
import uuid

RUNTIME = Path('/home/okee/ngaturi')
STATE = Path('/var/lib/ngaturi-deploy')
PACKAGE = 'ghcr.io/wildanal2/ngaturi-cms'
BASELINE_VERSION = 'v1.1.0'
BASELINE_DIGEST = 'sha256:996375272d57a49aeae3d0e6af464e1d9329acc680b8f4e39e93f6ed74b7406d'
BASELINE_REVISION = '8c2afb2ae19587e0d2c01e68b1b8df036d9d424f'
# Pinned read-only VM audit evidence. Fail closed if the bootstrap installation drifted.
BASELINE_HASHES = {
    'compose.yml': 'f88203be1032942beed9aa499663db706618b4c5ce8e04d0cc6b20cb25c183be',
    'deploy.sh': '1bf7cbdff852253768a04ff4ca1600057a18d4d9ecff1578e52f9cdacfc17546',
    'rollback.sh': 'bc2338b7f0557b40a7c2852a4ddb24747351fabbbc30cebb61de630af28e2709',
    'scheduler.mjs': 'ee8cf955c18eb6b350c50aef270ae57fbb9c4d1acc3cbc41b35e0894207ac5f9',
    'scheduler.crontab': '48b5ac7b3c062a35905d11484a776f840bd435da06813248d094189800410056',
    'ngaturi-runtime.service': '1ed7b8662280b9a8ea39ee420e4e19dd4d7f692ec5cfc1d67165c199c8a0ea35',
}
FILES = tuple(sorted((*BASELINE_HASHES, 'release.py', 'deploy.env.example', 'README.md', 'GIT_RELEASE.md')))
DAILY = ['0 1 * * * lock-expired-edits', '30 1 * * * archive-expired']
CONFIG_KEYS = {'NGATURI_PACKAGE', 'NGATURI_PROJECT_NAME', 'NGATURI_BIND_IP', 'NGATURI_PORT',
               'RUNTIME_ENV_FILE', 'DEPLOY_STATE_DIR', 'SCHEDULER_ENABLED', 'PROBE_ATTEMPTS'}


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def ops_hash(files):
    return sha(''.join(f'{name}\0{files[name]}\n' for name in sorted(files)).encode())


def unit_identifier(manifest):
    identity = sha(json.dumps(manifest, sort_keys=True, separators=(',', ':')).encode())
    return manifest['git_tag'] + '-' + manifest['digest'][7:19] + '-' + identity[:12]


def literal_env(path):
    result = {}
    for line in path.read_text().splitlines():
        if not line or line.startswith('#'):
            continue
        key, separator, value = line.partition('=')
        require(separator and key not in result, 'invalid/duplicate deployment state key')
        result[key] = value
    return result


def sync_directory(path):
    fd = os.open(path, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def atomic_bytes(path, data, mode=0o600):
    fd, temporary = tempfile.mkstemp(prefix='.write-', dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(temporary, mode)
        os.replace(temporary, path)
        sync_directory(path.parent)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def atomic_json(path, value):
    atomic_bytes(path, (json.dumps(value, sort_keys=True, indent=2) + '\n').encode())


def atomic_link(path, target):
    temporary = path.parent / ('.link-' + uuid.uuid4().hex)
    temporary.symlink_to(target)
    os.replace(temporary, path)
    sync_directory(path.parent)


def read_artifact(path):
    require(path.is_file(), 'required release ops artifact is missing')
    with tarfile.open(path, 'r:gz') as archive:
        members = archive.getmembers()
        expected = set(FILES) | {'release-manifest.json'}
        require(len(members) == len(expected) and {m.name for m in members} == expected,
                'artifact has missing, duplicate, or unexpected files')
        require(all(m.isfile() and m.size < 2_000_000 for m in members), 'unsafe artifact member')
        payload = {m.name: archive.extractfile(m).read() for m in members}
    manifest = json.loads(payload.pop('release-manifest.json'))
    validate_payload(manifest, payload)
    return manifest, payload


def validate_payload(manifest, payload):
    require(manifest.get('deployment_protocol') == 1, 'incompatible deployment protocol')
    require(manifest.get('release_type') == 'release', 'production requires an official release artifact')
    tag = manifest.get('git_tag', '')
    require(re.fullmatch(r'v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)', tag), 'invalid release tag')
    require(tuple(map(int, tag[1:].split('.'))) > (1, 1, 0), 'release predates the safe deployment baseline')
    require(re.fullmatch(r'[0-9a-f]{40}', manifest.get('git_sha', '')), 'invalid release revision')
    require(manifest.get('ghcr_image') == PACKAGE, 'unexpected image package')
    require(re.fullmatch(r'sha256:[0-9a-f]{64}', manifest.get('digest', '')), 'invalid immutable digest')
    require(manifest.get('image') == PACKAGE + '@' + manifest['digest'], 'image/digest mismatch')
    hashes = {name: sha(data) for name, data in payload.items()}
    require(set(hashes) == set(FILES) and hashes == manifest.get('ops_files'), 'ops file checksum mismatch')
    require(ops_hash(hashes) == manifest.get('ops_sha256'), 'ops manifest checksum mismatch')
    lines = [line.strip() for line in payload['scheduler.crontab'].decode().splitlines()
             if line.strip() and not line.lstrip().startswith('#')]
    require(sorted(lines) == sorted(DAILY), 'scheduler must contain exactly the two daily jobs')
    require('reconcile-doku-payments' not in payload['scheduler.mjs'].decode(), 'runner still permits reconciliation')


def package(metadata, output, source):
    manifest = json.loads(metadata.read_text())
    manifest['deployment_protocol'] = 1
    payload = {name: (source / name).read_bytes() for name in FILES}
    manifest['ops_files'] = {name: sha(data) for name, data in payload.items()}
    # CI's registry-validated image label already commits to this exact ops content.
    validate_payload(manifest, payload)
    payload['release-manifest.json'] = (json.dumps(manifest, sort_keys=True, indent=2) + '\n').encode()
    with tarfile.open(output, 'w:gz') as archive:
        for name, data in sorted(payload.items()):
            member = tarfile.TarInfo(name)
            member.size = len(data)
            member.mode = 0o755 if name.endswith('.sh') else 0o644
            archive.addfile(member, io.BytesIO(data))
    atomic_json(metadata, manifest)


class Docker:
    def command(self, args, env=None, allowed=(0,), timeout=300, strip=True):
        result = subprocess.run(args, env=env, capture_output=True, text=True, timeout=timeout)
        require(result.returncode in allowed, args[0] + ' command failed (details withheld)')
        return result.stdout.strip() if strip else result.stdout

    def verify_image(self, manifest, bootstrap=False):
        if bootstrap:
            config = json.loads(self.command(['docker', 'image', 'inspect', manifest['image']]))[0]
            labels = config['Config'].get('Labels') or {}
            platform = (config['Os'], config['Architecture'])
        else:
            tagged = self.command(['docker', 'buildx', 'imagetools', 'inspect', PACKAGE + ':' + manifest['git_tag'],
                                   '--format', '{{.Manifest.Digest}}'], timeout=60)
            require(tagged == manifest['digest'], 'registry tag and release artifact digest differ')
            config = json.loads(self.command(['docker', 'buildx', 'imagetools', 'inspect',
                                             manifest['image'], '--format', '{{json .Image}}'], timeout=60))
            labels = config['config'].get('Labels') or {}
            platform = (config['os'], config['architecture'])
        require(platform == ('linux', 'amd64'), 'image platform mismatch')
        require(labels.get('org.opencontainers.image.revision') == manifest['git_sha'], 'image/release revision mismatch')
        require(labels.get('org.opencontainers.image.source') == 'https://github.com/wildanal2/ngaturi-cms', 'image source mismatch')
        if not bootstrap:
            require(labels.get('com.ngaturi.ops-sha256') == manifest['ops_sha256'], 'image/ops release checksum mismatch')

    def owners(self, image):
        ids = self.command(['docker', 'ps', '-q']).split()
        containers = json.loads(self.command(['docker', 'inspect', *ids])) if ids else []
        ours = [c for c in containers if 'ngaturi' in (c['Name'] + c['Config']['Image']).lower()]
        require({c['Name'].lstrip('/') for c in ours} == {'ngaturi-prod-app-1', 'ngaturi-prod-scheduler'}
                and len(ours) == 2, 'expected exactly one production app and scheduler; duplicate/unknown owner')
        require(all(c['Config']['Image'] == image for c in ours), 'running image differs from current release state')
        for c in ours:
            labels = c['Config'].get('Labels') or {}
            require(labels.get('com.docker.compose.project') == 'ngaturi-prod', 'unexpected Compose owner')
            require(labels.get('com.docker.compose.project.config_files') == str(RUNTIME / 'compose.yml'), 'unexpected runtime directory/owner')

    def legacy_inactive(self):
        for action in ['is-active', 'is-enabled']:
            value = self.command(['systemctl', action, 'ngaturi-reconcile-doku-payments.timer'], allowed=(0, 1, 3, 4))
            require(value in ('inactive', 'disabled', 'masked', 'not-found', ''), 'legacy scheduler is active/enabled')

    def pull(self, image):
        self.command(['docker', 'pull', image], timeout=180)

    def compose(self, root, config, image, *args, file=None):
        environment = {**os.environ, **config, 'NGATURI_IMAGE': image}
        # No operator environment can override the recorded release configuration.
        return self.command(['docker', 'compose', '--env-file', '/dev/null', '--project-directory', str(root),
                             '-f', str(file or root / 'compose.yml'), '-p', 'ngaturi-prod', '--profile', 'scheduler', *args], environment)

    def validate_compose(self, root, directory, config, manifest):
        value = json.loads(self.compose(root, config, manifest['image'], 'config', '--format', 'json', file=directory / 'compose.yml'))
        app, scheduler = value['services']['app'], value['services']['scheduler']
        require(app['image'] == scheduler['image'] == manifest['image'] and not app.get('build'), 'Compose image mismatch')
        require(scheduler.get('container_name') == 'ngaturi-prod-scheduler', 'scheduler must have its fixed singleton name')
        check = ' '.join(app['healthcheck']['test'])
        require('/api/health' in check and '/api/ready' not in check, 'recurring healthcheck must be DB-free')
        require(not scheduler.get('healthcheck'), 'unexpected scheduler dependency probe')
        require(not app.get('volumes'), 'unexpected application mount')
        mounts = {Path(m['target']).name: m for m in scheduler.get('volumes', [])}
        needed = ['scheduler.crontab'] if manifest.get('bootstrap') else ['scheduler.mjs', 'scheduler.crontab']
        for name in needed:
            require(name in mounts and mounts[name].get('read_only') and mounts[name]['source'] == str(root / name),
                    'scheduler runner/crontab mount mismatch')

    def stop(self, root, config, image, service):
        self.compose(root, config, image, 'stop', service)

    def start(self, root, config, image, service):
        args = ['up', '-d', '--no-build', '--pull', 'never', '--force-recreate']
        args += ['--wait', '--wait-timeout', '90'] if service == 'app' else ['--no-deps']
        self.compose(root, config, image, *args, service)

    def gate(self, config):
        host = config['NGATURI_BIND_IP']
        if host == '0.0.0.0':
            host = '127.0.0.1'
        for path in ['/api/health', '/api/ready']:
            for attempt in range(int(config['PROBE_ATTEMPTS'])):
                result = subprocess.run(['curl', '--noproxy', '*', '--silent', '--output', '/dev/null',
                                         '--max-time', '4', '--write-out', '%{http_code}',
                                         f'http://{host}:{config["NGATURI_PORT"]}{path}'], capture_output=True, text=True, timeout=6)
                if result.returncode == 0 and result.stdout == '200':
                    break
                if attempt + 1 == int(config['PROBE_ATTEMPTS']):
                    raise RuntimeError('bounded deployment readiness failed')
                time.sleep(2)

    def verify_started(self, manifest):
        time.sleep(2)
        self.owners(manifest['image'])
        app, scheduler = json.loads(self.command(['docker', 'inspect', 'ngaturi-prod-app-1', 'ngaturi-prod-scheduler']))
        require(app['State'].get('Health', {}).get('Status') == 'healthy', 'application is not healthy')
        require(scheduler['State']['Status'] == 'running', 'scheduler is not running')
        actual = self.command(['docker', 'exec', 'ngaturi-prod-scheduler', 'cat', '/app/ops/production/scheduler.crontab'], strip=False)
        require(sha(actual.encode()) == manifest['ops_files']['scheduler.crontab'], 'effective mounted scheduler differs from release')

    def wait_address(self, config):
        if config['NGATURI_BIND_IP'] == '0.0.0.0':
            return
        for _ in range(30):
            addresses = self.command(['ip', '-4', '-o', 'address', 'show'])
            if any(word.split('/')[0] == config['NGATURI_BIND_IP'] for word in addresses.split()):
                return
            time.sleep(2)
        raise RuntimeError('configured host bind address unavailable after 60 seconds')


class Manager:
    def __init__(self, root=RUNTIME, state=STATE, backend=None, *, expected_runtime=RUNTIME, baseline_hashes=None):
        self.root, self.state = Path(root), Path(state)
        self.expected_runtime = Path(expected_runtime)
        self.backend = backend or Docker()
        self.baseline_hashes = BASELINE_HASHES if baseline_hashes is None else baseline_hashes

    def location(self):
        require(self.root.resolve() == self.expected_runtime and Path.cwd().resolve() == self.expected_runtime,
                'production runtime directory must be /home/okee/ngaturi (repository ops/production is source only)')

    @contextmanager
    def locked(self):
        self.location()
        require(self.state.is_dir(), 'production state directory missing')
        with (self.state / 'deploy.lock').open('a') as lock:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                raise RuntimeError('another deploy/rollback/recovery is running') from None
            yield

    def config(self):
        values = literal_env(self.root / 'deploy.env')
        require(set(values) <= CONFIG_KEYS, 'unknown deployment configuration key')
        defaults = dict(NGATURI_PACKAGE=PACKAGE, NGATURI_PROJECT_NAME='ngaturi-prod', NGATURI_BIND_IP='192.168.88.4',
                        NGATURI_PORT='3009', RUNTIME_ENV_FILE='/etc/ngaturi/ngaturi.env',
                        DEPLOY_STATE_DIR=str(self.state), SCHEDULER_ENABLED='true', PROBE_ATTEMPTS='30')
        config = defaults | values
        require(config['NGATURI_PACKAGE'] == PACKAGE and config['NGATURI_PROJECT_NAME'] == 'ngaturi-prod', 'unexpected production identity')
        require(config['DEPLOY_STATE_DIR'] == str(self.state), 'unexpected deployment state directory')
        require(config['SCHEDULER_ENABLED'] == 'true', 'production app and scheduler must both remain running')
        require(re.fullmatch(r'\d{1,3}(\.\d{1,3}){3}', config['NGATURI_BIND_IP']) and
                all(int(x) <= 255 for x in config['NGATURI_BIND_IP'].split('.')), 'invalid bind address')
        require(config['NGATURI_PORT'].isdigit() and 1 <= int(config['NGATURI_PORT']) <= 65535, 'invalid port')
        require(config['PROBE_ATTEMPTS'].isdigit() and 1 <= int(config['PROBE_ATTEMPTS']) <= 60, 'invalid probe bound')
        require(Path(config['RUNTIME_ENV_FILE']).is_absolute() and Path(config['RUNTIME_ENV_FILE']).is_file(), 'runtime environment file missing')
        return config

    def read_state(self):
        state = json.loads((self.state / 'units.json').read_text())
        require(state.get('schema') == 1, 'unsupported release state schema')
        return state

    def verify_root(self, identifier):
        directory, manifest, _ = self.unit(identifier)
        require((self.root / '.active-release').resolve() == directory, 'active release pointer differs from state')
        for name, digest in manifest['ops_files'].items():
            if name not in ['deploy.sh', 'rollback.sh', 'release.py']:
                require((self.root / name).resolve() == directory / name and sha((self.root / name).read_bytes()) == digest,
                        'active ops files differ from selected release: ' + name)

    def unit(self, identifier):
        require(re.fullmatch(r'[a-zA-Z0-9._-]+', identifier or ''), 'invalid release unit identifier')
        directory = self.state / 'units' / identifier
        record = json.loads((directory / 'unit.json').read_text())
        manifest = record['manifest']
        require(unit_identifier(manifest) == identifier, 'stored release identity changed')
        hashes = {name: sha((directory / name).read_bytes()) for name in manifest['ops_files']}
        require(hashes == manifest['ops_files'], 'stored release files changed')
        require(sha((directory / 'runtime-config.json').read_bytes()) == record['config_sha256'], 'stored runtime configuration changed')
        if manifest.get('bootstrap'):
            require(manifest['git_tag'] == BASELINE_VERSION and manifest['digest'] == BASELINE_DIGEST and
                    manifest['image'] == PACKAGE + '@' + BASELINE_DIGEST and manifest['git_sha'] == BASELINE_REVISION and
                    all(hashes.get(k) == v for k, v in self.baseline_hashes.items()), 'unsafe bootstrap fallback')
        else:
            validate_payload(manifest, {name: (directory / name).read_bytes() for name in FILES})
        return directory, manifest, json.loads((directory / 'runtime-config.json').read_text())

    def save_unit(self, manifest, payload, config):
        identifier = unit_identifier(manifest)
        parent = self.state / 'units'
        parent.mkdir(parents=True, exist_ok=True)
        destination = parent / identifier
        if not destination.exists():
            temporary = Path(tempfile.mkdtemp(prefix='.unit-', dir=parent))
            for name, data in payload.items():
                atomic_bytes(temporary / name, data, 0o755 if name.endswith('.sh') else 0o644)
            atomic_json(temporary / 'runtime-config.json', config)
            atomic_json(temporary / 'unit.json', {'manifest': manifest, 'config_sha256': sha((temporary / 'runtime-config.json').read_bytes())})
            os.rename(temporary, destination)
            sync_directory(parent)
        self.unit(identifier)
        require(json.loads((destination / 'unit.json').read_text())['manifest'] == manifest,
                'immutable release unit identity collision')
        require(json.loads((destination / 'runtime-config.json').read_text()) == config,
                'same release unit cannot be redeployed with different runtime configuration')
        return identifier

    def bootstrap(self, config):
        legacy = literal_env(self.state / 'releases.env')
        require(legacy.get('CURRENT_VERSION') == BASELINE_VERSION and legacy.get('CURRENT_IMAGE') == PACKAGE + '@' + BASELINE_DIGEST
                and legacy.get('CURRENT_SCHEDULER_ENABLED') == 'true', 'current production release cannot be identified as audited v1.1.0')
        for name, digest in self.baseline_hashes.items():
            require((self.root / name).is_file() and sha((self.root / name).read_bytes()) == digest, 'audited v1.1.0 ops changed: ' + name)
        names = set(self.baseline_hashes) | {'README.md', 'GIT_RELEASE.md'}
        payload = {name: (self.root / name).read_bytes() for name in names}
        manifest = dict(bootstrap=True, git_tag=BASELINE_VERSION, git_sha=BASELINE_REVISION, digest=BASELINE_DIGEST,
                        image=PACKAGE + '@' + BASELINE_DIGEST, ops_files={name: sha(data) for name, data in payload.items()})
        self.backend.verify_image(manifest, bootstrap=True)
        self.backend.owners(manifest['image'])
        return manifest, payload

    def compatibility_state(self, current, previous):
        _, manifest, config = self.unit(current)
        _, old, _ = self.unit(previous)
        values = dict(CURRENT_VERSION=manifest['git_tag'], CURRENT_IMAGE=manifest['image'], PREVIOUS_VERSION=old['git_tag'],
                      PREVIOUS_IMAGE=old['image'], CURRENT_SCHEDULER_ENABLED='true', PREVIOUS_SCHEDULER_ENABLED='true')
        atomic_bytes(self.state / 'releases.env', ''.join(f'{k}={v}\n' for k, v in values.items()).encode())
        values = {**config, 'NGATURI_IMAGE': manifest['image']}
        atomic_bytes(self.state / 'compose.env', ''.join(f'{k}={v}\n' for k, v in values.items()).encode())
        atomic_bytes(self.state / 'current', (manifest['image'] + '\n').encode())
        atomic_bytes(self.state / 'previous', (old['image'] + '\n').encode())

    def controller(self, identifier):
        directory, manifest, _ = self.unit(identifier)
        require(not manifest.get('bootstrap'), 'cannot install a legacy deployment controller')
        # Keep a guarded management entry point even when the application rolls back to legacy v1.1.0.
        # The original scripts remain intact inside its complete immutable release snapshot.
        atomic_link(self.state / 'controller', directory)
        for name in ['deploy.sh', 'rollback.sh']:
            atomic_link(self.root / name, self.state / 'controller' / name)

    def activate(self, identifier):
        directory, manifest, config = self.unit(identifier)
        atomic_link(self.root / '.active-release', directory)
        for name in set(FILES) - set(manifest['ops_files']) - {'deploy.sh', 'rollback.sh', 'release.py'}:
            path = self.root / name
            if path.is_symlink() and os.readlink(path) == str(Path('.active-release') / name):
                path.unlink()
        for name in manifest['ops_files']:
            if name not in ['deploy.sh', 'rollback.sh', 'release.py']:
                atomic_link(self.root / name, Path('.active-release') / name)
        return manifest, config

    def start(self, identifier):
        manifest, config = self.activate(identifier)
        self.backend.start(self.root, config, manifest['image'], 'app')
        self.backend.gate(config)
        self.backend.start(self.root, config, manifest['image'], 'scheduler')
        self.backend.verify_started(manifest)

    def stop(self, identifier):
        _, manifest, config = self.unit(identifier)
        self.backend.stop(self.root, config, manifest['image'], 'scheduler')
        self.backend.stop(self.root, config, manifest['image'], 'app')

    def restore(self, transaction):
        self.stop(transaction['from'])
        if not self.unit(transaction['from'])[1].get('bootstrap'):
            self.controller(transaction['from'])
        self.compatibility_state(transaction['from'], transaction['before']['previous'])
        self.start(transaction['from'])
        atomic_json(self.state / 'units.json', transaction['before'])
        (self.state / 'pending.json').unlink()
        sync_directory(self.state)

    def transition(self, state, target):
        # Both snapshots are fully checked before stopping either service.
        for identifier in {state['current'], state['previous'], target}:
            directory, manifest, config = self.unit(identifier)
            self.backend.validate_compose(self.root, directory, config, manifest)
        transaction = dict(id=uuid.uuid4().hex, before=state, **{'from': state['current'], 'to': target})
        atomic_json(self.state / 'pending.json', transaction)
        try:
            if not self.unit(target)[1].get('bootstrap'):
                self.controller(target)
            self.stop(state['current'])
            previous = state['current'] if target != state['current'] else state['previous']
            self.compatibility_state(target, previous)
            self.start(target)
            self.backend.legacy_inactive()
            committed = dict(schema=1, current=target, previous=previous, transaction=transaction['id'])
            atomic_json(self.state / 'units.json', committed)
        except Exception:
            try:
                self.restore(transaction)
            except Exception:
                raise RuntimeError('restoration incomplete; pending journal retained; run guarded --recover') from None
            raise
        (self.state / 'pending.json').unlink()
        sync_directory(self.state)

    def recover(self, state):
        self.backend.wait_address(self.unit(state['current'])[2])
        journal = self.state / 'pending.json'
        if journal.exists():
            transaction = json.loads(journal.read_text())
            if state.get('transaction') != transaction['id']:
                self.restore(transaction)
                return
            # Commit already durable: finish recovery of that complete unit.
        self.transition(state, state['current'])

    def execute(self, target=None, artifact=None, mode='deploy', dry_run=False):
        self.location()
        config = self.config()
        require((self.state / 'releases.env').is_file(), 'current production release cannot be identified')
        if mode == 'deploy':
            require(artifact is not None, 'release ops artifact required; image-only deployment is forbidden')
            manifest, payload = read_artifact(Path(artifact))
            require(target in (manifest['git_tag'], manifest['digest']), 'target and ops release identity differ')
            self.backend.verify_image(manifest)
            with tempfile.TemporaryDirectory(prefix='ngaturi-preflight-') as temporary:
                directory = Path(temporary)
                for name, data in payload.items():
                    (directory / name).write_bytes(data)
                self.backend.validate_compose(self.root, directory, config, manifest)
        managed = (self.state / 'units.json').is_file()
        if managed:
            state = self.read_state()
            for identifier in [state['current'], state['previous']]:
                self.unit(identifier)
            if mode != 'recover':
                require(not (self.state / 'pending.json').exists(), 'interrupted transaction; run --recover first')
                self.verify_root(state['current'])
                self.backend.owners(self.unit(state['current'])[1]['image'])
        else:
            require(mode == 'deploy', 'first prepare the audited v1.1.0 fallback with a release artifact')
            baseline, original = self.bootstrap(config)
        self.backend.legacy_inactive()
        if dry_run:
            print(json.dumps({'target': target, 'runtime': str(self.root), 'image': manifest['image'],
                              'ops_sha256': manifest['ops_sha256'], 'fallback': self.unit(state['current'])[1]['git_tag'] if managed else BASELINE_VERSION}))
            return
        # Only after all read-only guards pass do we stage state/cache artifacts.
        if mode != 'recover':
            self.backend.pull(manifest['image'] if mode == 'deploy' else self.unit(state['previous'])[1]['image'])
            self.backend.pull(self.unit(state['current'])[1]['image'] if managed else baseline['image'])
        if not managed:
            baseline_id = self.save_unit(baseline, original, config)
            state = dict(schema=1, current=baseline_id, previous=baseline_id)
            atomic_json(self.state / 'units.json', state)
            # Retire v1.0.0 before touching either running container.
            self.compatibility_state(baseline_id, baseline_id)
        if mode == 'deploy':
            target_id = self.save_unit(manifest, payload, config)
            self.controller(target_id)
        elif mode == 'rollback':
            target_id = state['previous']
        else:
            self.recover(state)
            return
        self.transition(state, target_id)
        print('release-unit ' + mode + ' passed; app and scheduler are running')


def handle_interrupt(_signal, _frame):
    raise InterruptedError('deployment interrupted')


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser()
    parser.add_argument('target', nargs='?')
    parser.add_argument('--artifact', type=Path)
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--rollback', action='store_true')
    parser.add_argument('--recover', action='store_true')
    parser.add_argument('--package', action='store_true')
    parser.add_argument('--metadata', type=Path)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    if args.package:
        require(args.metadata and args.output, 'package needs metadata and output')
        package(args.metadata, args.output, Path(__file__).resolve().parent)
        return
    require(not (args.rollback and args.recover), 'invalid operation')
    require(not ((args.rollback or args.recover) and (args.target or args.artifact or args.dry_run)), 'invalid recovery arguments')
    manager = Manager()
    manager.location()
    # Existing state directory/lock are required; no runtime mutation on a failed preflight.
    with manager.locked():
        signal.signal(signal.SIGTERM, handle_interrupt)
        signal.signal(signal.SIGINT, handle_interrupt)
        manager.execute(args.target, args.artifact, 'rollback' if args.rollback else 'recover' if args.recover else 'deploy', args.dry_run)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('deploy: ' + str(error), file=sys.stderr)
        sys.exit(1)
