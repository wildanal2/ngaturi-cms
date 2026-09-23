# DOKU Payment and Cloudflare Production Readiness

Dokumen ini mencatat baseline pembayaran yang tidak boleh mengalami regresi,
deployment development saat ini, dan batas pekerjaan sebelum Ngaturi dapat
dijalankan di Cloudflare Workers. Dokumen ini bukan otorisasi untuk mengaktifkan
DOKU Production atau melakukan pembayaran Production.

## Baseline Sandbox terverifikasi

Pengujian nyata DOKU Sandbox telah membuktikan:

- DOKU Checkout berhasil dan HTTP Notification mencapai Ngaturi.
- Signature webhook, provider reference/invoice, amount, dan currency tervalidasi.
- Webhook pertama mengubah payment `pending` menjadi `paid`.
- Aktivasi undangan dan penambahan kuota masing-masing terjadi tepat satu kali.
- Pengiriman ulang webhook nyata menjadi no-op yang aman.
- Browser callback melakukan signed DOKU Check Status dan menjadi no-op yang aman
  bila webhook telah lebih dahulu memenuhi payment.
- Credential, signature lengkap, dan header otorisasi tidak dicatat ke log.

Semua jalur konfirmasi harus tetap bermuara ke `applyDokuResult`, yang mengunci
payment dengan `FOR UPDATE` dan menerapkan perubahan payment, entitlement, serta
kuota dalam satu transaksi database.

## Alur pembayaran

```text
Ngaturi → DOKU Checkout → DOKU Webhook
→ signature/reference/amount/currency validation
→ atomic and idempotent fulfillment
```

Webhook merupakan jalur konfirmasi utama. Redirect browser bukan bukti pembayaran
dan tidak boleh langsung mengubah payment menjadi `paid`.

Fallback callback:

```text
Browser callback → signed server-to-server DOKU Check Status
→ response/reference/amount/currency validation
→ applyDokuResult
```

Recovery webhook yang terlewat:

```text
eligible pending DOKU payment → scheduled signed Check Status
→ response/reference/amount/currency validation
→ applyDokuResult
```

Rekonsiliasi mempertahankan minimum age 2 menit, maximum age 24 jam, batch 50,
concurrency 5, dan urutan kandidat paling lama lebih dulu.

## Refund

Refund merupakan status finansial. Persetujuan dan inisiasinya tetap manual
melalui DOKU/merchant operations untuk duplicate atau incorrect charge,
payment/system failure yang terverifikasi, atau pengecualian yang disetujui
operator berwenang. Tidak ada eligibility window otomatis dan aplikasi tidak
menyediakan API untuk memulai refund.

Notification atau signed Check Status `REFUNDED` baru dianggap full refund bila
`refund.amount` tersedia dan sama dengan nilai payment internal. Transisi ini
mengubah payment menjadi terminal `refunded`, mencatat `refund_recorded_at` dan
`refund_metadata`, mempertahankan `raw_webhook` sukses asli serta `paid_at`, dan
tidak mengubah invitation atau profil. Event provider berikutnya, termasuk
`SUCCESS`, menjadi no-op.

Jika full refund diterima sebelum fulfillment, entitlement dan kuota tidak
diberikan. Bila invitation sudah tampak paid meskipun payment belum pernah
fulfilled, metadata menandai `entitlementReviewRequired` untuk pemeriksaan
operator. Refund parsial, refund tanpa jumlah, atau jumlah yang tidak sama
dengan payment disimpan dengan `reviewRequired` tanpa diperlakukan sebagai full
refund. Selama review pre-fulfillment masih terbuka, `SUCCESS` tidak boleh
memberikan entitlement.

Refund yang notification-nya terlewat dipulihkan per invoice dengan:

```text
npm run payments:reconcile-refund -- <provider_order_id>
→ signed DOKU Check Status → applyDokuResult
```

Jalur operator ini sengaja terpisah dari cron payment `pending`. Nilai refund
yang tampil di admin dilaporkan terpisah dan tidak dihitung sebagai pendapatan
paid.

### Renewal yang sudah disetujui

- Checkout renewal tersedia untuk setiap undangan milik user yang sudah paid;
  harga server-authoritative Rp25.000 dan durasi +90 hari.
- Fulfillment mengunci payment dan invitation. Expiry baru adalah
  `max(expires_at, fulfilled_at) + 90 hari`; dua payment valid berbeda menumpuk.
- Payment pending memakai `grant_until=NULL`. Setelah fulfillment,
  `grant_until` berisi expiry hasil update yang sama, dan `plan_tier` berisi tier
  undangan saat checkout. Nilai legacy `plan_tier=renewal` dilaporkan sebagai
  legacy/tidak diketahui dan tidak di-backfill berdasarkan tebakan.
- Hanya status invitation `expired` yang dipulihkan menjadi `published`.
  `draft` dan `archived` dipertahankan.
