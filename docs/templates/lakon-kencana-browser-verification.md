# Lakon Kencana — verifikasi temporal dan commit lokal

24 Oktober 2026, branch `template/lakon-kencana`, HEAD awal `4f86de75782c4c44216a599e4caf437331bd90e4`. Laporan 17/23 Oktober diperlakukan sebagai bukti historis; hasil baru di bawah diperoleh dari source saat ini. Artefak berada di `/tmp/ngaturi-lakon-browser-20261024/`, tidak dimasukkan Git.

**Kesimpulan:** entrance benar-benar berjalan pada public dan Canvas. Pengukuran mengambil computed opacity/transform dan progress WAAPI sebelum, selama, serta sesudah efek. Tidak ditemukan bug produk baru yang memerlukan perubahan runtime. Penambahan task ini adalah `scripts/verify-lakon-motion-timing.mjs` dan dokumentasi penerimaan. Motion/integrasi/aset yang sudah ada ikut diselesaikan dalam commit lokal karena sebelumnya belum committed.

## Bukti baru

Build Next production di harness route kecil mengimpor `InvitationRenderer`, `BuilderShell`, Canvas, store dan Inspector asli langsung dari repository. Tidak membuat mirror/full repository copy dan tidak menulis output aktif DEV. Environment fake lokal; seluruh API dan Server Action POST dimock, origin luar diblokir. Tidak ada mutasi remote.

| Permukaan      | 320 px normal/reduced | 390 px normal/reduced | 1440 px normal/reduced |
| -------------- | --------------------- | --------------------- | ---------------------- |
| Public         | PASS / PASS           | PASS / PASS           | PASS / PASS            |
| Builder Canvas | PASS / PASS           | PASS / PASS           | PASS / PASS            |

**12 skenario temporal PASS**. Setiap entrance yang tercatat pada lintasan ini menunjukkan progress antara 0–1, opacity perantara, perubahan transform, lalu opacity akhir 1. Public mencatat 26 target pada tiap lebar; Canvas 25/25/23 target pada 320/390/1440. Angka ini adalah cakupan lintasan probe, bukan jumlah seluruh animasi template. Reduced motion mencatat nol entrance. Satu target tidak dimulai dua kali selama satu mount, termasuk setelah lompatan cepat.

Contoh sampel public 390 px, hero: DOM sebelum trigger `opacity:1; transform:none`; awal animasi `0,25 / translateY(20px)`; sekitar currentTime 33 ms `0,428 / 15,257px`; sekitar 133 ms `0,788 / 5,650px`; akhir `1 / none`. Stagger tertunda 90/180 ms tercatat pada efek hero. Data mentah memuat timestamp, currentTime, progress, playState, opacity, transform, ukuran dan root; bukan hanya nama class atau observer.

- Opening: cover opacity benar-benar berinterpolasi, layer gunungan/bayangan terlihat bergerak dalam rekaman; lifecycle existing 900 ms tetap. Angka 904,2 ms dari 23 Oktober adalah hasil lama, tidak diklaim diukur ulang identik.
- Couple: kedua kartu masuk dengan entrance; pada public, flip menampilkan matriks 3D perantara menuju rotateY(180deg), disertai reveal detail.
- Event: heading dan kedua kartu terukur berinterpolasi, termasuk kartu kedua pada mobile. Venue/waktu/action tetap berada dalam flow.
- Galeri: entrance isi foto terukur; transform kipas berubah selama pergantian, lalu settle. Lightbox public membuka/menutup dan mengembalikan kontrol. Canvas diuji melalui keyboard carousel.
- Form: entry RSVP/guestbook terukur; posisi input tetap saat mengetik. Di Canvas pengujian mengetik memakai input Buku Tamu yang langsung tersedia.
- Closing: opacity dan translateY berubah sampai resting state. Tidak ada konten yang tersangkut transparan setelah fast scroll/jump.
- Parallax: kedua wayang bergerak berlawanan saat scroll pada public desktop dan Canvas berukuran logis Desktop. Pada reduced motion translate dekoratif kosong. Teks praktis tetap stabil.
- Feedback tombol: sampel tekan navigasi pada 0/40/80/120/160 ms menunjukkan translateY `0 / 0,538 / 0,822 / 0,953 / 1px`, lalu pulih.

