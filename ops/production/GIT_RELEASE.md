# Git & Release Flow

Feature/PR validates; Staging publishes an immutable SHA candidate; main is production-ready source. Only a strict immutable `vX.Y.Z` tag reachable from main publishes an official production release. GitHub publishes the workflow-verified release image and the matching ops archive as a GitHub Release asset, and never deploys the VM. Do not rewrite existing tags or deploy `latest`/`stable` directly.

The release workflow validates exact Git ancestry, builds once or reuses the matching SHA image, verifies immutable registry identities and publishes the image with `com.ngaturi.ops-sha256`. The matching `ngaturi-production-ops.tar.gz` includes every ops file and `release-manifest.json`, binding its Git revision, immutable digest and file checksums to that image label. Stable moves only after complete artifact publication. An existing same-SHA image without the matching ops label cannot be reused for this release protocol.

Production deployment is a complete release-unit operation, never an image-only change. The repository's `ops/production/` is the packaging source; the live VM directory is **`/home/okee/ngaturi`**. For managed installs the controller fetches the exact-tag GitHub Release ops asset automatically. For first bootstrap stage trusted control entry points outside the live directory, then follow the exact [deployment and fallback bootstrap procedure](README.md#first-deployment-of-the-neon-cu-fix). Use a new validated release newer than v1.1.0; no release tag is created as part of preparing this patch.

Before the first runtime replacement, audited current v1.1.0 is frozen as the complete fallback and replaces unsafe v1.0.0 in deployment state. App and scheduler remain enabled. The optimized schedule contains only the two daily maintenance jobs. Rollback restores a complete prior unit; rollback to the historical v1.1.0 baseline also restores its former schedule and cancels Neon acceptance. The guarded management entry point survives this legacy rollback.

Normal managed commands, from the actual VM runtime:

```sh
cd /home/okee/ngaturi
sudo ./deploy.sh --dry-run "$RELEASE_TAG"
sudo ./deploy.sh "$RELEASE_TAG"
sudo ./rollback.sh
# Only after an interrupted operation / boot recovery:
sudo ./deploy.sh --recover
```

Pass `--artifact /path/to/ngaturi-production-ops.tar.gz` only for an audited older/offline release that has no published GitHub Release asset. New version assets are automatically downloaded with a temporary file; dry-run downloads/verifies without pulling an image or mutating the runtime. These managed entry points are installed by the first staged deployment; the old production deploy script must not be used to bootstrap the upgrade. Both current/previous records and an interrupted-operation journal are durable. Complete release units are preserved under `/var/lib/ngaturi-deploy/units/`. No source build, provider reconfiguration, production migration, or remote routing change is part of deployment.

Follow [production verification](README.md#production-verification), the controlled Sumopod regression, and the ten-minute [Neon acceptance window](README.md#payment-regression-and-neon-acceptance). External Worker/Vercel/uptime ownership remains a separate verification item.
