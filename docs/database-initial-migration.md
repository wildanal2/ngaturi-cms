# Panduan Migrasi Awal Neon PostgreSQL (Database Kosong)

> **ELI10:** Bayangkan database baru sebagai rumah kosong. **Schema migration** memasang kamar dan lemari (tabel/kolom). Itu **tidak** memindahkan isi rumah lama (akun, undangan, pembayaran). Operasi dilakukan melalui **migration job terpisah**, bukan dengan meng-upgrade container aplikasi terlebih dulu.

Panduan ini memakai mekanisme operator yang tersedia di source **v1.1.2**. Jika memakai versi lain, ganti tag dan periksa terlebih dahulu migrasi apa saja yang ada di versi tersebut.

## 0. Hasil yang sudah dilakukan (10 November 2026)

- Tag sumber: `v1.1.2`; commit `8c20b599dd209892c335489c99ced74565f2de8f`.
- Bundle mempunyai 10 SQL migration dari `0000` sampai `0009`.
- Target: Neon **direct endpoint** dengan TLS terverifikasi.
- Inspeksi awal: `existingTables=0`, `applied=0`, `pending=10`.
- Apply berhasil: `{"result":"PASS","journal":10,"applicationTables":14}`.
- **Belum termasuk** penyalinan data dari database lama dan **belum membuktikan cutover** URL yang dipakai app production.

**Jangan jalankan panduan initial lagi pada database yang sudah terisi/migrasi.** Gunakan [migrasi lanjutan](database-incremental-migration.md) untuk release berikutnya.

## 1. Tentukan jenis migrasi

| Tujuan | Metode |
| --- | --- |
| Neon baru masih kosong; hanya ingin membuat tabel | Ikuti panduan ini |
| Ingin memindahkan data pengguna dari Neon/Postgres lama | Buat rencana **data migration** (backup, transfer, konsistensi, validasi) secara terpisah |
| Neon sudah memiliki tabel dan journal Drizzle dari versi lama | Gunakan panduan **migrasi lanjutan**, jangan `--require-empty` |
| Database sudah berisi tabel tetapi **tanpa** journal yang sesuai | **STOP**; harus ditinjau operator, jangan `db:push` atau memalsukan journal |

Siapkan backup/snapshot jika database bukan benar-benar baru. Pastikan Anda punya akses ke Neon Console dan mengerti project, branch, database, serta sumber URL target. Jangan kirim password ke terminal chat atau Git.

## 2. Ambil **source versi resmi**, tanpa mengubah runtime production

```bash
ssh USER@HOST_VM
cd /home/okee

git clone --depth 1 --branch v1.1.2 \
  https://github.com/wildanal2/ngaturi-cms.git \
  ngaturi-migration-v1.1.2

cd /home/okee/ngaturi-migration-v1.1.2
git describe --tags --exact-match
# Harus menampilkan v1.1.2
```

Direktori **migration** terpisah dari `/home/okee/ngaturi`; tidak ada alasan menghapus container atau source runtime untuk menjalankan schema migration.

## 3. Build migration bundle dengan Node 24 dalam Docker

```bash
cd /home/okee/ngaturi-migration-v1.1.2

sudo docker run --rm \
  --user "$(id -u):$(id -g)" \
  -e HOME=/tmp \
  -v "$PWD:/workspace" -w /workspace \
  node:24-bookworm \
  bash -lc 'npm ci --no-audit --no-fund && npm run db:operator-bundle'

cat dist/migration-job/manifest.json
```

Yang harus ada: `dist/migration-job/migrate.mjs`, `compose.migrate.yml`, `manifest.json`, folder `sql/`. `manifest.json` memuat commit dan hash setiap SQL; **bukan database URL atau image**. Jangan mengedit file SQL setelah build.

## 4. Siapkan Neon **Direct connection string**

1. Buka Neon Console, pilih **project → branch → database** yang benar.
2. Di Connect/Connection Details, **matikan pooled connection**: host direct normalnya `ep-...neon.tech`, bukan `ep-...-pooler....neon.tech`.
3. Salin URL PostgreSQL lengkap dan aman. Hindari menyimpan URL di history shell.
4. Buat file root-only. Untuk pembuatan awal:

   ```bash
   sudo install -d -m 700 /etc/ngaturi
   sudo python3 - <<'PY'
from getpass import getpass
from pathlib import Path
from urllib.parse import urlsplit
import os

url = getpass('Neon DIRECT DATABASE_URL: ').strip()
u = urlsplit(url)
if (u.scheme not in ('postgres', 'postgresql') or not u.hostname or
        not u.hostname.endswith('.neon.tech') or '-pooler.' in u.hostname or
        not u.username or not u.password or not u.path.strip('/') or
        '\n' in url or '\r' in url):
    raise SystemExit('Koneksi harus Neon DIRECT PostgreSQL yang lengkap')

path = Path('/etc/ngaturi/migration-v1.1.2.env')
fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(fd, 'w') as f:
    f.write('DATABASE_URL=' + url + '\n')
print('File migrasi dibuat, password tidak ditampilkan')
PY
   ```

Jika file sudah ada, **jangan menimpanya** dengan perintah ini; verifikasi dulu apakah koneksi lama harus dipertahankan. Untuk mengganti target gunakan prosedur perubahan credential yang disetujui dan buat backup aman.

