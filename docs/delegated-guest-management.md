# Akses kelola tamu untuk pelanggan (Issue #24)

Pemilik membuat tautan `/kelola-tamu/<token>` agar pelanggan tanpa akun Ngaturi dapat membuat tautan undangan per-tamu baru dan memantau RSVP tamu tersebut.

## Model izin

- Scope tetap: `guests:create` + `rsvp:read`. Tidak ada scope lain yang dapat diminta dari browser.
- Boleh: tambah tamu baru (nama, grup, WA opsional, maks 10 orang; batas 100 tamu/undangan), salin/kirim WA memakai template #23 milik pemilik, tandai terkirim, baca nama + status RSVP + jumlah.
- Tidak boleh: dashboard pemilik, kontak/token/RSVP tamu lain, pesan RSVP, email/telepon/IP RSVP, ubah/hapus RSVP atau tamu, pengaturan undangan, moderasi guestbook, simpan template.
- Tamu "milik delegasi" dikenali dari token personal `dg` + 10 karakter (token pemilik tepat 10 karakter), sehingga tanpa migrasi DB.

## Penyimpanan & keamanan

- Token 256-bit acak (base64url, 43 char); hanya SHA-256-nya disimpan di Redis: `ngaturi:delegate:grant:v1:<hash>` (TTL = masa berlaku) dan penunjuk `ngaturi:delegate:active:v1:<invitationId>` (satu tautan aktif per undangan).
- Default 7 hari, maks 30 hari, tidak melebihi `invitations.expires_at`. Tautan ditampilkan sekali; membuat baru otomatis mencabut yang lama (diserialkan dengan kunci Redis).
- Create/revoke hanya pemilik (`requireUser` + kepemilikan). Setiap baca/tulis delegasi lewat `resolveDelegate`; ID undangan selalu dari grant, bukan dari browser.
- Pencabutan efektif langsung (tombstone 24 jam agar statusnya jelas) dan tidak menyentuh `guest_invites`, sehingga tautan RSVP personal tetap sah.
- Rate limit: 120 req/menit per grant (token valid), 20 token tidak valid/10 menit per pemanggil (tidak pernah memblokir token valid), 20 tulis/menit dan 100 tamu per grant, 10 pembuatan tautan/jam per pemilik.
- `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, `noindex` (header + metadata); request-log dev mengabaikan `/kelola-tamu/`. Token RSVP tamu tidak pernah diterima sebagai token delegasi.
- Rute berada di luar prefix yang dilindungi `proxy.ts`; proxy/layout dashboard tidak diubah.

## Kontrak Redis REST
`redis/rest.ts` memakai `automaticDeserialization: false`. `RedisStore` menyimpan dan mengembalikan string; tanpa opsi ini klien Upstash me-`JSON.parse` balasan sehingga string JSON kembali sebagai objek (tautan valid dianggap tidak valid, cabut/buat ulang gagal). Grant lama (string JSON biasa) tetap terbaca. Regression: `delegation.rest.test.ts` menjalankan klien Upstash asli terhadap emulator protokol (`src/test/fake-upstash-rest.ts`).

## Edit pesan WhatsApp pelanggan & pratinjau tautan
- Tab Share Undangan punya "Edit Pesan WhatsApp": draf hanya di state halaman (tidak disimpan, hilang saat muat ulang), memakai `validateWhatsappMessage` / `renderWhatsappMessage`, dan tidak menyentuh template milik pemilik (#23). Pesan tidak valid menonaktifkan "Kirim WA". Reset kembali ke pesan reseller (atau bawaan).
- Pratinjau WhatsApp: metadata OG undangan publik sudah benar (200, tanpa redirect, `og:url` tanpa token `?to=`, `og:image` absolut). Kartu OG berfoto bisa ±490 KB sebagai PNG, di atas batas ±300 KB yang dipakai WhatsApp untuk thumbnail, sehingga `opengraph-image` mengkodekan ulang kartu > 250 KB menjadi JPEG (±45 KB, `og-compress.ts`; Node saja, Workers tetap PNG). WhatsApp tetap memiliki cache/kebijakan sendiri; pratinjau nyata harus dicek manual di aplikasi.