Canvas mempertahankan kontrak seleksi Builder: click capture pada section memilih bagian untuk Inspector. Probe awal yang menuntut klik kartu Canvas berperilaku seperti public tidak dipakai untuk mengubah kontrak tersebut. Flip/lightbox diuji sebagai interaksi tamu pada public, sementara entrance Canvas dan carousel melalui keyboard benar-benar diukur. Probe awal lain memakai selector label `Kenali` yang berubah setelah flip sehingga menunjuk kartu berikutnya; verifier diperbaiki memakai target stabil dan scope Canvas agar thumbnail Inspector tidak ikut terhitung.

Bukti: [12 hasil temporal](/tmp/ngaturi-lakon-browser-20261024/temporal-final/timing-results.json), [data public 390](/tmp/ngaturi-lakon-browser-20261024/temporal-final/public-390-normal.json), [data Canvas 390](/tmp/ngaturi-lakon-browser-20261024/temporal-final/builder-390-normal.json), [rekaman mobile 21,28 detik](/tmp/ngaturi-lakon-browser-20261024/lakon-motion-mobile.webm), [contact sheet](/tmp/ngaturi-lakon-browser-20261024/contact.png), [feedback tombol](/tmp/ngaturi-lakon-browser-20261024/button-proof.json).

## Lifecycle, resize dan template lama

- Client navigation setelah closed/opened: listener Lakon lama terlepas (1/84 pada snapshot), pending RAF Lakon nol, root lama hilang, overflow/scroll padding pulih dan history restoration kembali `auto`. Node audio lama terlepas dan paused; halaman penerus mempunyai paling banyak satu audio controller. Pada browser ini media berhenti saat node dilepas; probe tidak mengharuskan panggilan eksplisit `pause()` bila browser sudah menghentikannya. [Bukti](/tmp/ngaturi-lakon-browser-20261024/lifecycle-proof.json).
- Resize/orientasi/keyboard: reading anchor, draft input dan fokus terjaga; input pengguna membatalkan perjalanan navigasi. **1 skenario/16 assertion PASS**, dijalankan ulang dari verifier yang ada. [Hasil](/tmp/ngaturi-lakon-browser-20261024/resize/results.json).
- Chunk thumbnail Lakon ditahan **1600 ms**: Inspector dan field tetap tampil saat pending, thumbnail terpasang sesudahnya, Canvas Gerbang tidak menerima root Lakon. [Bukti](/tmp/ngaturi-lakon-browser-20261024/thumbnail-proof.json), [screenshot pending](/tmp/ngaturi-lakon-browser-20261024/thumbnail-pending.png).
- **6 skenario Gerbang/Cinematic PASS**: public 390/1440 serta Builder/Inspector. Fresh public tidak memuat stylesheet/aset Lakon; computed style heading Canvas tetap sama setelah thumbnail dimuat. Core Cinematic tetap terkunci; picker thumbnail Buku Tamu yang tidak terkunci juga dibuka. [Hasil](/tmp/ngaturi-lakon-browser-20261024/old-templates/motion-results.json).
- Tidak ada runtime/hydration error yang diamati. Tidak ada observer atau controller duplikat pada jalur yang diuji.

## Validasi dan reuse

**Baru dijalankan:** 306 tes pada 19 file PASS, mencakup motion/integrasi Lakon, katalog/hydration/registry, Gerbang, representasi Cinematic, form, musik dan loading. Angka 81 tes sebelumnya adalah subset dan tidak dijumlahkan lagi. Typecheck, scoped ESLint `--max-warnings 0`, scoped Prettier, build Next production terisolasi dan `git diff --check` lulus.

