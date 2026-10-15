"""Disposable filesystem + mocked Docker only. Never connects to the production VM."""
import importlib.util
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch

sys.dont_write_bytecode = True
REPO = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('ngaturi_release', REPO / 'ops/production/release.py')
r = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r)


class Crash(BaseException):
    pass


class FakeDocker(r.Docker):
    def __init__(self):
        self.images = {}
        self.tags = {}
        self.running = r.PACKAGE + '@' + r.BASELINE_DIGEST
        self.events = []
        self.failure = None
        self.duplicate = False
        self.legacy = False

    def command(self, args, env=None, **kwargs):
        if args[:3] == ['docker', 'image', 'inspect']:
            config = self.images[args[3]]
            return json.dumps([dict(Os='linux', Architecture='amd64', Config=config['config'])])
        if args[:4] == ['docker', 'buildx', 'imagetools', 'inspect']:
            if args[-1] == '{{.Manifest.Digest}}':
                return self.tags[args[4]]
            return json.dumps(self.images[args[4]])
        raise AssertionError('Unexpected external command: ' + str(args))

    def owners(self, image):
        r.require(not self.duplicate and self.running == image, 'duplicate owner or mismatched running image')

    def legacy_inactive(self):
        r.require(not self.legacy, 'legacy timer active')

    def pull(self, image):
        self.events.append(('pull', image))
        if self.failure == ('pull', image):
            raise RuntimeError('pull failed')

    def validate_compose(self, root, directory, config, manifest):
        r.require((directory / 'compose.yml').is_file(), 'missing compose')

    def stop(self, root, config, image, service):
        self.events.append(('stop', image, service))
        if self.failure == ('stop', service):
            raise RuntimeError('drain failed')

    def start(self, root, config, image, service):
        directory = (root / '.active-release').resolve()
        manifest = json.loads((directory / 'unit.json').read_text())['manifest']
        r.require(manifest['image'] == image, 'mixed image/ops runtime')
        for name in ['compose.yml', 'scheduler.mjs', 'scheduler.crontab']:
            r.require(r.sha((root / name).read_bytes()) == manifest['ops_files'][name], 'mixed scheduler/runtime files')
        self.events.append(('start', image, service, directory.name))
        self.running = image
        if self.failure and self.failure[:3] == ('start', image, service):
            failure = self.failure[3]
            self.failure = None
            raise failure

    def gate(self, config):
        self.events.append(('gate', self.running))
        if self.failure == ('gate', self.running):
            self.failure = None
            raise RuntimeError('readiness failed')

    def verify_started(self, manifest):
        self.events.append(('verified', manifest['image']))

    def wait_address(self, config):
        self.events.append(('address',))


class RuntimeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='ngaturi-unit-test-')
        self.directory = Path(self.temp.name)
        self.root = self.directory / 'runtime'
        self.root.mkdir()
        self.state = self.directory / 'state'
        self.state.mkdir()
        self.previous_cwd = Path.cwd()
        os.chdir(self.root)
        self.backend = FakeDocker()
        self.original = {}
        for name in r.BASELINE_HASHES:
            data = ('audited v1.1.0 ' + name + '\n').encode()
            if name == 'scheduler.crontab':
                data = ('\n'.join(r.DAILY) + '\n*/5 * * * * reconcile-doku-payments\n').encode()
            (self.root / name).write_bytes(data)
            self.original[name] = data
        for name in ['README.md', 'GIT_RELEASE.md']:
            (self.root / name).write_text('original v1.1.0 docs\n')
        self.pins = {name: r.sha(data) for name, data in self.original.items()}
        self.unsafe = r.PACKAGE + '@sha256:' + '0' * 64
        self.baseline = r.PACKAGE + '@' + r.BASELINE_DIGEST
        (self.state / 'releases.env').write_text(
            f'CURRENT_VERSION=v1.1.0\nCURRENT_IMAGE={self.baseline}\nPREVIOUS_VERSION=v1.0.0\nPREVIOUS_IMAGE={self.unsafe}\n'
            'CURRENT_SCHEDULER_ENABLED=true\nPREVIOUS_SCHEDULER_ENABLED=true\n')
        (self.directory / 'secrets.env').write_text('CRON_SECRET=fixture-only\n')
        (self.root / 'deploy.env').write_text(f'DEPLOY_STATE_DIR={self.state}\nRUNTIME_ENV_FILE={self.directory / "secrets.env"}\nPROBE_ATTEMPTS=1\n')
        self.backend.images[self.baseline] = self.image(r.BASELINE_REVISION)
        self.artifact, self.manifest = self.artifact_for('v1.2.0', 'a')

    def tearDown(self):
        os.chdir(self.previous_cwd)
        self.temp.cleanup()

    def image(self, revision, ops=None):
        return dict(os='linux', architecture='amd64', config={'Labels': {
            'org.opencontainers.image.revision': revision,
            'org.opencontainers.image.source': 'https://github.com/wildanal2/ngaturi-cms',
            'com.ngaturi.ops-sha256': ops,
        }})

    def manager(self):
        return r.Manager(self.root, self.state, self.backend, expected_runtime=self.root, baseline_hashes=self.pins)

    def artifact_for(self, version, character, alter=None):
        source = self.directory / (version + '-source')
        shutil.copytree(REPO / 'ops/production', source)
        if alter:
            alter(source)
        hashes = {name: r.sha((source / name).read_bytes()) for name in r.FILES}
        digest = 'sha256:' + character * 64
        manifest = dict(release_type='release', git_tag=version, git_sha=character * 40,
                        ghcr_image=r.PACKAGE, digest=digest, image=r.PACKAGE + '@' + digest,
                        ops_sha256=r.ops_hash(hashes))
        metadata = self.directory / (version + '.json')
        metadata.write_text(json.dumps(manifest))
        artifact = self.directory / (version + '.tar.gz')
        r.package(metadata, artifact, source)
        manifest = json.loads(metadata.read_text())
        self.backend.images[manifest['image']] = self.image(manifest['git_sha'], manifest['ops_sha256'])
        self.backend.tags[r.PACKAGE + ':' + version] = digest
        return artifact, manifest

    def deploy(self):
        self.manager().execute('v1.2.0', self.artifact)
        return self.manager().read_state()

    def assert_no_runtime_mutation(self):
        self.assertFalse(any(event[0] in ('stop', 'start', 'pull') for event in self.backend.events))
        self.assertFalse((self.state / 'units.json').exists())
        self.assertFalse((self.root / '.active-release').exists())

    def test_artifact_required_and_wrong_directory_fail_before_mutation(self):
        with self.assertRaisesRegex(RuntimeError, 'artifact required'):
            self.manager().execute('v1.2.0')
        os.chdir(self.directory)
        with self.assertRaisesRegex(RuntimeError, 'runtime directory'):
            self.manager().execute('v1.2.0', self.artifact)
        self.assert_no_runtime_mutation()

    def test_bootstrap_identity_and_pinned_ops_must_match(self):
        (self.root / 'scheduler.crontab').write_text('changed\n')
        with self.assertRaisesRegex(RuntimeError, 'ops changed'):
            self.deploy()
        self.assert_no_runtime_mutation()

    def test_unknown_current_release_is_rejected(self):
        path = self.state / 'releases.env'
        path.write_text(path.read_text().replace('CURRENT_VERSION=v1.1.0', 'CURRENT_VERSION=unknown'))
        with self.assertRaisesRegex(RuntimeError, 'cannot be identified'):
            self.deploy()
        self.assert_no_runtime_mutation()

    def test_manifest_target_revision_and_image_ops_label_must_match(self):
        with self.assertRaisesRegex(RuntimeError, 'identity differ'):
            self.manager().execute('v9.9.9', self.artifact)
        self.backend.images[self.manifest['image']]['config']['Labels']['org.opencontainers.image.revision'] = 'f' * 40
        with self.assertRaisesRegex(RuntimeError, 'revision mismatch'):
            self.deploy()
        self.backend.images[self.manifest['image']] = self.image(self.manifest['git_sha'], 'f' * 64)
        with self.assertRaisesRegex(RuntimeError, 'checksum mismatch'):
            self.deploy()
        self.assert_no_runtime_mutation()

    def test_registry_tag_must_resolve_to_the_artifact_digest(self):
        self.backend.tags[r.PACKAGE + ':v1.2.0'] = 'sha256:' + 'f' * 64
        with self.assertRaisesRegex(RuntimeError, 'registry tag and release artifact digest differ'):
            self.deploy()
        self.assert_no_runtime_mutation()

    def test_corrupted_and_missing_artifacts_are_rejected(self):
        with self.assertRaisesRegex(RuntimeError, 'missing'):
            self.manager().execute('v1.2.0', self.directory / 'absent.tar.gz')
        manifest, payload = r.read_artifact(self.artifact)
        payload['scheduler.crontab'] += b'*/5 * * * * reconcile-doku-payments\n'
        bad = self.directory / 'bad.tar.gz'
        with tarfile.open(bad, 'w:gz') as archive:
            import io
            for name, data in {**payload, 'release-manifest.json': json.dumps(manifest).encode()}.items():
                member = tarfile.TarInfo(name)
                member.size = len(data)
                archive.addfile(member, io.BytesIO(data))
        with self.assertRaisesRegex(RuntimeError, 'checksum mismatch'):
            self.manager().execute('v1.2.0', bad)
        self.assert_no_runtime_mutation()

    def test_packager_rejects_five_minute_cron_and_pre_baseline_release(self):
        with self.assertRaisesRegex(RuntimeError, 'two daily'):
            self.artifact_for('v1.3.0', 'b', lambda directory: (directory / 'scheduler.crontab').write_text('*/5 * * * * reconcile-doku-payments\n'))
        with self.assertRaisesRegex(RuntimeError, 'predates'):
            self.artifact_for('v1.0.0', 'c')

    def test_duplicate_owner_and_active_legacy_timer_block(self):
        self.backend.duplicate = True
        with self.assertRaisesRegex(RuntimeError, 'duplicate'):
            self.deploy()
        self.backend.duplicate = False
        self.backend.legacy = True
        with self.assertRaisesRegex(RuntimeError, 'legacy timer'):
            self.deploy()
        self.assert_no_runtime_mutation()

    def test_dry_run_is_read_only(self):
        self.manager().execute('v1.2.0', self.artifact, dry_run=True)
        self.assert_no_runtime_mutation()

    def test_concurrent_deploy_rollback_recovery_lock_is_exclusive(self):
        with self.manager().locked():
            with self.assertRaisesRegex(RuntimeError, 'another deploy/rollback/recovery'):
                with self.manager().locked():
                    self.fail('second owner acquired the deployment lock')
        with self.manager().locked():
            pass
        self.assert_no_runtime_mutation()

    def test_complete_baseline_is_committed_before_first_stop(self):
        stop = self.backend.stop
        def guarded_stop(*args):
            state = self.manager().read_state()
            if not self.backend.events or not any(e[0] == 'stop' for e in self.backend.events):
                self.assertEqual(state['current'], state['previous'])
                snapshot, manifest, _ = self.manager().unit(state['previous'])
                self.assertEqual(manifest['git_tag'], 'v1.1.0')
                for name, data in self.original.items():
                    self.assertEqual((snapshot / name).read_bytes(), data)
                self.assertNotIn('v1.0.0', (self.state / 'releases.env').read_text())
                self.assertEqual((self.state / 'current').read_text().strip(), self.baseline)
                self.assertEqual((self.state / 'previous').read_text().strip(), self.baseline)
            stop(*args)
        self.backend.stop = guarded_stop
        state = self.deploy()
        self.assertTrue(state['previous'].startswith('v1.1.0-'))
        self.assertFalse((self.state / 'pending.json').exists())

    def test_rollback_restores_complete_previous_unit_and_configuration(self):
        state = self.deploy()
        previous = state['previous']
        self.manager().execute(mode='rollback')
        self.assertEqual(self.manager().read_state()['current'], previous)
        for name, data in self.original.items():
            if name not in ['deploy.sh', 'rollback.sh']:
                self.assertEqual((self.root / name).read_bytes(), data)
            self.assertEqual((self.manager().unit(previous)[0] / name).read_bytes(), data)
        self.assertEqual((self.root / '.active-release').resolve(), self.manager().unit(previous)[0])
        # Guarded entry point survives the legacy baseline rollback; old scripts are never executed.
        self.assertIn('release.py', (self.root / 'deploy.sh').read_text())
        self.assertNotIn(self.unsafe, (self.state / 'releases.env').read_text())
        self.assertEqual(self.backend.running, self.baseline)
        self.assertFalse((self.root / 'deploy.env.example').is_symlink())

    def test_next_release_rollback_restores_its_matching_scripts_and_two_job_schedule(self):
        old = self.deploy()
        artifact, manifest = self.artifact_for('v1.3.0', 'b', lambda directory: (directory / 'README.md').write_text('v1.3.0 marker\n'))
        self.manager().execute('v1.3.0', artifact)
        self.manager().execute(mode='rollback')
        state = self.manager().read_state()
        self.assertEqual(state['current'], old['current'])
        self.assertEqual((self.root / 'scheduler.crontab').read_text().strip().splitlines()[-2:], r.DAILY)
        self.assertEqual((self.root / 'README.md').read_bytes(), (REPO / 'ops/production/README.md').read_bytes())

    def test_readiness_failure_and_sigterm_restore_current_complete_unit(self):
        for failure in [('gate', self.manifest['image']), ('start', self.manifest['image'], 'app', InterruptedError('SIGTERM'))]:
            with self.subTest(failure=failure):
                self.backend.failure = failure
                with self.assertRaises((RuntimeError, InterruptedError)):
                    self.deploy()
                state = self.manager().read_state()
                self.assertTrue(state['current'].startswith('v1.1.0-'))
                self.assertEqual(self.backend.running, self.baseline)
                self.assertEqual((self.root / 'scheduler.crontab').read_bytes(), self.original['scheduler.crontab'])
                self.assertFalse((self.state / 'pending.json').exists())

    def test_sigkill_during_deploy_is_recovered_from_journal_without_candidate_commit(self):
        self.backend.failure = ('start', self.manifest['image'], 'app', Crash('SIGKILL'))
        with self.assertRaises(Crash):
            self.deploy()
        self.assertTrue((self.state / 'pending.json').exists())
        self.manager().execute(mode='recover')
        self.assertEqual(self.backend.running, self.baseline)
        self.assertEqual((self.root / 'scheduler.crontab').read_bytes(), self.original['scheduler.crontab'])
        self.assertFalse((self.state / 'pending.json').exists())

    def test_interrupted_rollback_recovers_entire_origin_release(self):
        state = self.deploy()
        self.backend.failure = ('start', self.baseline, 'app', Crash('SIGKILL'))
        with self.assertRaises(Crash):
            self.manager().execute(mode='rollback')
        self.manager().execute(mode='recover')
        self.assertEqual(self.manager().read_state()['current'], state['current'])
        self.assertEqual(self.backend.running, self.manifest['image'])
        self.assertNotIn('reconcile-doku-payments', (self.root / 'scheduler.crontab').read_text())

    def test_interruption_after_durable_commit_keeps_committed_complete_release(self):
        atomic_json = r.atomic_json
        def crash_after_commit(path, value):
            atomic_json(path, value)
            if path.name == 'units.json' and value['current'].startswith('v1.2.0-'):
                raise Crash('power loss after commit')
        with patch.object(r, 'atomic_json', side_effect=crash_after_commit):
            with self.assertRaises(Crash):
                self.deploy()
        self.manager().execute(mode='recover')
        self.assertEqual(self.backend.running, self.manifest['image'])
        self.assertTrue(self.manager().read_state()['previous'].startswith('v1.1.0-'))
        self.assertFalse((self.state / 'pending.json').exists())

    def test_corrupted_stored_fallback_fails_closed(self):
        state = self.deploy()
        old, _, _ = self.manager().unit(state['previous'])
        (old / 'scheduler.mjs').write_text('corrupt\n')
        self.backend.events.clear()
        with self.assertRaisesRegex(RuntimeError, 'stored release files changed'):
            self.manager().execute(mode='rollback')
        self.assertFalse(any(e[0] in ('start', 'stop') for e in self.backend.events))

    def test_tampered_fallback_identity_cannot_select_v1_0_image(self):
        state = self.deploy()
        path = self.manager().unit(state['previous'])[0] / 'unit.json'
        record = json.loads(path.read_text())
        record['manifest']['image'] = self.unsafe
        path.write_text(json.dumps(record))
        self.backend.events.clear()
        with self.assertRaisesRegex(RuntimeError, 'stored release identity changed'):
            self.manager().execute(mode='rollback')
        self.assertFalse(any(e[0] in ('start', 'stop', 'pull') for e in self.backend.events))

    def test_failed_rollback_restores_new_release(self):
        state = self.deploy()
        self.backend.failure = ('gate', self.baseline)
        with self.assertRaisesRegex(RuntimeError, 'readiness'):
            self.manager().execute(mode='rollback')
        self.assertEqual(self.manager().read_state(), state)
        self.assertEqual(self.backend.running, self.manifest['image'])

    def test_real_sigterm_during_rollback_restores_the_origin_unit(self):
        state = self.deploy()
        start = self.backend.start
        fired = False
        def interrupted_start(*args):
            nonlocal fired
            start(*args)
            if args[2] == self.baseline and not fired:
                fired = True
                os.kill(os.getpid(), signal.SIGTERM)
        previous_handler = signal.signal(signal.SIGTERM, r.handle_interrupt)
        try:
            self.backend.start = interrupted_start
            with self.assertRaises(InterruptedError):
                self.manager().execute(mode='rollback')
        finally:
            signal.signal(signal.SIGTERM, previous_handler)
        self.assertTrue(fired)
        self.assertEqual(self.manager().read_state(), state)
        self.assertEqual(self.backend.running, self.manifest['image'])

    def test_real_sigkill_retains_journal_and_recovery_restores_complete_baseline(self):
        start = self.backend.start
        def killed_start(*args):
            start(*args)
            os.kill(os.getpid(), signal.SIGKILL)
        sys.stdout.flush()
        sys.stderr.flush()
        pid = os.fork()
        if pid == 0:
            self.backend.start = killed_start
            try:
                self.deploy()
            finally:
                os._exit(2)
        _, status = os.waitpid(pid, 0)
        self.assertTrue(os.WIFSIGNALED(status))
        self.assertEqual(os.WTERMSIG(status), signal.SIGKILL)
        self.assertTrue((self.state / 'pending.json').exists())
        self.manager().execute(mode='recover')
        self.assertEqual((self.root / 'scheduler.crontab').read_bytes(), self.original['scheduler.crontab'])
        self.assertEqual(self.backend.running, self.baseline)
        self.assertFalse((self.state / 'pending.json').exists())

    def test_host_crontab_drift_blocks_without_runtime_change(self):
        self.deploy()
        # Replace the root symlink, preserving the immutable release's copy.
        (self.root / 'scheduler.crontab').unlink()
        (self.root / 'scheduler.crontab').write_text('*/5 * * * * reconcile-doku-payments\n')
        self.backend.events.clear()
        with self.assertRaisesRegex(RuntimeError, 'active ops files differ'):
            self.manager().execute(mode='rollback')
        self.assertFalse(any(e[0] in ('start', 'stop', 'pull') for e in self.backend.events))

    def test_cli_rejects_nonproduction_directory_without_contacting_docker(self):
        result = subprocess.run(['bash', str(REPO / 'ops/production/deploy.sh'), 'v1.2.0'], cwd=self.directory,
                                text=True, capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('runtime directory must be /home/okee/ngaturi', result.stderr)

    def test_pull_failure_and_scheduler_drain_failure_never_activate_candidate(self):
        self.backend.failure = ('pull', self.manifest['image'])
        with self.assertRaisesRegex(RuntimeError, 'pull failed'):
            self.deploy()
        self.assertFalse((self.state / 'units.json').exists())
        self.assertFalse((self.root / '.active-release').exists())
        self.backend.failure = ('stop', 'scheduler')
        with self.assertRaisesRegex(RuntimeError, 'journal retained'):
            self.deploy()
        self.assertFalse(any(e[0] == 'start' for e in self.backend.events))
        self.assertEqual((self.root / 'scheduler.crontab').read_bytes(), self.original['scheduler.crontab'])


if __name__ == '__main__':
    unittest.main()
