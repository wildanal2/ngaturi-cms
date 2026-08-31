# Ngaturi CMS

Platform generator undangan digital (pernikahan, khitan, aqiqah, tahlil).
Spesifikasi lengkap di `PRD.md`.

## Stack

- **Next.js 16** (App Router, Turbopack) · TypeScript strict
- **PostgreSQL 16** + **Drizzle ORM**
- **Redis 7** (ioredis) — session store & rate limiting
- **Better Auth** — Google OAuth only, sesi di Redis
- **Tigris** (S3-compatible) — object storage, upload diproses `sharp` (resize 1920 + WebP)
- **Tailwind CSS 4** + CSS Modules (isolasi gaya per-section)
- **dnd-kit** (reorder), **zundo** (undo/redo), **sonner** (toast), **react-easy-crop**
- **Midtrans** Snap — pembayaran
- **Vercel** — hosting, Speed Insights, Analytics, Cron

## Setup

```bash
cp .env.example .env.local     # isi kredensial
npm install
npm run db:migrate             # buat schema
npm run db:seed                # muat template + promosikan ADMIN_EMAILS
npm run demo:showcase          # (opsional) undangan contoh utk landing
npm run dev
```

Google Console → Authorized redirect URI:
`http://localhost:3000/api/auth/callback/google` (+ URL produksi)

---

## Cara kerja aplikasi

### 1. Model data

```
users ─┬─ user_profiles (free_invitation_used, business sub)
       └─ invitations ─┬─ sections  (JSONB: array of SectionData)
                       │  global_settings (JSONB: warna, font, animasi, is_rtl)
                       ├─ rsvp_responses
                       ├─ guestbook_messages
                       ├─ guest_invites   (link per-tamu, ?to=<token>)
                       ├─ media_assets
                       ├─ invitation_views
                       └─ payments
templates  (katalog di-seed dari kode; composition = { global_settings, sections })
```

Sebuah undangan **= array `sections` + `global_settings`**. Tidak ada tabel
per-tipe-section; semua isi konten ada di JSONB `sections`.

Bentuk satu section (`src/sections/types.ts`):

```ts
interface SectionData {
  id: string;
  type: string;      // "hero" | "countdown" | ...
  variant: string;   // "botanical" | "flip" | ...  ← komponen tampilan
  order: number;
  visible: boolean;
  props: Record<string, unknown>;   // isi konten + s_* (gaya) + dummy
}
```

### 2. Registry — jantung sistem

`src/sections/registry.tsx` memetakan **tipe → varian → komponen React +
field editor + gaya**:

```
SectionRegistry[type].variants[variant] = {
  name, description,
  component,          // komponen yang dirender (server/client)
  propsSchema,        // Zod, validasi saat save
  fields,             // Field[]  → dipakai builder utk render form editor
  styleOptions,       // StyleOption[] → chip "Gaya" (disimpan sbg props.s_<key>)
  defaultProps,       // nilai awal saat section ditambahkan
}
```

`variantDefaultProps(type, variant)` menggabungkan `defaultProps` +
default `styleOptions` + **gambar dummy publik** (picsum / pravatar /
dicebear / Google Maps embed) untuk field yang kosong.

### 3. Alur render

```
DB (sections JSONB)
  └─ InvitationRenderer  (src/lib/invitation/renderer.tsx)
       ├─ set CSS vars: --inv-primary/-secondary/-bg/-font  (dari global_settings)
       ├─ tiap section dibungkus <Reveal animation=...>  (kecuali music & navigation)
       │    └─ IntersectionObserver → animasi scroll (di-gate oleh cover)
       └─ <VariantComponent props global siblingTypes isPreview inCanvas />
```

Halaman publik: `src/app/[slug]/page.tsx` → cover (`ngaturi:open` event) →
renderer → track view via `after()`. OG card: `src/app/[slug]/opengraph-image.tsx`.

### 4. Alur builder

