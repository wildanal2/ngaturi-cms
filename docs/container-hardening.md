# Production container hardening

Runtime image: official `node:24-trixie-slim` (Debian 13, glibc 2.41, Node 24). It replaces
`node:24-bookworm-slim` (Debian 12). Node major, Next.js and the deployment contract are unchanged.

## What changed
- Builder and runtime share `ARG NODE_IMAGE` (glibc ABI identical, so Sharp/libvips prebuilds match).
- A `prune` stage removes npm, npx, Yarn and Corepack (`/usr/local/lib/node_modules`, `/usr/local/bin/{npm,npx,corepack,yarn,yarnpkg}`, `/opt/yarn-*`) and creates UID/GID 1001; the final stage is `FROM scratch` + `COPY --from=prune / /`, so **no layer** of the final image contains a Node package manager. `dpkg` metadata is kept for scanners.
- Kept on purpose: `cat`/`sh` (`ops/production/release.py` runs `docker exec ... cat /app/ops/production/scheduler.crontab`), the CA bundle, `node`, non-root user 1001, `ENTRYPOINT ["node"]`, `CMD ["server.js"]`, port 8080, the Compose options (cap_drop ALL, no-new-privileges, read-only scheduler, TLS mount).
- Distroless was not adopted: no `cat`, so the release contract would break. Alpine (musl) was not adopted: Sharp/libvips native ABI risk.

## Refreshing the base image
Not digest-pinned on purpose: a pin that nobody bumps stops receiving Debian security updates.
Release builds should use `docker build --pull` (or buildx `--pull`) so each release picks up the latest
`node:24-trixie-slim`. To pin, set `--build-arg NODE_IMAGE=node@sha256:...` in the release workflow and bump it
at least monthly, after `trivy image` shows no fixable High/Critical.

## Known residuals
Debian publishes no fixes yet for the remaining High findings (util-linux, ncurses, sqlite, system OpenSSL,
systemd libs). Node uses its own bundled OpenSSL/zlib/undici, and the app never executes those tools. Re-scan on
every release; see PR #35 for the analysis.
