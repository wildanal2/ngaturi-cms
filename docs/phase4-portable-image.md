# Portable production image

Build with `docker build -f Dockerfile -t ngaturi:local .`. The dependency
stage runs `npm ci` against `package-lock.json`. The Next.js build runs without
network access and without application credentials. The final Node 24 Debian
slim image runs the standalone server as UID 1001, with `node server.js` as
the exec-form command. It listens on `0.0.0.0:$PORT` (default `8080`).

Supply the existing Node runtime environment when starting a container:
`DATABASE_URL`, Upstash `REDIS_REST_URL` and `REDIS_REST_TOKEN`, R2 S3
credentials and `S3_PUBLIC_URL`, `BETTER_AUTH_URL` and auth credentials, plus
the other values validated by `src/lib/env.ts`. `BETTER_AUTH_URL` is the
trusted canonical origin for server URLs. Browser auth uses the current page
origin. The optional Turnstile site key is served at request time by
`/api/public-config`, so it is not compiled into client JavaScript.

The standalone image contains `.next/standalone`, `.next/static`, `public`,
traced native dependencies including Sharp, and bundled font licenses. No
source bind mount or persistent volume is required. Uploads go to R2; users,
invitations and payments stay in Neon; sessions and rate limits stay in
Upstash. Framework caches are ephemeral. R2 media URLs are produced from the
runtime `S3_PUBLIC_URL`; images are served directly because Next's image
remote-host allowlist is otherwise frozen into the build. Uploads remain
resized and encoded by Sharp. The five web fonts are bundled locally so the
Next build does not fetch Google Fonts.

`/api/health` is a process liveness probe. `/api/ready` performs read-only
Neon and Upstash checks with a three-second response deadline and returns a
generic 503 if either fails. Readiness does not write to R2. Run the image
without bind mounts and use an external runtime env file; never pass secrets
as build arguments. The Docker context excludes local env files and provider
artifacts.
