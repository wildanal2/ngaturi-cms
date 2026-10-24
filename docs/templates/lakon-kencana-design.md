# Lakon Kencana — audit dan spesifikasi desain

Referensi: https://sowanan.com/danang-kinanthi (tanpa query). Diperiksa 17 Oktober 2026 di Chrome 155 melalui Playwright/CDP, viewport 1440×900, 390×844, 360×560, dan 844×390. Tidak ada form, ucapan, salinan rekening, unduhan QRIS, maupun transaksi yang dikirim ke referensi. Request selain GET/HEAD/OPTIONS diblokir. Bukti asli berada di `/tmp/ngaturi-sowanan-20261017/reference/`.

## Yang benar-benar terlihat

- Sampul langsung terbaca pada sampel awal setelah DOM tersedia; tidak terlihat spinner terpisah. Bukan bukti bahwa referensi tidak memiliki loader pada koneksi lain.
- Kertas gading bermotif kawung tipis, tinta cokelat tua, tepi emas dan sulur sudut. Gunungan berwarna emas mendominasi bagian bawah sampul; pita bawah gelap menampung CTA dan petunjuk geser. Referensi tanpa nama tamu pada URL bersih ini.
- Membuka menampilkan bayangan sepasang wayang dan tombol Lewati sebelum hero. Tiga sampel dari klik sampai Lewati hilang: 5529, 5533, 5532 ms (pengukuran Playwright di satu Chrome lokal, bukan angka performa umum).
- Desktop: foto hero lengkung besar di tengah, nama di sisi kiri/kanan, wayang kecil di bawah nama. Mobile: foto hampir selebar layar; nama putih di bagian bawah foto; detail tanggal sesudahnya.
- Urutan: hero → sepasang → lakon (4 babak) → pahargyan (jadwal/lokasi/kalender) → hitung mundur → simpingan → RSVP → hadiah → pangestu → penutup. Tidak terlihat section kutipan terpisah sebelum couple.
- Kartu couple berdampingan juga pada 390 px; ketukan membalik wayang menjadi foto, nama lengkap dan orang tua. Banyak teks kecil pada mobile.
- Lakon berlatar cokelat gelap dengan foto/teks berselang-seling pada desktop dan vertikal pada mobile. Tombol baca membuka uraian di tempat, bukan modal.
- Acara berlatar terang; jadwal dan lokasi terbaca, tautan peta/Google Calendar tersedia. Hitung mundur tampil sebagai bilah saron kuningan; ketukan menghasilkan nada. Musik referensi terdengar setelah pembuka. Tidak mengambil audio.
- Galeri berupa foto lengkung yang mengipas; foto depan diperbesar, sisi memilih index, panah dan indikator tersedia. Dialog native memiliki next/previous, keyboard, Escape; menutup mempertahankan scroll (6377 px pada sampel) dan fokus pemicu.
- RSVP bertahap: hadir/berhalangan → sendiri/berdua → nama/konfirmasi. Berhenti sebelum pengiriman. Gift memakai amplop yang dibuka; QRIS juga terlihat. Pangestu memiliki nama/pesan dan kartu ucapan. Penutup mengulang gunungan dan nama.
- Navigasi sisi kanan adalah pemilih paket/perangkat demo, bukan menu bab undangan. Musik 48 px berada kanan bawah. Pemilih demo menutupi sebagian konten mobile; tidak ditiru.
- Tipografi terukur: EB Garamond untuk judul (56 px desktop, 34 px mobile); Karla untuk isi; aksara Jawa pada label. Gerak cover/kartu dan pergantian galeri terlihat; detail implementasi parallax tidak diasumsikan. Scroll adalah alur dokumen biasa; tidak terlihat scroll hijacking atau adegan pinned wajib.

## Desain final sebelum kode

Nama: **Lakon Kencana**. ID tetap: `lakon-kencana`. Premium/wedding, komposisi `standard`. Konsep: undangan sebagai pementasan wayang yang hangat; kertas, kuningan, lengkung potret dan babak cerita, memakai artwork baru.

