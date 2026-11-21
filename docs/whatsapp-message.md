# Pesan WhatsApp Undangan per-tamu

## Audit dan implementasi

Halaman `src/app/(dashboard)/invitations/[invitationId]/guests/page.tsx` memverifikasi sesi dan kepemilikan undangan, mengambil daftar tamu, serta membentuk base URL dari `BETTER_AUTH_URL` dan slug. `GuestManager` sebelumnya merakit teks WA langsung dalam `waLink`. Tautan personal tetap `${baseUrl}?to=${guest.slugToken}`; `Salin link` tetap menyalin tautan itu. `Kirim WA` tetap membuka `wa.me` di tab baru dan menjalankan `markGuestSent`. Status terkirim berarti tombol telah diklik, bukan bukti pengiriman dari WhatsApp.

`requireUser` memakai sesi Better Auth dan memeriksa status akun aktif. Authorization memakai query dengan kedua kondisi `invitations.id` dan `invitations.userId`. Server actions tamu yang ada menggunakan pola yang sama serta `revalidatePath`.

Redis yang tersedia adalah `@/lib/redis`, dengan interface `get`, `set`, dan `delete`. Runtime memilih REST (`REDIS_REST_URL`, `REDIS_REST_TOKEN`) atau TCP yang dipilih eksplisit (`REDIS_TRANSPORT=tcp`, `REDIS_URL`). Validasi konfigurasi tetap melalui `src/lib/env.ts`. Tidak ada client, environment, atau dependency baru.

Default tunggal berada di `src/lib/invitation/whatsapp-message.ts`; teksnya memakai pesan pernikahan Islami yang diberikan pengguna. Variabel `{nama_mempelai}` berasal dari nama pada cover, lalu hero, lalu judul acara, dengan fallback `Kedua Mempelai`. Preview dan pengiriman menggunakan nama dari undangan yang sama. Utility yang sama merender preview dan pesan personal. Penggantian placeholder satu kali memakai callback sehingga nama tamu yang berisi placeholder atau `$&` tidak diinterpretasikan ulang. Encoding parameter `text` hanya dilakukan satu kali oleh `whatsappUrl`; normalisasi nomor lama dipertahankan.

## Operasi dan isolasi

Implementasi mengikuti pola server actions, bukan endpoint HTTP baru. GET/PUT/DELETE di bawah adalah padanan operasi logis; request dari browser menggunakan protokol Server Actions Next.js.

Key: `ngaturi:whatsapp:message:v1:{userId}:{invitationId}`. Kedua segmen ID di-encode dengan `encodeURIComponent` agar delimiter tidak bertabrakan. User ID selalu dari sesi server; invitation ID berasal dari hasil query kepemilikan. Tidak ada email, nomor telepon, nama, atau token tamu pada key.

- GET — `getWhatsappTemplate`: autentikasi, query pemilik, Redis GET. Key tidak ada menghasilkan konstanta default tanpa write. Redis gagal atau data tersimpan tidak valid menghasilkan default sementara dan pemberitahuan; UI menonaktifkan simpan/reset sampai halaman dimuat ulang. Data custom tidak dihapus atau ditimpa oleh pembacaan.
- PUT — `saveWhatsappTemplate`: autentikasi, query pemilik, `hasProFeatures`, validasi teks, lalu Redis SET tanpa TTL. Mengembalikan sukses hanya setelah write selesai. Menyimpan teks persis sama dengan default menjalankan DEL agar perubahan default versi berikutnya berlaku. Route cache halaman tamu diinvalidasi setelah mutasi.
- DELETE — `resetWhatsappTemplate`: autentikasi, query pemilik, Redis DEL, invalidasi route cache, lalu mengembalikan konstanta default. Default tidak ditulis ke Redis.

Validasi server dan client menolak pesan kosong/whitespace, lebih dari 2.000 unit UTF-16 (sesuai `textarea.maxLength` dan penghitung), pesan tanpa `{link_undangan}`, serta kurung kurawal/variabel selain `{nama_tamu}`, `{nama_mempelai}`, dan `{link_undangan}`. Unicode, emoji, dan newline dipertahankan tanpa trim atau transformasi penyimpanan. Pesan ditampilkan sebagai React text, bukan HTML atau JavaScript. Tidak ada isi pesan, key, token tamu, maupun credential yang ditulis ke log oleh fitur ini. Error Redis yang dikembalikan ke UI bersifat umum. Otorisasi gagal tidak memicu akses Redis.

