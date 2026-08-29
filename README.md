# Ngaturi CMS

Platform generator undangan digital (pernikahan, khitan, aqiqah, tahlil).
Spesifikasi lengkap di `PRD.md`.

## Stack

- **Next.js 16** (App Router, Turbopack) · TypeScript strict
- **PostgreSQL 16** + **Drizzle ORM**
- **Redis 7** (ioredis) — session store & rate limiting
- **Better Auth** — Google OAuth only, sesi di Redis
- **Tigris** (S3-compatible) — object storage + presigned upload
- **Tailwind CSS 4** + CSS Modules (isolasi gaya per-section)
- **dnd-kit** (reorder), **zundo** (undo/redo), **sonner** (toast)
- **Midtrans** Snap — pembayaran

## Setup

```bash
cp .env.example .env.local     # isi kredensial
npm install
npm run db:migrate             # buat schema
npm run db:seed                # muat template + promosikan ADMIN_EMAILS
npm run dev
```

Google Console → Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

## Fitur

| Area | Status |
|---|---|
| Auth Google, dashboard, proxy guard | ✅ |
| Builder: dnd reorder, undo/redo, device preview (frame HP), autosave, click-to-select | ✅ |
| 9 tipe section, 20+ varian, gaya per-varian (`s_*`), animasi scroll per-section | ✅ |
| Upload foto → S3 (presigned, langsung dari builder) | ✅ |
| Template (3 preset) + katalog `src/lib/templates/catalog.ts` | ✅ |
| Trial: 1 undangan gratis, kunci edit 7 hari, watermark | ✅ |
| Publish + halaman publik `/[slug]`, cover, `?to=` personalisasi tamu | ✅ |
| RSVP + buku tamu (honeypot, rate limit, Turnstile, moderasi) | ✅ |
| Undangan per-tamu (premium): CRUD + link WA personal | ✅ |
| Pembayaran Midtrans: unlock/renewal, webhook idempoten | ✅ |
| Analitik kunjungan 14 hari, music player | ✅ |
| Admin panel: stats, template, user | ✅ |
| Cron: kunci trial kedaluwarsa, arsip undangan | ✅ |
| **Belum**: email (Resend), Sentry, `'use cache'` di publik, test/CI | ⏳ |

## Scripts

`dev` · `build` · `start` · `typecheck` · `lint` · `format`
`db:generate` · `db:migrate` · `db:push` · `db:seed` · `db:studio`

## Struktur

```
src/
  app/
    (dashboard)/   rute terproteksi
    (admin)/       rute admin (role=admin)
    builder/[id]/  builder layar penuh
    [slug]/        halaman undangan publik
    api/           auth · public/{rsvp,guestbook} · uploads · payments · webhooks · cron
  sections/        registry, schema, varian (+ *.module.css), Reveal
  components/builder/  shell, canvas, inspector, section-list, field-editors, device-frame
  lib/
    auth/ db/ redis/ storage/ payments/ invitation/ templates/
  stores/builder-store.ts   Zustand + zundo
```
