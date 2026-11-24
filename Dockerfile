# Base image: official Node 24 on Debian 13 (trixie), refreshed by rebuilding with
# `docker build --pull` (see docs/container-hardening.md). Pin NODE_IMAGE to a
# digest only together with a scheduled refresh of that digest.
ARG NODE_IMAGE=node:24-trixie-slim

FROM ${NODE_IMAGE} AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS builder
COPY . .
ENV NODE_ENV=production
RUN --network=none NGATURI_IMAGE_BUILD=1 npm run build

# The runtime needs `node` and coreutils (deploy does `docker exec ... cat`), not
# the Node package managers. Remove them here and flatten into scratch below so
# no layer of the final image carries npm/npx/Yarn/Corepack.
FROM ${NODE_IMAGE} AS prune
RUN rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx \
        /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-v* \
    && groupadd --system --gid 1001 ngaturi \
    && useradd --system --uid 1001 --gid ngaturi ngaturi \
    && mkdir -p /app && chown ngaturi:ngaturi /app

FROM scratch AS runtime
COPY --from=prune / /
ENV PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
    NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=8080
WORKDIR /app
COPY --from=builder --chown=ngaturi:ngaturi /app/.next/standalone ./
COPY --from=builder --chown=ngaturi:ngaturi /app/.next/static ./.next/static
COPY --from=builder --chown=ngaturi:ngaturi /app/public ./public
COPY --from=builder --chown=ngaturi:ngaturi /app/src/assets/fonts/licenses ./licenses/fonts
COPY --chown=ngaturi:ngaturi ops/production/scheduler.mjs ops/production/scheduler.crontab ./ops/production/
USER ngaturi
EXPOSE 8080
ENTRYPOINT ["node"]
CMD ["server.js"]