## UI dan entitlement

Panel menggunakan token warna, border, radius, dan spacing dashboard. Editor menyediakan textarea, penghitung karakter, penyisipan variabel pada seleksi/kursor, preview langsung dengan data contoh, serta tombol fokus preview. Simpan hanya aktif untuk draf valid yang berubah. Simpan/reset menampilkan loading dan notifikasi; reset custom atau draf meminta konfirmasi.

Template aktif dan draf adalah state berbeda. Badge merefleksikan hasil server; draf belum disimpan tidak mengubah href `Kirim WA`. Setelah mutasi sukses, state aktif dan editor diperbarui bersama. Pada kegagalan, draf tetap ada dan template aktif tidak berubah. Tab lain perlu dimuat ulang untuk membaca perubahan dari tab berbeda; fitur ini tidak menambahkan sinkronisasi lintas tab.

`hasProFeatures` tetap menjadi sumber akses: Premium/Business berbayar atau trial aktif dapat menyimpan custom. Basic/trial berakhir tidak dapat menyimpan custom baru. Seperti pengelolaan tautan tamu lama, membaca dan menggunakan pesan yang sudah tersimpan serta reset eksplisit tetap tersedia bagi pemilik. Perubahan paket/trial tidak menghapus key. Tidak ada perubahan kebijakan pembuatan tamu atau pengiriman tautan lama.

## Persistence Redis dan Docker

Redis adalah penyimpanan utama custom, bukan cache yang boleh dibuang. Tidak ada fallback database, schema, migration, ataupun TTL. Kehilangan key menyebabkan fallback ke default dan dapat menghilangkan pesan custom secara permanen.

Operator perlu memverifikasi persistence pada layanan Redis yang benar-benar dipakai: AOF/RDB sesuai target kehilangan data yang diterima, volume persisten jika self-hosted, backup berkala di luar instance, retensi, serta uji restore. Pertimbangkan `noeviction` agar tekanan memori menggagalkan write secara terlihat alih-alih menghapus custom; pantau kapasitas karena Redis bersama juga melayani sesi/rate limit. Audit job pembersihan/flush dan exclusion namespace ini. Untuk Redis terkelola, verifikasi jaminan durability, backup, dan kebijakan eviction penyedia. Konfigurasi tersebut belum diperiksa atau diubah oleh implementasi ini.

Kompatibel dengan build Docker standalone dan adapter Redis runtime yang sudah ada; tidak membutuhkan volume aplikasi baru, migration, perubahan Compose, atau environment baru. Semua instance aplikasi harus menunjuk Redis/logical database yang sama. Redis eksternal harus bertahan melewati penggantian container aplikasi. Ikuti konfigurasi origin dan encryption key Server Actions yang sudah digunakan saat menjalankan beberapa instance. Tidak ada deployment atau perubahan konfigurasi production dalam pekerjaan ini.

## Pengujian manual pada lingkungan uji

1. Login akun Premium/trial aktif dan buka Undangan per-tamu tanpa key custom. Pastikan badge Default dan pesan lama tampil.
2. Ubah pesan memakai ketiga variabel, emoji dan newline. Letakkan kursor di tengah teks lalu tekan tombol variabel; pastikan penyisipan sesuai posisi. Preview harus langsung berubah dan tidak membuka WhatsApp.
3. Sebelum simpan, periksa href Kirim WA: masih menggunakan pesan aktif lama. Simpan; tunggu notifikasi sukses. Reload dan pastikan pesan serta badge Custom tetap ada. Pada Redis uji, GET key sesuai ID dan TTL harus `-1`; jangan mencetak token atau pesan pribadi ke log.
4. Periksa Kirim WA untuk dua tamu berbeda: nama dan `?to=` harus berbeda sesuai tamu, nomor tetap memakai normalisasi lama. Teks hasil decoding parameter `text` harus tepat satu pesan. Uji tautan pada undangan uji yang terbit. Klik Salin link dan pastikan clipboard hanya berisi URL personal.
5. Buat custom berbeda untuk dua undangan pemilik sama. Login akun lain dan coba memanggil ketiga actions dengan ID undangan pertama; semuanya harus ditolak tanpa membaca/mengubah key.
6. Coba pesan kosong, whitespace, >2.000 karakter melalui request langsung, tanpa link, dan variabel tidak dikenal. Tidak boleh ada write. Textarea membatasi input normal hingga 2.000 unit UTF-16.
7. Reset custom: batalkan konfirmasi lalu cek pesan tetap; ulangi dan setujui. Editor/badge harus Default dan key hilang. Uji reset draf yang belum disimpan juga.
8. Pada Redis lingkungan uji, simulasikan kegagalan write/delete. UI harus menampilkan gagal, mempertahankan draf dan template aktif, tanpa toast sukses. Simulasikan kegagalan read: default sementara dan peringatan tampil, perubahan dinonaktifkan. Pulihkan Redis dan reload; custom harus kembali.
9. Pada fixture trial kedaluwarsa/Basic, pastikan custom lama tetap terbaca dan dipakai, simpan baru diblokir server, dan reset eksplisit tetap tersedia. Jangan mengubah data pelanggan untuk pengujian ini.
10. Periksa panel pada lebar 360, 390, 768, dan 1440px, keyboard, fokus preview, teks panjang, serta loading. Pastikan tidak ada overflow horizontal.