## 5. Ambil image v1.1.2 (hanya runtime migration job)

```bash
sudo docker pull ghcr.io/wildanal2/ngaturi-cms:v1.1.2
IMAGE=$(sudo docker image inspect \
  ghcr.io/wildanal2/ngaturi-cms:v1.1.2 \
  --format '{{index .RepoDigests 0}}')

# Harus berbentuk ghcr.io/wildanal2/ngaturi-cms@sha256:...
printf 'Image digest: %s\n' "$IMAGE"
```

**Ini tidak menjalankan aplikasi versi v1.1.2**. Image hanya menyediakan Node runtime untuk migration job, sedangkan file migrasi berasal dari bundle source yang dibangun tadi. Gunakan image resmi yang tag/digest-nya sudah diverifikasi; untuk rilis baru, cocokkan dengan manifest release.

## 6. Inspeksi database sebelum melakukan perubahan

```bash
cd /home/okee/ngaturi-migration-v1.1.2
BUNDLE="$PWD/dist/migration-job"
MIG_ENV=/etc/ngaturi/migration-v1.1.2.env

sudo env NGATURI_IMAGE="$IMAGE" RUNTIME_ENV_FILE="$MIG_ENV" \
  docker compose -f "$BUNDLE/compose.migrate.yml" \
  -p ngaturi-migration run --rm migrate --require-empty
```

Untuk Neon **kosong** dengan bundle v1.1.2, contoh output nyata:

```json
{"tls":"verified","targetFingerprint":"<64-karakter-hex>"}
{"existingTables":0,"applied":0,"pending":10,"mode":"inspect"}
```

**Berhenti** jika `existingTables` bukan `0`, URL salah, fingerprint berubah tak terduga, atau operator gagal. `--require-empty` memastikan tidak mengubah database yang sudah memiliki tabel. Inspeksi tidak menjalankan SQL.

## 7. Apply SQL **sekali** pada database yang benar

1. Verifikasi target di Neon Console; pastikan tidak ada data yang harus dipindahkan dahulu.
2. Salin **nilai fingerprint asli** dari output inspeksi (bukan teks `<...>`).
3. Jalankan:

   ```bash
   FINGERPRINT='PASTE_64_HEX_DARI_OUTPUT_INSPECT'

   sudo env NGATURI_IMAGE="$IMAGE" \
     RUNTIME_ENV_FILE="$MIG_ENV" \
     MIGRATION_TARGET_SHA256="$FINGERPRINT" \
     docker compose -f "$BUNDLE/compose.migrate.yml" \
     -p ngaturi-migration run --rm migrate --apply --require-empty
   ```

4. Harus muncul `mode=apply`, lalu `result=PASS`. Untuk v1.1.2 hasil yang pernah tercapai:

   ```json
   {"result":"PASS","journal":10,"applicationTables":14}
   ```

`targetFingerprint` adalah pengaman untuk mengonfirmasi **host + nama database**; **bukan pengganti** backup atau pemeriksaan database yang benar. Jangan abaikan guard jika salah.

## 8. Verifikasi setelah apply (read-only)

```bash
sudo env NGATURI_IMAGE="$IMAGE" RUNTIME_ENV_FILE="$MIG_ENV" \
  docker compose -f "$BUNDLE/compose.migrate.yml" \
  -p ngaturi-migration run --rm migrate
```

Pastikan `applied=10`, `pending=0`, dan target fingerprint tetap sama. `existingTables` sekarang mencakup tabel aplikasi **dan** tabel journal Drizzle, sehingga akan lebih besar daripada 0. Jangan memakai `--require-empty` lagi setelah sukses.

## 9. Troubleshooting yang pernah dialami

| Error | Maknanya | Solusi |
| --- | --- | --- |
| `NGATURI_IMAGE is missing a value` | Variabel belum diset di shell | Pull image, set `IMAGE` dari RepoDigests, ulangi inspeksi |
| `Direct endpoint required` | URL memakai `-pooler` | Ambil **Direct connection** resmi dari Neon |
| `Explicit target confirmation required` | `FINGERPRINT` masih placeholder/tidak cocok | Salin persis `targetFingerprint` dari inspeksi terbaru |
| `Unmanaged nonempty schema` | Ada tabel tetapi tidak ada journal resmi | **STOP**; audit database. Jangan paksa |
| SQL gagal saat apply | Sebagian migrasi mungkin telah diterapkan | **Jangan asumsi rollback otomatis**. Audit journal/schema, backup, dan root cause sebelum lanjut |

## 10. Apa yang **belum** selesai setelah hasil PASS?

- Belum ada bukti bahwa akun, undangan, pembayaran, atau media lama sudah dipindahkan. Itu **data migration**, bukan schema migration.
- Belum ada bukti bahwa `DATABASE_URL` app/scheduler di production mengarah ke database yang baru dimigrasikan. Itu adalah proses **cutover**, dilakukan bersama deployment aplikasi yang kompatibel.
- Docker image/rollback tidak mengembalikan database atau env. Cek [runbook deployment](production-deployment.md) sebelum cutover.

**Berikutnya:** [Migrasi incremental pada versi selanjutnya](database-incremental-migration.md).
