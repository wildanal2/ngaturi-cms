# Laporan Lakon Kencana — checkpoint sebelum audit isolasi

> **Audit lanjutan:** keadaan akhir kini dijelaskan pada [audit isolasi](./lakon-kencana-isolation-audit.md). Dokumen ini menyimpan checkpoint implementasi sebelum isolasi. UI tab mobile/preset kompak dan angka penerimaan di bawah merupakan bukti revisi lama; Builder sekarang mempertahankan drawer/dock dari commit lokal `fd1ef044716b0a92785343862d5dcb8a61542d76`. Hasil audit terbaru memakai build dan pengujian baru.

Template baru **Lakon Kencana** (`lakon-kencana`), kategori wedding/premium, selesai di branch lokal `template/lakon-kencana`. Repository terverifikasi: `wildanal2/ngaturi-cms`. Tidak ada commit, push, merge, deploy, publikasi, atau perubahan data remote.

## 1. Referensi yang diverifikasi

[Danang–Kinanthi, Sowanan](https://sowanan.com/danang-kinanthi) dibuka pada Chrome 155 melalui Playwright/CDP di 1440×900 dan 390×844, ditambah 360×560 dan 844×390. Seluruh alur dibaca; tidak mengirim form, ucapan, atau transaksi. Request selain GET/HEAD/OPTIONS diblokir.

Ciri teramati: kertas gading/kawung, tinta cokelat, sulur emas, gunungan pembuka dan bayangan wayang, hero potret lengkung, kartu mempelai flip, kisah per babak, jadwal, countdown saron, galeri simpingan, RSVP bertahap, amplop hadiah, pangestu, penutup. Desktop menempatkan nama di kedua sisi foto; mobile menempatkannya di dalam foto. Pemilih paket/perangkat di sisi kanan adalah kontrol demo dan menutupi sebagian isi mobile.

Tiga sampel klik sampai tombol Lewati hilang: 5529/5533/5532 ms, termasuk waktu otomasi, pada satu browser lokal. Tidak menyimpulkan performa umum atau implementasi parallax dari sampel tersebut. Audit dan pemetaan lengkap: [spesifikasi desain](./lakon-kencana-design.md). Bukti referensi: `/tmp/ngaturi-sowanan-20261017/reference/`.

## 2. Keputusan desain

Komposisi `standard`, dengan scroll dokumen publik atau scroller DeviceFrame di Builder. Palet kertas `#f5efe2`, tinta `#35271e`, cokelat `#38291f`, emas `#9b753f`; Cormorant Garamond/Georgia untuk nama dan judul, Inter/system-ui untuk isi. Kontras warna bawaan teks utama: 12.55:1 pada kertas, 12.18:1 pada bidang gelap. Emas merupakan aksen dekorasi; pasangan emas/kertas 3.66:1 tidak dipakai untuk paragraf isi.

Artwork, proporsi, teks, dan foto baru. Pembuka dipersingkat dengan gunungan yang dapat digeser; menu bab ditambahkan untuk akses praktis. Label Indonesia/Jawa Latin dapat diedit. Tidak melakukan transliterasi aksara Jawa otomatis.

## 3. Section dan interaksi

Default: loading → cover → hero → mempelai/keluarga → story → acara → countdown → galeri → RSVP → ucapan → closing. Quote, lokasi terpisah, dan gift tersedia sebagai opsi; default gift kosong dan nonaktif. Music/navigation adalah kontrol mengambang. Closing merupakan akhir konten default.

Opening memiliki gate fokus, penerima cadangan, CTA yang dapat dijangkau pada layar pendek, dan percobaan shared audio dalam gesture pembuka. Loader bersama memiliki batas 2.5 detik ditambah dissolve. Foto gagal, termasuk kegagalan sebelum hidrasi, memiliki fallback. Audio gagal tidak menghalangi masuk.

Kartu flip, story inline, beberapa acara, tautan peta/kalender, bilah saron dengan nada opt-in, galeri kipas, lightbox keyboard/touch, dan pemulihan posisi/fokus tersedia. Jika pemicu galeri lama sudah tersembunyi, fokus kembali ke foto aktif. Navigasi mengikuti section yang benar-benar dirender dan bisa diinterupsi input baru. Reduced motion menonaktifkan gerak.

Acara aktif pertama menjadi sumber tanggal cover/hero/countdown; tanggal tersimpan ISO diterjemahkan ke hari acara di WIB. Kalender memakai helper yang sudah ada dengan hari WIB yang sama, dan hanya ditawarkan untuk rentang waktu lengkap yang valid. Tidak menebak koordinat venue.

RSVP memakai `useRsvp`; status, jumlah tamu, pending/error/retry/sukses mengikuti kontrak API. Catatan RSVP tetap privat. Ucapan memakai `useGuestbook`, batas 25/255 karakter, dan semantik moderasi publik yang sama. Gift menggunakan clipboard dengan feedback berhasil/gagal.

## 4. Aset dan isi yang perlu diisi pemilik

Semua artwork bitmap dan foto demo dibuat baru melalui built-in imagegen; SVG kawung/sulur/pita dibuat khusus. Font lokal proyek dipakai kembali. File runtime ada di `public/themes/lakon-kencana/`, sekitar 1.9 MiB termasuk foto resolusi penuh yang dimuat saat lightbox dibuka. [Sumber, prompt lengkap, dan inventaris aset](../../public/themes/lakon-kencana/README.md).

Foto demo adalah pasangan sintetis, bukan foto mempelai referensi. Kedua kartu mempelai sengaja memakai potret pasangan yang sama sebagai demo, dengan caption masing-masing; bukan potret individu terpisah. Pemilik sebaiknya menggantinya dengan foto pribadi masing-masing. Hero, kedua kartu, babak terakhir dan foto pertama galeri memakai `demo-portrait.webp` 900×1350, 209.110 byte. Versi penuh 1024×1536, 389.114 byte dimuat saat lightbox dibuka. Thumbnail 800×600 memakai artwork gunungan sendiri, bukan foto pasangan. Hero memakai `object-fit: cover` dengan posisi editable (default 50% 35%); kartu memakai cover/center dan image picker/crop bersama. Posisi ini tidak menjamin focal point setiap foto pengguna: sesuaikan crop melalui Builder. Uji upload mempelai wanita mengganti satu sumber tanpa mengubah foto mempelai pria. Untuk undangan nyata, pemilik perlu mengisi identitas, foto, tanggal/jadwal, venue/alamat/tautan Maps, lagu yang boleh dipakai, serta rekening bila gift diaktifkan. Artwork utama tersedia; tidak ada artwork vendor yang perlu diambil. QRIS referensi tidak ditambahkan karena kontrak Gift saat ini berupa rekening/e-wallet.

## 5. File berubah menurut tujuan

| Tujuan                                               | Area                                                                                                                                                                                                                 |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identitas/preset dan perlindungan konten             | `src/lib/templates/catalog.ts`, `hydrate.ts`                                                                                                                                                                         |
| Registrasi 16 varian standar                         | `src/sections/{loading,cover,hero,couple,story,quote,events,map,countdown,gallery,rsvp,guestbook,gift,closing,music,navigation}/index.ts`                                                                            |
| Tampilan, lifecycle, data, form, galeri, chrome      | `src/sections/lakon-kencana/`                                                                                                                                                                                        |
| Renderer, Builder/thumbnail, preview/card, readiness | `src/lib/invitation/renderer.tsx`, `src/components/builder/{canvas,variant-thumb,builder-shell,top-bar}.tsx`, `devices.ts`, `src/app/templates/[id]/{preview/page,card/route}.tsx`, `src/sections/loading/assets.ts` |
| Aset dan dokumentasi                                 | `public/themes/lakon-kencana/`, `docs/templates/lakon-kencana-*.md`                                                                                                                                                  |
| Pengujian yang dapat diulang                         | `integration.test.tsx`, `scripts/prepare-lakon-kencana-validation.mjs`, `scripts/verify-lakon-kencana.mjs`, `scripts/fixtures/lakon-kencana/`                                                                        |

Logika handler autosave/publish, API, schema database, konfigurasi deployment, dan berkas desain template lama tidak diubah. Penyesuaian Builder bersama terbatas pada panel responsif, kontrol atas, bookmark panel, dan preset perangkat tambahan. Fixture hanya disalin menjadi route di build sementara; tidak masuk route produksi repository.

## 6. Screenshot

| Keadaan  | Bukti mobile                                                        |
| -------- | ------------------------------------------------------------------- |
| Cover    | [cover](/tmp/ngaturi-sowanan-20261017/final-evidence/cover.png)     |
| Hero     | [hero](/tmp/ngaturi-sowanan-20261017/final-evidence/hero.png)       |
| Mempelai | [couple](/tmp/ngaturi-sowanan-20261017/final-evidence/couple.png)   |
| Acara    | [events](/tmp/ngaturi-sowanan-20261017/final-evidence/events.png)   |
| Galeri   | [gallery](/tmp/ngaturi-sowanan-20261017/final-evidence/gallery.png) |
| RSVP     | [rsvp](/tmp/ngaturi-sowanan-20261017/final-evidence/rsvp.png)       |
| Penutup  | [closing](/tmp/ngaturi-sowanan-20261017/final-evidence/closing.png) |

Semua screenshot ringkasan di atas diambil ulang setelah perubahan potret pada build final. Detail tambahan: [couple desktop](/tmp/ngaturi-sowanan-20261017/final-evidence/couple-1440-detail.png), [akad](/tmp/ngaturi-sowanan-20261017/final-evidence/events-1.png), [resepsi](/tmp/ngaturi-sowanan-20261017/final-evidence/events-2.png), [tombol RSVP](/tmp/ngaturi-sowanan-20261017/final-evidence/rsvp-action.png), [alamat panjang](/tmp/ngaturi-sowanan-20261017/final-evidence/long-content.png), [Builder 390](/tmp/ngaturi-sowanan-20261017/final-evidence/builder-mobile-preview.png), [Builder desktop](/tmp/ngaturi-sowanan-20261017/final-evidence/builder-desktop.png), [field Inspector mobile](/tmp/ngaturi-sowanan-20261017/final-evidence/builder-390-fields.png) dan [field Inspector desktop](/tmp/ngaturi-sowanan-20261017/final-evidence/builder-1440-fields.png). Set tujuh viewport setelah perubahan potret: `/tmp/ngaturi-sowanan-20261017/acceptance-portrait-accepted/`. Perbandingan mempertahankan ritme terang/gelap, hierarki nama, potret lengkung dan motif wayang; artwork lebih ringan, aksara memakai Latin, menu bab baru, dan RSVP menampilkan detail setelah pilihan kehadiran. Tidak mengklaim replika atau kesetaraan artwork.

## 7. Rekaman

[Interaksi lokal](/tmp/ngaturi-sowanan-20261017/final-evidence/interaction.webm): pembuka, flip, navigasi acara, galeri/lightbox, pilihan RSVP, dan penutup. Semua interaksi memakai fixture lokal.

## 8. Hasil validasi

| Pemeriksaan                                                   | Hasil                                                                                                                                                                                                                                      |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Vitest terkait template/section/hydration/merge/form/renderer | **PASS: 267 tes, 15 file** sebelum dua path foto default diganti; **18 tes integrasi/1 file PASS** sesudahnya, subset yang sama dan tidak dijumlah ulang ([log](/tmp/ngaturi-sowanan-20261017/tests-portrait-final.log))                   |
| Browser produksi                                              | **PASS: 374 assertion unik, 31 skenario** ([rekap](/tmp/ngaturi-sowanan-20261017/acceptance-all.json))                                                                                                                                     |
| Pemeriksaan checkpoint tambahan                               | **PASS: 30 pemeriksaan terpisah** potret/build ID, kedua acara, CTA RSVP, konten panjang, upload independen, runtime/hidrasi dan Builder ([bukti](/tmp/ngaturi-sowanan-20261017/final-evidence/checkpoint.json)); tidak ditambahkan ke 374 |
| `npm run typecheck`                                           | **PASS**                                                                                                                                                                                                                                   |
| ESLint seluruh TS/TSX/MJS yang berubah, `--max-warnings 0`    | **PASS: 41 file, 0 error/0 warning**                                                                                                                                                                                                       |
| Prettier scoped                                               | **PASS: 45 file TS/TSX/MJS/CSS/MD; empat SVG berhasil diparse sebagai XML**                                                                                                                                                                |
| `npm run build -- --webpack`                                  | **PASS, Next.js 16.3.3; sesudah perubahan potret, dijalankan melalui server standalone; live BUILD_ID cocok dengan build**                                                                                                                 |
| `npm run build:vinext`                                        | **FAIL packaging standalone:** `__CLOUDFLARE_MODULE__CompiledWasm__`; kelima tahap kompilasi selesai. Kegagalan identik direproduksi pada HEAD bersih sebelum perubahan template.                                                          |
| `git diff --check`                                            | **PASS**                                                                                                                                                                                                                                   |
| Perbandingan katalog terhadap HEAD                            | **PASS: sembilan preset lama identik; 12 preset perangkat dan default/fallback tetap identik**                                                                                                                                             |

Build menggunakan salinan sumber terisolasi, dependency proyek yang sama, konfigurasi uji palsu, dan cache webpack dimatikan setelah disk lingkungan penuh. Prefetch halaman akun ditahan di fixture agar tidak menyentuh autentikasi; origin kanonis uji memakai HTTPS localhost tanpa memerlukan perubahan guard produksi. Semua API, upload, clipboard, dan POST Server Action pada penerimaan browser dimock. Native Canvas/Inspector/SectionList/BuilderShell tetap memakai komponen dan handler asli. Hasil mock autosave membuktikan serialisasi/frontend; tidak membuktikan persistensi database atau publikasi nyata.

Coverage: 360/390/430/768/1440 px, short/landscape, cover hingga closing, swipe dan keyboard, scroll biasa dan interupsi, resize saat membaca/mengetik, nama/alamat panjang, beberapa jadwal, media gagal, opsi kosong/nonaktif, reduced motion, galeri panjang, serta Gerbang Puspa/Cinematic Vintage/Serambi Delima. Pengujian RSVP/ucapan mencakup validasi, pending, kegagalan, retry, sukses dan moderasi; clipboard keberhasilan/kegagalan dan audio gesture/failure juga diperiksa. Setiap skenario browser memeriksa exception runtime halaman. Pemeriksaan checkpoint pada publik normal/long-content serta Builder 390/1440 tidak menemukan exception runtime maupun diagnostik hidrasi. Console tetap mencatat 404 script analitik Vercel pada localhost dan request gambar eksternal thumbnail varian lama yang diblokir fixture; URL dan kegagalan request dicatat terpisah dalam [resource-diagnostics.json](/tmp/ngaturi-sowanan-20261017/final-evidence/resource-diagnostics.json). Tidak mengklaim console sepenuhnya bersih atau audit aksesibilitas formal.

Pengukuran lokal: FCP 416–456 ms; loading-state `complete` 1173–1217 ms sejak navigasi; gesture `ngaturi:open` sampai state `opened` 903.8–905.1 ms. Tercatat 38 resource dengan jumlah `transferSize` 1,551,119 byte (dokumen HTML tidak termasuk). State `opened` bukan pengukuran paint teks hero atau FPS. Metode dan sampel mentah: [performance.json](/tmp/ngaturi-sowanan-20261017/final-evidence/performance.json). Sampel diambil ulang setelah perubahan potret: tiga konteks Chrome 155 baru di Linux/localhost, production standalone, emulasi 390×844, DPR 1, server sudah berjalan, tanpa pembatasan CPU/jaringan; interception menonaktifkan cache. Host/browser dipakai bersama. Ini bukan hasil perangkat fisik, pengukuran FPS, atau sertifikasi Core Web Vitals.

## 9. Batasan

Builder mobile diperbaiki setelah inspeksi native menemukan tiga panel menambah lebar dokumen. Di bawah 1024 px tersedia tab Bagian/Pratinjau/Isi; preview tetap terpasang agar pemilik scroll/scene tidak kehilangan geometri. Pemilihan section membuka Inspector dan kembali ke preview mempertahankan bookmark. Status simpan dan kontrol utama terlihat di ponsel. Preset tambahan 320×720 digunakan untuk entry Lakon Kencana di layar di bawah 400 px; dua belas preset lama serta default/fallback tetap identik. Regresi Builder Gerbang Puspa/Cinematic Vintage di desktop dan mobile lulus. [Screenshot mobile](/tmp/ngaturi-sowanan-20261017/acceptance-builder-accepted/builder-mobile-390.png).

Percobaan vinext terakhir mendahului perubahan dua string path foto default; build Next dan verifikasi browser sesudah perubahan tersebut sudah selesai. Log build Worker: [implementasi sebelum dua string potret](/tmp/ngaturi-sowanan-20261017/build-vinext-final.log) dan [baseline HEAD](/tmp/ngaturi-sowanan-20261017/build-vinext-baseline.log). Identitas HEAD `4f86de75782c4c44216a599e4caf437331bd90e4`; 547 file sumber/worker/config/package di mirror baseline identik terhadap HEAD ([manifest](/tmp/ngaturi-sowanan-20261017/baseline-source-proof.json)). Build Worker keseluruhan belum lulus; konfigurasi/infrastruktur tidak diubah untuk menutupi kegagalan yang sudah ada.

Backend autentik, penyimpanan autosave, CAPTCHA/provider, pengiriman tamu nyata, Worker runtime, dan perangkat fisik tidak diuji. Tidak ada kiriman produksi. Bunyi saron merupakan interpretasi sintetis pendek, bukan rekaman gending referensi. Tidak ada QRIS dan tidak menyalin kontrol pemilih paket demo.

## 10. Pelestarian

Sembilan preset lama identik terhadap HEAD; tiga template pembanding lulus regresi browser. Tes merge mempertahankan ID, visibilitas, identitas, media milik pengguna, serta nilai tersimpan; render memakai authored order. Section baru yang tidak ada dalam undangan lama tidak menyisipkan identitas, foto, cerita, atau acara fiktif. Tidak ada migrasi data atau perubahan handlers keuangan/autosave/publikasi. Index git tetap kosong dan seluruh perubahan lokal pada `template/lakon-kencana`, belum di-commit. `tsconfig.tsbuildinfo` dihasilkan ulang oleh typecheck; karena berkas tersebut bersih sebelum tugas, hasil generated dipulihkan ke HEAD. Tidak ada deploy formal. Source berada di worktree DEV bersama; server DEV yang memantau worktree yang sama dapat menampilkan edit lewat HMR. Server/peramban yang sudah ada tidak dihentikan; hanya server validasi milik tugas pada port 3061 dibersihkan setelah bukti selesai.

## 11. Penutupan checkpoint

Implementasi/desain tidak dimulai ulang saat resume. Perubahan setelah checkpoint berupa penuntasan bukti dan dokumentasi: potret produksi diverifikasi, screenshot/rekaman diganti dengan hasil build terakhir, upload per mempelai diperiksa, ukuran payload diukur, placeholder performa diisi, serta lint/format diperiksa. [Timeline bukti](/tmp/ngaturi-sowanan-20261017/evidence-index.json) membedakan pemeriksaan sebelum/sesudah perubahan potret. [Manifest 37 file sumber](/tmp/ngaturi-sowanan-20261017/production-source-manifest.json) cocok dengan mirror build final.

374 assertion/31 skenario dihitung dari nama skenario unik; rerun Builder, reduced motion dan sembilan skenario potret menggantikan hasil sebelumnya. Rerun 194 assertion/9 skenario setelah potret sudah termasuk 374, bukan tambahan. 30 pemeriksaan checkpoint dicatat terpisah.

Node exit 1 berhasil diidentifikasi: wrapper `execFileSync` gagal karena Prettier tidak memiliki parser otomatis `.svg`, bukan kegagalan produk. Pemeriksaan scoped 45 file dan parsing empat SVG kemudian exit 0. Exit 143 berasal dari SIGTERM yang disengaja sebelum rebuild: perintah hanya memilih listener 3061 setelah memverifikasi cwd standalone mirror. Session lama dikonfirmasi exit 143; penggantinya melayani BUILD_ID dan bytes aset terbaru, dengan symlink `public` serta `.next/static` yang benar. [Rincian pemulihan](/tmp/ngaturi-sowanan-20261017/checkpoint-recovery.json).