- Request halaman publik, RSVP, dan guestbook memeriksa `expires_at` langsung;
  cron bukan satu-satunya enforcement. Preview dan management pemilik tetap
  tersedia.
- Reporting paid renewal memisahkan amount, count, dan breakdown Basic/Premium/
  legacy-tidak-diketahui. Refund tetap memakai kebijakan financial-only dan
  tidak mencabut extension yang sudah fulfilled.

### Runbook manual review refund

Review parsial/ambigu harus diselesaikan oleh operator berwenang menggunakan
referensi payment eksplisit. Jangan mengubah row payment secara manual.

Konfirmasi bahwa bukti tersebut adalah full refund:

```text
npm run payments:resolve-refund-review -- <provider_order_id> confirm <operator_id> <reason>
```

Command mengunci row payment, mencatat operator, alasan, waktu, dan keputusan di
`refund_metadata.reviewHistory`, lalu mengubah payment menjadi terminal
`refunded`. Command tidak mengubah invitation, kuota, renewal, atau entitlement.
`SUCCESS` yang datang sesudahnya tetap menjadi no-op.

Jika bukti dinyatakan invalid atau bukan full refund:

```text
npm run payments:resolve-refund-review -- <provider_order_id> reject <operator_id> <reason>
```

Command mempertahankan riwayat bukti dan mencatat resolusi tanpa mengubah
payment menjadi `paid`. Setelah transaksi resolusi commit, payment tetap
diblokir dengan `reconciliationRequired` sementara command mengambil signed
DOKU Check Status baru dan meneruskannya ke jalur `applyDokuResult` yang sama
dengan webhook/callback. Hanya hasil provider yang terverifikasi itu yang
melepas blokir dan dapat melakukan fulfillment. Jika Check Status gagal, blokir
tetap aktif; jalankan ulang command yang sama agar resolusi duplikat menjadi
no-op dan Check Status dicoba lagi.

Arti keputusan:

- `confirm`: operator telah memverifikasi full refund di merchant operations.
- `reject`: bukti event yang direview invalid atau bukan full refund; ini bukan
  instruksi untuk menandai payment paid.

Output command berupa JSON. Exit code `0` berarti resolusi dan, untuk `reject`,
rekonsiliasi selesai; exit code `1` berarti provider atau pemrosesan gagal;
exit code `2` berarti argumen tidak lengkap. Keputusan berbeda terhadap review
yang sudah diselesaikan ditolak. Bukti provider baru yang berbeda dapat membuka
review baru, sedangkan retry bukti yang sama setelah `reject` tidak membukanya
kembali.

## Deployment dan scheduler

### Development

- Runtime: Next.js melalui PM2 `ngaturi-dev`, port 3009, Cloudflare Tunnel.
- Scheduler: Linux cron tiap 5 menit.
- Target cron: localhost `/api/cron/reconcile-doku-payments` melalui
  `scripts/reconcile-doku-cron.mjs`.
- Authentication: `CRON_SECRET` dibaca dari `.env.local`; secret tidak ditulis
  literal di crontab.
- Payment environment: DOKU Sandbox.

### Production target

- Runtime: Cloudflare Workers.
- Scheduler: native Cloudflare Cron Trigger `*/5 * * * *`.
- Handler terjadwal harus memanggil `reconcilePendingDokuPayments()` secara
  langsung, bukan melakukan HTTP request melalui domain publik.
- HTTP cron route dapat tetap tersedia untuk operasi terkontrol dan harus tetap
  memakai `CRON_SECRET`; event Cron Trigger native tidak memerlukan bearer token.
- Payment environment: DOKU Production, tetapi hanya setelah migrasi Worker,
  bindings, observability, dan konfigurasi DOKU Back Office diverifikasi.

Webhook tetap primer. Cron Trigger hanya memulihkan webhook yang terlewat dan
tidak boleh memperkenalkan implementasi fulfillment kedua.

## Compatibility review

| Area                        | Status                            | Evidence and required work                                                                                                                              |
| --------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js runtime             | IMPLEMENTED, NOT DEPLOYED         | vinext, Vite, Wrangler config, and the custom Worker entrypoint build locally. Staging deployment is not yet verified.                                  |
| DOKU fetch                  | COMPATIBLE                        | Implementasi memakai Web Fetch API dan URL HTTPS.                                                                                                       |
| HMAC/crypto                 | COMPATIBLE                        | Implementasi memakai `node:crypto` dan `Buffer`; Worker harus memakai compatibility date dan Node.js compatibility yang mendukung API tersebut.         |
| PostgreSQL/Drizzle          | IMPLEMENTED, NOT STAGING-VERIFIED | Worker invocation memakai satu client Postgres.js/Drizzle dari Hyperdrive dengan `max: 5`; Node development tetap memakai `DATABASE_URL`.               |
| DB transaction/`FOR UPDATE` | IMPLEMENTED, NOT STAGING-VERIFIED | Payment paths inject DB invocation yang sama dan fulfillment tetap memakai satu transaction-scoped `tx`; integration test Hyperdrive nyata masih wajib. |
| Scheduled reconciliation    | IMPLEMENTED, NOT STAGING-VERIFIED | Worker `scheduled()` dan Cron Trigger `*/5 * * * *` memanggil helper reconciliation langsung.                                                           |
| Environment/secrets         | PARTIAL                           | Typed bindings dan contoh variable tersedia; nilai staging tetap harus dipasang sebagai Worker vars/secrets tanpa masuk repository.                     |
| Logging                     | PARTIAL                           | Wrangler observability aktif; retention, alerting, dan dashboard staging belum diverifikasi.                                                            |

