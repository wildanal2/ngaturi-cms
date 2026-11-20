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
- Rate limit: 120 req/menit per IP, 20 token tidak valid/10 menit per IP, 20 tulis/menit dan 100 tamu per grant, 10 pembuatan tautan/jam per pemilik.
- `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, `noindex` (header + metadata); request-log dev mengabaikan `/kelola-tamu/`. Token RSVP tamu tidak pernah diterima sebagai token delegasi.
- Rute berada di luar prefix yang dilindungi `proxy.ts`; proxy/layout dashboard tidak diubah.
