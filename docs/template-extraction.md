# Panduan Agent: Mengubah Website Undangan Menjadi Komponen Ngaturi

Dokumen ini adalah **instruksi kerja** untuk agent yang bertugas mengekstraksi tampilan
sebuah website undangan (template pihak lain, hasil desain sendiri, screenshot, atau
folder proyek statis) menjadi **section variant + template preset** di repo ini.

Baca dokumen ini sampai selesai sebelum menulis kode. Jangan improvisasi arsitektur —
semua tampilan HARUS masuk lewat struktur yang sudah ada di `src/sections/`.

---

## 0. Aturan mutlak (baca dulu)

1. **salin aset atau kode dari sumber.** copy-paste HTML/CSS/JS jika diperlukan,
   salin file gambar, font , musik, atau SVG di asset webini.
   ekstraksi yang diperlukan sperti **ide tata letak**: proporsi, urutan bagian, skala tipografi,
   palet warna, bentuk foto, jenis ornamen. Semua di-*reimplement* ulang dengan
   Tailwind di repo ini.
2. **Ornamen bisa dibuat sendiri sebagai SVG inline jika tidak bisa di download** di `src/sections/ornaments.tsx`.
3. **Foto/aset contoh** boleh memakai placeholder publik yang sudah terdaftar di
   `src/sections/dummy.ts` + `next.config.ts` (`picsum.photos`, `i.pravatar.cc`,
   `api.dicebear.com`). Host baru wajib ditambahkan ke `images.remotePatterns` —
   dan sebaiknya jangan menambah host baru sama sekali.
4. **Jangan mengubah kontrak yang sudah ada.** Menambah variant = aman.
   Mengubah `SectionRenderProps`, `Field`, atau schema props yang dipakai variant lain
   = butuh persetujuan pemilik repo, karena bisa merusak undangan yang sudah publish.
5. **Data undangan yang sudah tersimpan tidak boleh rusak.** Props lama harus tetap
   valid; field baru selalu `optional()` atau punya `.default()`.
6. Bahasa UI (label field, nama variant, deskripsi) = **Bahasa Indonesia**.
   Nama kode (file, komponen, key props) = **bahasa Inggris, kebab/camel/Pascal**.

---

## 1. Peta arsitektur yang wajib dipahami

```
src/sections/
  types.ts        SectionDefinition, VariantDefinition, SectionRenderProps, Field, StyleOption
  schema.ts       Zod schema props per TYPE section (HeroProps, CoverProps, …)
  fields.ts       Field & StyleOption yang dipakai ulang lintas section + default konten
  dummy.ts        placeholder gambar publik
  ornaments.tsx   SVG dekoratif orisinal (currentColor)
  shared.tsx      SectionShell, SectionTitle, formatEventDate, formatTimeRange
  reveal.tsx      wrapper animasi scroll (dipakai renderer, bukan oleh variant)
  registry.tsx    type → SectionDefinition + variantDefaultProps()
  <type>/         satu folder per type section
    index.ts        merakit SectionDefinition + daftar variant
    <variant>.tsx   satu file per variant komponen

src/lib/templates/
  catalog.ts      TEMPLATES: daftar preset (kombinasi section + warna + font)
  hydrate.ts      mengisi props preset dengan default variant
src/lib/invitation/renderer.tsx   merender komposisi → halaman undangan
src/app/globals.css               animasi reveal, ornamen, .inv-input, dll
```

Alur render: `composition` (JSON di DB) → `InvitationRenderer` → untuk tiap section
`getVariant(type, variant).component` dirender di dalam `<Reveal>`.

**Section type yang tersedia** (jangan menambah type baru kecuali benar-benar tidak
ada yang cocok — utamakan menambah *variant* pada type yang ada):

`cover`, `hero`, `couple-intro`, `event-details`, `countdown`, `gallery`, `quote`,
`rsvp`, `guestbook`, `map-location`, `music`, `navigation`, `closing`, `gift`.

---

## 2. Langkah kerja (ikuti berurutan)

### Langkah 1 — Bedah sumbernya

Hasilkan catatan (boleh di scratchpad, jangan di-commit) berisi:

| Yang dicatat | Contoh |
|---|---|
| Urutan bagian dari atas ke bawah | cover → hero → quote → mempelai → countdown → acara → galeri → hadiah → penutup |
| Palet warna (hex) | bg `#f4f6f2`, primer `#c48b39`, sekunder `#90a77c` |
| Karakter font judul | script/handwriting → `Parisienne`; serif klasik → `Fraunces`/`Cormorant`; sans → `Inter` |
| Bentuk foto | bulat / arch / kotak lembut / fullscreen |
| Ornamen | dedaunan eucalyptus di sudut, garland di atas, divider tipis |
| Animasi dominan | fade-up / zoom |
| Bagian yang TIDAK ada padanannya | catat, nanti diputuskan di Langkah 2 |

Pemetaan warna ke sistem:
- `color_background` → warna kertas/latar halaman
- `color_primary` → warna judul/aksen utama (dipakai sebagai `var(--inv-primary)`)
- `color_secondary` → warna ornamen/aksen kedua (`var(--inv-secondary)`)

Font WAJIB salah satu dari: `Fraunces`, `Inter`, `Cormorant`, `Parisienne`
(lihat `FONT_STACK` di `src/lib/invitation/renderer.tsx` dan `src/app/layout.tsx`).
Butuh font lain → daftarkan di kedua tempat itu **dan** di test
`src/lib/templates/catalog.test.ts` ("uses a known font family").

### Langkah 2 — Petakan setiap bagian ke type section

Untuk tiap bagian sumber, putuskan salah satu:

- **A. Pakai variant yang sudah ada** — kalau tata letaknya ≥80% mirip. Cukup atur
  props + `styleOptions` di preset. **Ini pilihan default; jangan bikin variant baru
  hanya karena warnanya beda** (warna datang dari `global_settings`).
- **B. Tambah variant baru** pada type yang ada — kalau susunan elemennya beda
  (misal foto arch + bingkai ornamen vs foto fullscreen).
- **C. Tambah type baru** — hanya kalau isinya benar-benar informasi baru
  (butuh `schema.ts`, `registry.tsx`, ikon, kategori, dan test ikut diperbarui).
  Konfirmasi dulu ke pemilik repo sebelum mengambil opsi ini.

Tulis hasil pemetaan sebagai tabel di deskripsi PR/commit.

### Langkah 3 — Tulis komponen variant

Buat file baru `src/sections/<type>/<type>-<nama>.tsx`. Aturan:

```tsx
import type { SectionRenderProps } from "../types";
import { formatEventDate } from "../shared";
import { LeafSprig } from "../ornaments";

/** Satu kalimat: apa yang membedakan variant ini. */
export function HeroArch({ props, guestName }: SectionRenderProps) {
  const p = props as {
    couple_names?: string;
    event_date?: string;
    background_image?: string;
    s_frame?: string;           // nilai styleOption selalu berprefiks s_
  };
  …
}
```

Checklist komponen:

- [ ] Named export, nama `PascalCase` yang sama dengan nama file.
- [ ] Menerima **hanya** `SectionRenderProps`; baca props lewat `props`, bukan prop lain.
- [ ] Semua field props diperlakukan **opsional** — pakai fallback (`?? "Nama Mempelai"`),
      karena builder bisa mengosongkan field kapan saja.
- [ ] **Warna wajib dari CSS variable**, bukan hex/`text-emerald-700`:
      `var(--inv-primary)`, `var(--inv-secondary)`, `var(--inv-bg)`, `var(--inv-ink)`.
      Perlu turunan warna → `color-mix(in srgb, var(--inv-primary) 12%, transparent)`.
- [ ] **Font judul** memakai `font-[family-name:var(--inv-font)]`.
- [ ] Layout mobile-first. Undangan dirender di kolom `max-w-lg` — jangan mendesain
      untuk lebar desktop, jangan memakai `100vw` yang memicu scroll horizontal.
- [ ] Gambar memakai `next/image` dengan `width`/`height` (atau `fill` + parent relatif),
      dan `alt=""` untuk foto dekoratif.
- [ ] **Tanpa `"use client"`** kecuali benar-benar butuh state/efek (form, audio,
      countdown, cover). Komponen dekoratif = server component.
