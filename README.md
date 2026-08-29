# Ngaturi CMS

Platform generator undangan digital (pernikahan, khitan, aqiqah, tahlil). Lihat
`PRD.md` untuk spesifikasi lengkap.

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript strict
- **PostgreSQL 16** + **Drizzle ORM**
- **Redis 7** (ioredis) — session store & rate limiting
- **Better Auth** — Google OAuth only
- **Tigris** (S3-compatible) — object storage
- **Tailwind CSS 4**

## Setup

```bash
cp .env.example .env.local   # isi kredensial
npm install
npm run db:migrate           # apply schema ke database
npm run dev
```

## Scripts

| Script | Fungsi |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate migration dari `src/lib/db/schema.ts` |
| `npm run db:migrate` | Terapkan migration |
| `npm run db:studio` | Drizzle Studio |

## Struktur

```
src/
  app/
    (dashboard)/      # rute terproteksi (butuh login)
    login/            # tombol "Lanjutkan dengan Google"
    api/auth/[...all] # handler Better Auth
  lib/
    auth/             # config + helpers Better Auth
    db/               # Drizzle schema, client, migrations
    redis/            # Redis client
    storage/          # S3/Tigris client + presigned URL
    rate-limit.ts
  proxy.ts            # edge: cek cookie sesi (dulu middleware.ts)
```

Status: **Phase 0 selesai** (infra) + **Sprint 1.1 sebagian** (auth Google, dashboard shell).