```
/builder/[id] (server: cek kepemilikan + edit-lock)
  └─ <BuilderShell>  (client)
       load sections → Zustand store (src/stores/builder-store.ts, zundo temporal)
       ├─ SectionList   — dnd-kit sortable (reorder/hide/duplicate/delete)
       ├─ Canvas        — DeviceFrame + InvitationRenderer (inCanvas=true)
       │                  klik section → pilih
       ├─ Inspector     — Tampilan(varian) → Gaya(styleOptions) → Field editor
       └─ autosave 1.2s → server action saveComposition() → updateTag()
```

### 5. Trial & pembayaran

- User baru: undangan pertama `plan=free_trial`, `edit_expires_at = +7 hari`.
- Cron `lock-expired-edits` → `is_edit_locked=true`; undangan tetap online.
- `/invitations/[id]/unlock` → Midtrans Snap → webhook `/api/webhooks/payment`
  (verifikasi signature, idempoten) → `is_paid=true`, hapus watermark, buka edit.

---

## Struktur folder section

Tiap **tipe section** punya folder sendiri di `src/sections/<type>/`, dengan
**satu file `.tsx` per varian** + CSS-nya sendiri (opsional) + `index.ts`:

```
src/sections/
  registry.tsx        # type → SectionDefinition (impor tiap folder + helper)
  fields.ts           # Field[] & StyleOption yang dipakai lintas section
  types.ts  schema.ts  shared.tsx  reveal.tsx  ornaments.tsx  dummy.ts
  countdown/
    index.ts                     # rakit SectionDefinition "countdown"
    use-countdown.tsx            # hook/util bersama antar varian
    countdown-flip.tsx
    countdown-flip.module.css    # CSS terisolasi khusus varian ini
    countdown-rings.tsx
    countdown-rings.module.css
    countdown-minimal.tsx  countdown-pill.tsx  countdown-elegant.tsx
  music/  cover/  hero/  couple/  events/  gallery/  quote/
  gift/  map/  closing/  rsvp/  guestbook/  navigation/
```

## Bikin komponen (varian section) baru

Contoh: menambah varian **"neon"** untuk countdown.

**1. Tulis komponennya** — file baru `src/sections/countdown/countdown-neon.tsx`.
Terima `SectionRenderProps`:

```tsx
import type { SectionRenderProps } from "../types";

export function CountdownNeon({ props }: SectionRenderProps) {
  const p = props as { target_date?: string; s_glow?: string };
  // ... pakai var(--inv-primary) dsb utk warna tema
}
```

- Gaya berwarna tema: pakai `var(--inv-primary)`, `var(--inv-secondary)`,
  `var(--inv-bg)`, `var(--inv-ink)`, `var(--inv-font)`.
- Butuh CSS terisolasi? bikin `countdown-neon.module.css` di folder yang sama
  (CSS Modules → scoped, tidak bocor ke varian lain).
- Komponen client (pakai hook/event) → `"use client"` di baris pertama.
- `isPreview` = jangan submit form / jangan auto-play.
- `inCanvas` = jangan pakai `position: fixed` (lepas dari frame HP).

**2. Daftarkan di `src/sections/countdown/index.ts`** — impor + tambah ke
`variants`:

```ts
import { CountdownNeon } from "./countdown-neon";
// ...
neon: {
  name: "Neon",
  description: "Angka glow di latar gelap",
  component: CountdownNeon,
  propsSchema: CountdownProps,       // ../schema.ts
  fields: countdownFields,           // ../fields.ts
  styleOptions: [
    { key: "glow", label: "Intensitas", default: "med",
      options: [{ value: "low", label: "Redup" }, { value: "high", label: "Terang" }] },
  ],
  defaultProps: { target_date: nowPlus(45) },
},
```

Itu saja — builder otomatis menampilkan varian baru di panel **Tampilan**,
beserta chip **Gaya** dan form field-nya. Tidak perlu migrasi DB.

### Tipe section yang benar-benar baru