- [ ] Tanggal & jam lewat `formatEventDate()` / `formatTimeRange()` dari `../shared` —
      jangan format manual, agar konsisten `id-ID`.
- [ ] **Jangan** membungkus dengan `<Reveal>` — renderer yang melakukannya.
      Untuk animasi berurutan di dalam section, beri kelas `inv-stagger` pada
      container-nya (anak-anaknya akan muncul bertahap).
- [ ] Ornamen: `<CornerFloral className="inv-ornament inv-ornament--drift pointer-events-none absolute … text-[var(--inv-secondary)]" />`.
      Varian animasi: `inv-ornament` (sway), `--flip`, `--drift`, `--slow`.
      Ornamen selalu `pointer-events-none` dan `aria-hidden` (sudah ada di SVG-nya).
- [ ] Input di dalam undangan memakai kelas `.inv-input` (lihat `globals.css`).
- [ ] Section standar sebaiknya membungkus isinya dengan `<SectionShell>` +
      `<SectionTitle>` dari `../shared` agar ritme spasi antar section seragam,
      kecuali variant full-bleed (hero/cover).
- [ ] Overlay/fixed (`cover`, `music`, `navigation`) wajib menghormati `inCanvas`:
      di dalam builder harus render inline, bukan `fixed` (lihat `cover/shell.tsx`).

Kalau butuh ornamen baru: tambahkan fungsi SVG baru di `src/sections/ornaments.tsx`,
`viewBox` rapi, `stroke="currentColor"`/`fill="currentColor"`, tanpa warna hardcode,
menerima `className`, dan `aria-hidden`.

### Langkah 4 — Daftarkan variant di `index.ts` section-nya

```ts
import { HeroArch } from "./hero-arch";
export { …, HeroArch };

// di dalam `variants:`
arch: {
  name: "Foto Melengkung + Ornamen",          // Bahasa Indonesia, tampil di builder
  description: "Foto arch dengan bingkai sudut",
  component: HeroArch,
  propsSchema: HeroProps,                      // schema milik TYPE-nya, jangan bikin baru
  fields: [...heroBase, { kind: "image", key: "background_image", label: "Foto" }],
  styleOptions: [
    {
      key: "frame",                            // dibaca komponen sebagai p.s_frame
      label: "Bingkai",
      default: "ornament",
      options: [
        { value: "ornament", label: "Ornamen sudut" },
        { value: "plain", label: "Polos" },
      ],
    },
  ],
  defaultProps: { ...baseDefaults },
  // isPremium: true  → kalau variant ini untuk paket berbayar
},
```

Aturan:
- Key variant: `kebab-case` singkat dan deskriptif (`botanical`, `floating`, `arch`).
  **Key tidak boleh diubah setelah dipakai preset/undangan** — itu identitas di DB.
- `fields` hanya berisi field yang benar-benar dipakai komponen. Jangan menampilkan
  field yang tidak berpengaruh — membingungkan pengguna.
- Utamakan memakai kembali field/style option dari `fields.ts`; kalau sebuah field
  akan dipakai ≥2 section, pindahkan ke `fields.ts`.
- Placeholder gambar tidak ditaruh di `defaultProps`, tapi di `dummyProps()` milik
  section (lihat `hero/index.ts`) — dan harus idempoten (`if (!base.x) base.x = …`).
- `defaultProps` + default styleOption + `dummyProps` **wajib lolos `propsSchema`** —
  ini diuji otomatis oleh `src/sections/registry.test.ts`.

### Langkah 5 — Tambahkan preset template di `catalog.ts`

```ts
{
  id: "sage-emas-klasik",                    // kebab-case, unik, permanen
  name: "Sage Emas Klasik",
  description: "Satu-dua kalimat menjual, Bahasa Indonesia.",
  category: "wedding",                        // wedding|khitan|tahlil|aqiqah|engagement|generic
  tier: "free",                               // free|basic|premium
  thumbnail: "/templates/sage-emas-klasik/card",   // WAJIB `/templates/<id>/card`
  global_settings: {
    font_family: "Parisienne",
    color_primary: "#c48b39",
    color_secondary: "#90a77c",
    color_background: "#f4f6f2",
    animation: "zoom",
  },
  sections: [
    s("cover", "floating", 0, { names: "Firda & Wildan", … }),
    s("hero", "botanical", 1, { … }),
    …
  ],
}
```