[Log tes](/tmp/ngaturi-lakon-browser-20261024/tests.log), [typecheck](/tmp/ngaturi-lakon-browser-20261024/typecheck.log), [lint](/tmp/ngaturi-lakon-browser-20261024/lint.log), [format](/tmp/ngaturi-lakon-browser-20261024/format.log), [build current](/tmp/ngaturi-lakon-browser-20261024/build.log).

**Reuse terbatas:** Dari 63 fingerprint sumber/artefak input akhir task 23 Oktober, seluruh source produksi cocok. Perubahan pada input lama hanya penambahan tautan laporan terbaru di dokumentasi motion. Hasil kontrak form mock, state pending/error/moderasi, copy gift, musik gesture, dan full-project Next build 23 Oktober dipakai sebagai bukti tambahan yang tidak dihitung sebagai eksekusi baru. [Proof hash](/tmp/ngaturi-lakon-browser-20261024/reuse-proof.json). Tidak mengulang audit isolasi/pixel-diff lengkap, backend/CAPTCHA/provider nyata, perangkat fisik atau vinext baseline `CompiledWasm` yang tidak terdampak.

## Review dan scope commit

Index awal kosong. Semua tracked diff dan file untracked diperiksa, termasuk metadata varian, registry, lazy boundary, hydration, seluruh modul/aset Lakon, fixture/verifier dan dokumen. Asset WEBP/SVG orisinal beserta provenance ikut masuk; tidak ada build, cache, rekaman, environment, secret atau temporary output dalam manifest staging.

1. Koreksi Gerbang dipisahkan: `src/sections/gerbang-puspa/foundation.module.css` dan `src/sections/map/map-gerbang-puspa.tsx`. Selector mempertahankan cascade antar scene ketika CSS lazy dimuat; marker location dibatasi Canvas. Tidak mengubah deklarasi desain atau data.
2. Lakon mencakup template dasar + motion sekaligus karena keduanya belum committed: app card/preview, katalog/hydrate, renderer, registry/loading/dummy guards, integrasi Canvas/thumbnail, modul/aset, tes, fixture/verifier dan dokumentasi. Canvas di-stage tanpa hunk spacing Builder yang terpisah.
3. Empat file Builder (`builder-shell.tsx`, `device-frame.tsx`, `section-list.tsx`, `top-bar.tsx`) dan hunk responsive padding Canvas tetap **uncommitted dan tidak diubah**. Keempat file cocok dengan `fd1ef04`, tetapi merupakan pekerjaan layout terpisah, bukan kebutuhan commit Lakon. Tidak menyalin ulang histori Builder itu ke commit template.

Untuk memastikan commit tetap lengkap tanpa empat file tersebut, overlay kandidat kecil memuat hanya empat versi Builder dari HEAD dan Canvas yang akan di-stage; file lain berupa symlink, bukan salinan repository. Build production kandidat lulus. Canvas kandidat juga lulus pengukuran temporal desktop normal/reduced; hasil reduced diganti oleh rerun terisolasi, bukan dijumlahkan dengan probe awal yang gagal pada pemeriksaan dekorasi reduced ketika pemeriksaan browser berjalan bersamaan. Kegagalan itu tidak tereproduksi pada rerun terisolasi; penyebab pastinya tidak ditetapkan. Tidak mengubah dukungan reduced motion. [Build kandidat](/tmp/ngaturi-lakon-browser-20261024/candidate-build.log), [normal](/tmp/ngaturi-lakon-browser-20261024/candidate-proof/timing-results.json), [reduced rerun](/tmp/ngaturi-lakon-browser-20261024/candidate-reduced-recheck/timing-results.json).

Snapshot status, manifest explicit path, staging review dan hash commit lokal disimpan pada direktori evidence task. Tidak ada push, merge, deploy, publish atau mutasi remote. Hanya server/browser validasi task yang dihentikan; shared DEV, Docker dan Chrome dipertahankan.