PM2, Linux cron, serta script localhost adalah mekanisme development dan tidak
boleh diimpor ke runtime Worker. Payment core tidak menggunakan filesystem.
Di luar payment core, branch migrasi mengganti native `sharp` dengan binding
Cloudflare Images/R2 dan mengganti `ioredis` module-scoped dengan Redis REST.
Perilaku upload, OAuth/session, dan rate limit tetap harus dibuktikan di staging;
lihat `docs/cloudflare-vinext-migration.md`.

## Production secret separation

Development dan Production harus menjadi lingkungan terpisah:

| Secret/configuration       | Development                        | Production target                                                                                 |
| -------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------- |
| DOKU client ID and secret  | Sandbox di `.env.local`            | DOKU Production melalui Cloudflare secrets                                                        |
| DOKU base URL              | Sandbox                            | Production, diubah hanya saat aktivasi terkontrol                                                 |
| DOKU callback URL          | Host development                   | Domain Production yang sudah diverifikasi                                                         |
| Notification URL           | DOKU Sandbox Back Office           | DOKU Production Back Office per channel                                                           |
| Database credentials       | `DATABASE_URL` development         | Hyperdrive configuration/binding; direct URL terpisah hanya untuk migration tooling               |
| Auth/OAuth/storage secrets | `.env.local` development           | Cloudflare secrets pada environment Production                                                    |
| Cron authentication        | `CRON_SECRET` untuk HTTP localhost | Hanya diperlukan bila HTTP cron route dipertahankan; tidak diperlukan oleh native scheduled event |

Nilai secret tidak boleh ditulis ke `.env.example`, Wrangler configuration,
crontab, dokumentasi, log, atau Git. Nilai `NEXT_PUBLIC_*` bukan secret dan
dibekukan saat build, sehingga harus disetel untuk environment build yang benar.

Environment DOKU yang aktif:

- `DOKU_CLIENT_ID`: keep, runtime secret.
- `DOKU_SECRET_KEY`: keep, runtime secret.
- `DOKU_BASE_URL`: keep, runtime configuration.
- `DOKU_CALLBACK_URL`: keep, runtime configuration.
- `CRON_SECRET`: keep untuk endpoint cron HTTP.
- `DOKU_NOTIFICATION_URL`: removed; aplikasi tidak mengirim override notification
  URL dan DOKU Back Office menentukan tujuan notifikasi.
- `DOKU_PUBLIC_URL`: removed; tidak digunakan oleh schema atau runtime.

## Separate Cloudflare migration phase

Sebelum Production deploy:

1. Evaluasi `vinext`, adapter Next.js yang saat ini direkomendasikan Cloudflare,
   terhadap Next.js 16.3.3, Server Components/Actions, route handlers, image
   processing, Redis, Better Auth, dan dependency Node.js di repository ini.
   Gunakan OpenNext hanya sebagai fallback bila hasil compatibility proof
   menunjukkan `vinext` belum memenuhi kebutuhan aplikasi.
2. Tambahkan Worker entrypoint dan Wrangler configuration pada branch migrasi,
   termasuk compatibility date, Node.js compatibility, Hyperdrive binding,
   observability, dan Cron Trigger.
3. Ubah akses database menjadi request/event scoped melalui Hyperdrive tanpa
   mengubah transaksi `applyDokuResult` atau semantics `FOR UPDATE`.
4. Tambahkan `scheduled()` handler yang memanggil helper rekonsiliasi yang sama.
5. Uji create checkout, webhook, callback, duplicate delivery, signed Check
   Status, rollback/retry, and scheduled recovery pada Worker staging.
6. Baru setelah staging lulus, bind secret Production, konfigurasi callback dan
   Notification URL di DOKU Production Back Office, lalu lakukan smoke test
   Production yang terkontrol.

## Deferred business-rule decisions

Kebijakan refund financial-only dan renewal sudah ditetapkan di bagian terkait.
Pekerjaan deployment tetap tidak menentukan atau mengubah:

- perbedaan trial 3 hari dan 7 hari;
- perbedaan entitlement fitur selama trial.

Semua item tersebut harus diselesaikan sebagai keputusan produk terpisah.

## Platform references

- [Cloudflare Next.js deployment guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
- [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [Hyperdrive with Postgres.js](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/postgres-js/)
- [Cloudflare Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Cloudflare Workers Node.js crypto](https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/)
