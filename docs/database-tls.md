# PostgreSQL TLS for a self-signed VPS database

Ngaturi can connect to PostgreSQL at `db.ngaturi.com:5432` over TLS using a
self-signed certificate whose SAN is `localhost.localdomain`, **with verification
fully enabled** (`rejectUnauthorized: true` is never relaxed).

## Settings (Node runtime only)

| Variable                  | Purpose                                                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_TLS_SERVERNAME` | Optional. Name the certificate must match (SNI + identity check), used as `ssl.servername`. Unset/blank = existing behaviour, byte-for-byte. |
| `NODE_EXTRA_CA_CERTS`     | Path to the PEM certificate Node should additionally trust. Read once at process start.                                                      |

The Cloudflare Worker/Hyperdrive path ignores both. No schema, migration, Redis,
auth or scheduler change is involved.

Target configuration (**documentation only — do not apply until cutover is approved**):

```env
DATABASE_URL=postgresql://ngaturi_cms:<PASSWORD>@db.ngaturi.com:5432/ngaturi_cms
DATABASE_TLS_SERVERNAME=localhost.localdomain
NODE_EXTRA_CA_CERTS=/run/ngaturi/tls/db-server.crt
```

Keep `sslmode` out of the URL or leave it as `require`; explicit driver options
override it and verification stays on.

## Installing the certificate on the production VM

`ops/production/compose.yml` mounts `${NGATURI_DB_TLS_DIR:-/etc/ngaturi/tls}`
read-only at `/run/ngaturi/tls` in `app` and `scheduler`. The mount is
unconditional so Neon deployments keep working without a certificate (Docker
creates an empty directory and nothing reads it).

```bash
sudo install -d -m 0755 /etc/ngaturi/tls
sudo install -m 0644 ~/.config/ngaturi/tls/db-server.crt /etc/ngaturi/tls/db-server.crt
openssl x509 -in /etc/ngaturi/tls/db-server.crt -noout -subject -enddate -ext subjectAltName
```

Only the **public** certificate is stored — never the private key, password or
anything under Git. Add the two variables to `/etc/ngaturi/ngaturi.env`
(root `0600`) only at cutover; runtime env is not rolled back by `rollback.sh`.

## Pre-cutover connection test (read-only)

1. From the VM, confirm the certificate and SAN (command above) and that
   `db.ngaturi.com:5432` is reachable: `nc -vz db.ngaturi.com 5432`.
2. In a throwaway container with the candidate image digest, run a `SELECT 1`
   with the three variables set and the cert directory mounted `:ro`.
   Expect success; without `DATABASE_TLS_SERVERNAME` expect
   `ERR_TLS_CERT_ALTNAME_INVALID`, without the CA expect
   `DEPTH_ZERO_SELF_SIGNED_CERT` (both prove verification is on).
3. Deploy with `deploy.sh` first **without** the variables (Neon unchanged),
   confirm `/api/health` and `/api/ready`, then plan the cutover separately.

## Risks

- Certificate expiry or rotation requires replacing the file and restarting the
  containers (`NODE_EXTRA_CA_CERTS` is read at startup).
- `NODE_EXTRA_CA_CERTS` pointing at a missing file only prints a Node warning;
  the connection then fails verification rather than being unverified.
- Trusting the self-signed certificate is process-wide for Node TLS (additive
  to the system store), so keep the file limited to this one certificate.
- The database firewall/VPS side is out of scope and untouched here.