- Warna: kertas `#f5efe2`, permukaan `#e8dfcf`, tinta `#35271e`, cokelat `#38291f`, emas `#9b753f`, emas terang `#dfc899`. Teks isi menggunakan tinta/kertas; emas gelap hanya pada latar terang, emas terang pada gelap. Target kontras WCAG AA 4.5:1 untuk teks biasa; fokus jelas dengan outline.
- Nama/judul: Cormorant Garamond lokal milik proyek, Georgia/serif fallback. Isi dan kontrol: Inter lokal, system-ui/sans-serif fallback. Tidak menambahkan aksara Jawa otomatis yang berpotensi salah transliterasi; label Indonesia/Jawa Latin dapat diedit.
- Mobile: 20–24 px ruang sisi, judul 36–48 px, nama adaptif, foto hero lengkung, couple dua kolom selama muat lalu satu kolom di layar sempit/teks panjang. Desktop konten sampai 1120 px, hero tiga bidang, jadwal/story grid alami. Container queries membuat desktop Builder sama dengan renderer. Tidak ada lebar tetap yang memaksa overflow.
- Preset: loading, cover, hero, couple, quote (opsional nonaktif), story (opsional aktif dengan contoh), events, map (opsional nonaktif karena setiap event punya tautan lokasi), countdown, gallery, RSVP, gift (opsional nonaktif tanpa rekening), guestbook, closing. Music/navigation adalah chrome tanpa bab kosong sesudah closing.
- Seluruh isi memakai kontrak section yang sudah ada. Menambah/mengurutkan/mematikan section tetap memakai kebijakan komposisi standar. Tidak ada perubahan schema database/autosave/publish. Event aktif pertama menjadi sumber tanggal cover, hero dan countdown; jika kosong gunakan field tanggal hero/countdown. Help Inspector menjelaskan sumber ini.
- Artwork: gunungan dan pasangan wayang dibuat baru dengan imagegen; kawung/sulur/divider/thumbnail digambar vektor baru; foto demo pasangan fiktif dan still-life dibuat imagegen. Font lokal yang sudah tersedia. Tidak ada hotlink, artwork/foto/audio/branding/source vendor. Foto dan musik asli pengguna tetap melalui Builder; musik tidak disertakan sampai dipilih pengguna. Rekening contoh tidak ditampilkan dalam preset.
- Gerak: easing `cubic-bezier(.22,1,.36,1)`, feedback 160 ms, reveal 640 ms/18 px, flip 650 ms, cover 900 ms. Gunungan digeser atau CTA; gunungan keluar, bayangan wayang tampak sesaat, hero terbaca tanpa ritual 5.5 detik. `ngaturi:open` dipancarkan dalam gesture untuk shared audio. Offscreen tidak ada animasi kontinyu; teks tidak mengikuti parallax ketika dibaca.
- Satu pemilik scroll: dokumen publik atau DeviceFrame di Builder. Navigasi kecil sesudah opened: Awal/Mempelai/Acara/Galeri/RSVP sesuai section aktif yang benar-benar dirender. Tujuan memakai ID instance, active state mengikuti posisi; safe area dan clearance bawah diperhitungkan. Scroll programatis dapat dibatalkan wheel/touch/key; tidak ada autoplay scroll.
- Gallery: kipas lengkung, tap pusat membuka dialog, tap sisi/panah/swipe mengganti foto. Native dialog mengunci scroll, memulihkan fokus, mempertahankan index. Full-resolution URL opsional hanya dimuat setelah dibuka. Gestur horizontal tidak memblokir scroll vertikal.
- RSVP mempertahankan `useRsvp`, status `attending/not_attending/maybe`, hitungan 1–20 sesuai konfigurasi dan kontrak API; field jumlah hanya saat attending, nilai pengiriman 1 saat bukan attending. Tidak mengubah privasi pesan: catatan RSVP tetap privat, ucapan publik memakai `useGuestbook`. Pending, sukses, error/retry dan CAPTCHA memakai kontrak yang ada.
- Loading memakai boundary bersama dengan batas waktu yang ada. Cover pendek memakai grid/flex adaptif, area scroll hanya jika konten sungguh melampaui viewport, CTA selalu dapat dijangkau. Isi/chrome inert sebelum opened, keyboard fokus terjaga. Builder cover inline tanpa gate, bookmarks tetap bebas.
- Empty: opsional kosong tidak menghasilkan judul kosong. Foto gagal menampilkan simbol gunungan dan label bermakna. Audio gagal tidak menahan masuk. Peta tidak ditebak; tautan hanya dari data sah. Error/copy memakai live region. Reduced motion: lepas transform/reveal/parallax, entry langsung, kartu tetap dapat dibuka. Back/reload tidak membuat cover tertutup di posisi tengah; lifecycle dibersihkan pada unmount/route.

