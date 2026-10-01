# Git & Release Flow

## Branches

- feature → development / validation only
- Staging → integration / candidate
- main → production-ready source; branch pushes do not release

## Staging Image

A validated Staging push publishes only `ghcr.io/wildanal2/ngaturi-cms:sha-<commit>` and records its immutable digest. Use the full 40-character commit SHA for candidate/manual testing. No `stable`, version or `latest` tag is published.

## Production Release

After Staging is merged into main, create an immutable release tag on main:

```sh
git checkout main
git pull --ff-only
git tag v1.0.0
git push origin v1.0.0
```

GitHub verifies strict `vX.Y.Z`, the exact tagged commit's main ancestry, validation and registry collisions. It builds once, or reuses the matching validated SHA image. It publishes `v1.0.0`, `sha-<commit>` and then `stable` to the same digest. Stable moves only after release metadata and artifact upload succeed. GitHub never deploys the VM.

## Deploy

```sh
./deploy.sh v1.0.0                           # Normal production deployment
./deploy.sh sha-<full-40-character-git-sha>   # Candidate/manual testing
./deploy.sh sha256:<64-character-digest>     # Explicit immutable artifact
./rollback.sh                              # Previous exact digest
```

Tags resolve to an exact registry digest before Docker starts. Health/readiness must pass before current/previous state changes.

## Version Source and Rules

Git tag `vX.Y.Z` is the production version source of truth. `package.json.version` is package metadata only; CI never changes it.

- Never deploy `latest` or `stable` directly.
- Never rewrite or force-push an existing release tag.
- Production normally deploys `vX.Y.Z`; `sha-*` is for candidate testing.
- Use full commit SHAs; arbitrary image names/tags are rejected.
- Docker ultimately runs an exact `sha256` digest.
