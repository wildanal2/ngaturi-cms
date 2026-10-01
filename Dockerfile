FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS builder
COPY . .
ENV NODE_ENV=production
RUN --network=none NGATURI_IMAGE_BUILD=1 npm run build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=8080
WORKDIR /app
RUN groupadd --system --gid 1001 ngaturi \
    && useradd --system --uid 1001 --gid ngaturi ngaturi
COPY --from=builder --chown=ngaturi:ngaturi /app/.next/standalone ./
COPY --from=builder --chown=ngaturi:ngaturi /app/.next/static ./.next/static
COPY --from=builder --chown=ngaturi:ngaturi /app/public ./public
COPY --from=builder --chown=ngaturi:ngaturi /app/src/assets/fonts/licenses ./licenses/fonts
COPY --chown=ngaturi:ngaturi ops/production/scheduler.mjs ops/production/scheduler.crontab ./ops/production/
USER ngaturi
EXPOSE 8080
ENTRYPOINT ["node"]
CMD ["server.js"]