## Pemetaan

| Observasi referensi                       | Interpretasi Ngaturi                                       | Area implementasi            |
| ----------------------------------------- | ---------------------------------------------------------- | ---------------------------- |
| Gunungan dibuka/geser dan bayangan wayang | Gunungan baru + handoff singkat, shared open/audio         | cover, presentation, loading |
| Kertas kawung & sulur emas                | SVG orisinal, kepadatan tenang dan kontras terbaca         | assets, CSS/primitives       |
| Hero foto lengkung/nama mengapit          | Hero responsif berbasis container dan foto editable        | hero                         |
| Wayang membalik menjadi profil            | Kartu flip keyboard/touch, nama/keluarga selalu tersedia   | couple                       |
| Lakon babak/uraian inline                 | Items story editable + details yang tumbuh alami           | story                        |
| Jadwal dan tindakan praktis               | Semua event independen, calendar helper yang sudah ada     | events/map                   |
| Countdown saron yang dimainkan            | Bilah kuningan, nada sintesis singkat atas ketukan saja    | countdown                    |
| Galeri simpingan kipas                    | Carousel lengkung + native lightbox yang menjaga posisi    | gallery/dialog               |
| RSVP bertahap dan amplop                  | Pilihan jelas dalam shared form; amplop terbuka untuk copy | forms/gift                   |
| Pemilih demo menutupi isi                 | Menu bab aksesibel dengan clearance; tanpa kontrol demo    | navigation/music             |
| Gunungan penutup                          | Penutup aktual terakhir, bukan append chapter generik      | closing/catalog              |

## Validasi yang direncanakan

Tes integrasi registry/hydration/merge (identitas, media, visibility, order), tanggal/calendar dan nav. Typecheck, ESLint/Prettier scoped, Next production build dan vinext build jika environment mendukung, `git diff --check`. Browser production di 360/390/430/768/1440 px, short/landscape, public dan Canvas/Inspector dengan fixture lokal; semua API dimock. Screenshot cover/hero/couple/events/gallery/RSVP/closing, rekaman interaksi, kegagalan media, optional kosong, multiple events, resize/keyboard/reduced motion dan regresi template yang sudah ada. Tidak ada commit/push/deploy atau data remote.

## Penyempurnaan setelah pemeriksaan native

Foto demo kartu mempelai memakai sumber potret yang sama dengan hero agar wajah tidak hilang pada lengkung mobile; foto lanskap tetap untuk babak cerita/galeri. Semua sumber foto tetap editable dan tidak mengganti media tersimpan pengguna.

Builder asli menunjukkan overflow tiga panel di ponsel. Penyesuaian UI bersama menambah tab Bagian/Pratinjau/Isi, status simpan terlihat, bookmark saat kembali ke preview, dan preset kompak 320×720 untuk Lakon Kencana pada layar kecil. Preview tetap mounted saat panel lain terbuka; handler autosave/publish tetap sama. Desktop dan template lama diperiksa sebagai regresi. Hasil penerimaan, bukti dan batasan tercatat pada laporan terpisah.