Pengujian otomatis mencakup utility, validasi, encoding, sesi, query kepemilikan, isolasi key, operasi Redis, kegagalan Redis, serta entitlement menggunakan mock DB/Redis. Ini tidak membuktikan sesi browser, persistence Redis aktual, clipboard perangkat, atau pengiriman WhatsApp nyata. Skenario browser dan layanan nyata di atas masih perlu acceptance pada lingkungan uji.

## File yang berubah

| File                                                             | Perubahan                                                           |
| ---------------------------------------------------------------- | ------------------------------------------------------------------- |
| `src/app/(dashboard)/invitations/[invitationId]/guests/page.tsx` | Memuat template terotorisasi pada server                            |
| `src/components/dashboard/guest-manager.tsx`                     | Menyimpan state template aktif dan memakai utility WA               |
| `src/components/dashboard/whatsapp-message-editor.tsx`           | Panel editor, preview, simpan, reset dan notifikasi                 |
| `src/lib/invitation/whatsapp-message.ts`                         | Konstanta default, validasi, renderer dan encoding URL              |
| `src/lib/invitation/whatsapp-message-actions.ts`                 | Operasi baca/simpan/reset dengan otorisasi dan Redis bersama        |
| `src/lib/invitation/whatsapp-message.test.ts`                    | Validasi, Unicode, substitusi dan encoding                          |
| `src/lib/invitation/whatsapp-message-actions.test.ts`            | Isolasi, otorisasi, lifecycle, entitlement dan kegagalan Redis      |
| `src/components/dashboard/guest-manager.test.tsx`                | Integrasi render pesan server ke href WA per tamu dan state UI awal |
| `docs/whatsapp-message.md`                                       | Audit, desain, operasi, persistence dan acceptance manual           |

## Hasil validasi implementasi

- PASS — `npm run typecheck`, serta `npx tsc --noEmit` setelah penambahan tes render.
- PASS — `npm run lint`: nol error; satu warning lama `_event` tidak dipakai pada `src/sections/navigation/nav-shared.test.ts:8`. File tes render tambahan juga lulus ESLint.
- PASS — `NGATURI_IMAGE_BUILD=1 npm run build`: build Next.js production/standalone lokal berhasil. Ini bukan build image Docker atau deployment.
- PASS — `npm test`: 981 tes lulus, 33 skipped; 102 test files lulus, satu skipped. Terdapat warning deprecation Three.js dari suite yang sudah ada.
- PASS — 24 tes baru mencakup utility, operasi server dan render komponen; lima tes tamu sebelumnya juga lulus. Tes Redis/DB menggunakan mock; tes komponen menggunakan server rendering, bukan interaksi browser.
- PASS — pemeriksaan Prettier file fitur dan `git diff --check`.
- PASS — tidak ada perubahan schema/migration, konfigurasi deployment, atau environment production; tidak menjalankan write ke database/Redis pengguna.
- NOT VERIFIED — persistence layanan Redis aktual, sesi browser end-to-end, interaksi kursor/konfirmasi/clipboard, tampilan responsif pada browser/perangkat, pembukaan tautan publik aktual, dan pengiriman WhatsApp nyata. Gunakan acceptance manual di atas pada lingkungan uji.
