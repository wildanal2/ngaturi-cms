# DEV bind-mount runtime

This setup runs Next.js development mode on the DEV VM. It is separate from
production image packaging. Keep the existing PM2 definition for manual rollback.

## Inputs

- `.env.local`, `.dev.vars`, and `.env.neon.local` are ignored local secret
  files. The later files override matching earlier entries in Compose.
- Before cutover, create `.env.neon.local` with the DEV Neon `DATABASE_URL`.
  This file is required by Compose. The old `localhost` value in `.env.local`
  points at the container itself and does not reach the VM's database.
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

The app binds `0.0.0.0:3009` inside its bridge network, while Docker publishes
only `127.0.0.1:3009` on the VM. A tunnel connector must run on the same VM
to use that loopback origin. Verify its Cloudflare ingress rule points to
`http://127.0.0.1:3009` before stopping the old connector.

## Rollback

```sh
docker compose -f compose.dev.yml stop app
pm2 restart ngaturi-dev --update-env
ss -ltnp '( sport = :3009 )'
```

If the PM2 entry was later removed, restore it with
`pm2 start ecosystem.dev.config.cjs --only ngaturi-dev` instead of restarting.