1. Bikin folder `src/sections/<type>/` dengan file varian + `index.ts` yang
   mengekspor `export const <type>Section: SectionDefinition`
   (`icon` = nama ikon lucide, `category` = `hero`/`content`/`interactive`/`footer`).
2. Tambah skema props di `src/sections/schema.ts` + daftarkan di
   `SECTION_PROPS_SCHEMAS`.
3. Impor `<type>Section` di `src/sections/registry.tsx` dan tambahkan ke
   `SectionRegistry`. Menu "Tambah bagian" otomatis mengelompokkannya per
   `category`.
4. Kalau perlu perilaku fixed/overlay (spt `music`/`navigation`), tambahkan
   `type`-nya ke set `OVERLAY` di `src/lib/invitation/renderer.tsx`.

---

## Bikin template baru

Template = preset section + palet, di `src/lib/templates/catalog.ts`:

```ts
{
  id: "rustic-oak",
  name: "Rustic Oak",
  description: "...",
  category: "wedding",
  tier: "free",                    // free | basic | premium
  thumbnail: "/templates/rustic-oak.svg",   // taruh file di public/templates/
  global_settings: {
    font_family: "Fraunces",       // Fraunces | Inter
    color_primary: "#5b4636",
    color_secondary: "#8a9a5b",
    color_background: "#f7f3ec",
    animation: "fade-up",          // fade-up|down|left|right | zoom | flip | fade | none
  },
  sections: [
    s("hero", "botanical", 0, { couple_names: "A & B", tagline: "The Wedding Of" }),
    s("quote", "bordered", 1, {}),           // {} → pakai default varian (isi contoh + dummy)
    s("couple-intro", "stacked", 2, { bride: { full_name: "A" }, groom: { full_name: "B" } }),
    s("countdown", "flip", 3, {}),
    s("event-details", "cards", 4, {}),
    s("map-location", "embed", 5, {}),
    s("gallery", "carousel", 6, {}),
    s("rsvp", "form-card", 7, {}),
    s("guestbook", "cards", 8, {}),
    s("gift", "minimal", 9, {}),
    s("closing", "photo", 10, {}),
    s("music", "floating", 11, {}),
    s("navigation", "bar", 12, {}),
  ],
}
```

- `s(type, variant, order, props)` — helper. `props` yang **kosong / `[]` /
  `""` tidak menimpa** default varian (lihat `hydrateTemplateSections`), jadi
  `s("gift","minimal",9,{})` tetap dapat rekening + logo contoh.
- Setelah edit: `npm run db:seed` (upsert ke tabel `templates`).
- Preview: `/templates/<id>/preview` · Pakai: `/templates/<id>/use`.

---

## Deploy (Vercel + GitHub Actions)

- Push ke `main` → `.github/workflows/deploy.yml`: typecheck + lint →
  `vercel pull/build/deploy --prod`.
- Secrets repo: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
- `vercel.json` set `git.deploymentEnabled.main=false` — Actions = satu-satunya deployer.
- Env produksi dikelola di Vercel (`vercel env`), bukan `.env.local`.

## Scripts

`dev` · `build` · `start` · `typecheck` · `lint` · `format`
`db:generate` · `db:migrate` · `db:push` · `db:seed` · `db:studio` · `demo:showcase`

## Struktur

```
src/
  app/
    (dashboard)/   rute terproteksi
    (admin)/       rute admin (role=admin)
    builder/[id]/  builder layar penuh
    [slug]/        halaman undangan publik + opengraph-image
    templates/[id]/{preview,use}
    api/           auth · public/{rsvp,guestbook} · uploads · payments · webhooks · cron
  sections/        registry, schema, types, varian (+ *.module.css), reveal, ornaments, dummy
  components/builder/  shell, canvas, inspector, section-list, field-editors, crop-dialog, device-frame
  lib/
    auth/ db/ redis/ storage/ payments/ turnstile
    invitation/  actions · query · entitlement · guests · moderation · showcase · cron
    templates/   catalog · hydrate
  stores/builder-store.ts   Zustand + zundo
```
