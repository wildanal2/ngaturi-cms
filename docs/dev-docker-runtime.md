# DEV bind-mount runtime

This setup runs Next.js development mode on the DEV VM. It is separate from
production image packaging. Keep the existing PM2 definition for manual rollback.

## Inputs

- `.dev.vars` and `.env.local` are ignored local secret files. `.env.local`
  overrides matching `.dev.vars` entries in Compose. It must contain the DEV
  Neon `DATABASE_URL` and R2 S3 settings; `.dev.vars` supplies Upstash REST.
- Verify the DEV values for `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, and
  `DOKU_CALLBACK_URL` use `https://dev.ngaturi.com`. The Compose configuration
  sets `ALLOWED_DEV_ORIGINS` to the exact DEV hostname.
- Keep `TRUST_CLOUDFLARE_INGRESS` disabled until the final app listener and all
  alternate ingress paths have been checked.

## Run

The default image user is UID/GID 1001, matching this DEV VM. On a different
DEV host, set `DEV_UID` and `DEV_GID` to the repository owner's numeric IDs
when building the image.

```sh
docker compose -f compose.dev.yml build app
docker compose -f compose.dev.yml up -d --no-build app
docker compose -f compose.dev.yml ps
```

The repository is mounted at `/app`; named volumes hold `/app/node_modules`
and `/app/.next`. The image runs `npm ci` at build time. After a lockfile
change, rebuild the image and replace the `node_modules` volume before
starting again. Never mount host `node_modules` into the container.

The app binds `0.0.0.0:3009` inside its bridge network. Docker publishes only
`${DEV_BIND_IP:-192.168.88.34}:3009` on the DEV VM. Set `DEV_BIND_IP` if the
VM's private address changes. The canonical tunnel connector runs in a
separate LXC and targets `http://192.168.88.34:3009`; leave the old tunnel
alone during account migration. Keep `TRUST_CLOUDFLARE_INGRESS=false` until
the effective host and Docker firewall rules prove that only the trusted LXC
can reach port 3009.

On this VM, the LXC source `192.168.88.18` was observed at the private
interface. A narrow `DOCKER-USER` rule currently drops other forwarded TCP
traffic originally addressed to `192.168.88.34:3009`. This live iptables rule
is not persistent across a reboot, so keep ingress trust disabled and check
the rule again after reboot. Host-local checks and both DEV tunnel hostnames
continued to work when the rule was tested.

## Rollback

```sh
docker compose -f compose.dev.yml stop app
pm2 restart ngaturi-dev --update-env
ss -ltnp '( sport = :3009 )'
```

If the PM2 entry was later removed, restore it with
`pm2 start ecosystem.dev.config.cjs --only ngaturi-dev` instead of restarting.