Aturan preset:
- `order` naik dari 0 mengikuti urutan tampil.
- Isi props hanya yang berbeda dari `defaultProps`; sisanya diisi `hydrateTemplateSections`.
- Nilai `styleOption` ditulis sebagai `s_<key>` (mis. `s_palette: "cream"`).
- Thumbnail dibuat otomatis oleh `src/app/templates/[id]/card/route.tsx` (Satori) —
  **tidak perlu file gambar**. Satori hanya andal untuk aksara Latin; teks non-Latin
  (Arab) akan dibersihkan otomatis, jadi jangan bergantung padanya untuk kartu.
- Nama/alamat contoh: pakai data fiktif atau data yang memang sudah ada di repo.
  Jangan memasukkan data pribadi nyata dari sumber yang diekstraksi.

### Langkah 6 — Verifikasi

Jalankan semuanya, wajib hijau:

```bash
npm run typecheck
npm run lint
npm run test          # registry.test.ts + catalog.test.ts memvalidasi hasil kerja ini
npm run dev           # port 3030
```

Cek manual di browser:
1. `/templates` — kartu template baru muncul dan tidak rusak.
2. `/templates/<id>/preview` — seluruh section tampil, tidak ada scroll horizontal,
   tidak ada teks menabrak ornamen.
3. `/builder` — pilih variant baru: field di inspector benar, mengubah setiap
   `styleOption` benar-benar mengubah tampilan, mengosongkan field tidak membuat crash.
4. Lebar 360px dan 430px (mobile) — ini prioritas utama; desktop hanya kolom tengah.
5. Cover: tombol "Buka Undangan" menutup overlay dan animasi section mulai berjalan.
6. `prefers-reduced-motion` aktif → tidak ada animasi (sudah ditangani CSS, jangan
   menambahkan animasi inline yang melewatinya).

---

## 3. Kesalahan yang sering terjadi (hindari)

| Salah | Benar |
|---|---|
| `text-emerald-700`, `bg-[#f4f6f2]` di komponen | `text-[var(--inv-primary)]`, `bg-[var(--inv-bg)]` |
| `font-serif` untuk judul | `font-[family-name:var(--inv-font)]` |
| `<Reveal>` di dalam komponen variant | biarkan renderer; pakai `inv-stagger` untuk isi |
| `"use client"` di semua file | hanya untuk komponen interaktif |
| `<img>` biasa dari host acak | `next/image` + host terdaftar di `next.config.ts` |
| Membuat `propsSchema` baru per variant | pakai schema milik type di `schema.ts` |
| Menambah field wajib ke schema lama | tambahkan `optional()` / `.default()` |
| Mengganti key variant lama | buat key baru, key lama tetap hidup |
| Menyalin SVG/gambar dari website sumber | gambar ulang di `ornaments.tsx` |
| Menaruh URL gambar di `defaultProps` | taruh di `dummyProps()` section |
| Membuat section type baru untuk hal yang bisa jadi variant | tambah variant |

---

## 4. Keluaran yang diharapkan dari agent

Setiap tugas ekstraksi menghasilkan:

1. File variant baru di `src/sections/<type>/` (satu file per variant).
2. Registrasi variant di `src/sections/<type>/index.ts`.
3. Ornamen baru di `src/sections/ornaments.tsx` (kalau ada).
4. Field/style option bersama di `src/sections/fields.ts` (kalau dipakai ulang).
5. Satu preset baru di `src/lib/templates/catalog.ts`.
6. Semua perintah verifikasi di Langkah 6 hijau.
7. Ringkasan singkat: tabel pemetaan "bagian sumber → type/variant", daftar variant
   baru, dan hal yang sengaja **tidak** ditiru beserta alasannya.

Commit mengikuti gaya repo, contoh:
`feat(sections): "floating botanical" variants from the undangan_1 design`
`feat(templates): "Sage Emas Klasik" from the undangan_1 project`

Pisahkan commit variant/komponen dari commit preset template bila keduanya besar.
