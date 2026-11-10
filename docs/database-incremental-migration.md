# Panduan Migrasi Lanjutan Neon (v1.1.2 → Versi Berikutnya)

> **ELI10:** Database lama sudah punya kamar dan isinya. Migrasi lanjutan seperti **menambah kamar baru tanpa membongkar kamar yang sedang dipakai**. Aplikasi lama mungkin masih berjalan saat schema baru dibuat; karena itu perubahan database harus dirancang agar kedua versi aman selama perpindahan.

Panduan ini untuk database Neon yang **sudah dimigrasikan** dan memiliki journal Drizzle yang cocok. Contoh versi tujuan `v1.1.3` adalah **rencana**: jalankan hanya sesudah tag, image, dan SQL migration resminya tersedia. **Jangan jalankan ulang prosedur initial dengan `--require-empty`.**

## 1. Beda migrasi awal dan lanjutan

| Pertanyaan | Migrasi awal | Migrasi lanjutan |
| --- | --- | --- |
| Database sebelum migrasi | Benar-benar kosong | Sudah ada tabel dan data |
| Jumlah migrasi | Semua SQL dari awal | **Hanya yang belum dicatat** dalam journal |
| Gunakan `--require-empty`? | **Ya** | **Tidak** |
| Perlu backup? | Jika target baru, tetap verifikasi | **Wajib punya backup/restore teruji dan rencana recovery** |
| Bisa rollback DB dengan `rollback.sh`? | Tidak | **Tidak** |

**Prinsip:** migrasi database dilakukan dengan **job terpisah** (`compose.migrate.yml`), bukan saat `docker compose up`, startup aplikasi, atau `deploy.sh`.

## 2. Review sebelum mengubah database production

1. Tentukan **versi asal** dan **versi tujuan** dari Git tag, bukan menebak dari `latest`.
2. Periksa migration SQL yang ditambah/diubah sejak versi asal, termasuk `_journal.json` dan schema snapshot. SQL lama yang sudah dipublikasikan **tidak boleh dimodifikasi**.
3. Identifikasi apakah perubahan **additive** (menambah tabel/kolom tanpa menghapus kontrak lama) atau **breaking** (hapus/rename kolom, data transformation yang tidak bisa dibaca versi lama).
4. Untuk perubahan *breaking*, jangan langsung apply lalu berharap rollback image akan berhasil. Rancang **expand → migrate/backfill → deploy → contract** melalui beberapa release, dengan persetujuan dan pengujian staging.
5. Ambil backup/snapshot Neon yang benar; cek prosedur **restore**, target branch, kapasitas dan kredensialnya sebelum maintenance window. Backup database dan backup `/etc/ngaturi/ngaturi.env` adalah dua hal berbeda.
6. Jika ada data lama yang harus ditransfer antardatabase, buat rencana **data migration**, freeze writes/dual-write jika diperlukan, validasi jumlah dan integritas data. Panduan ini hanya mengurus migrasi schema Drizzle.
7. Tetapkan urutan cutover: schema aman untuk app lama → jalankan migration job → deploy app baru → smoke test. Jika tidak kompatibel dua arah, susun jendela downtime dan rollback data secara eksplisit.

## 3. Ambil source **tag tujuan** secara terpisah di VM

Setelah GitHub Release resmi tersedia:

```bash
cd /home/okee
RELEASE_TAG=v1.1.3

# Direktori baru; jangan mengubah /home/okee/ngaturi.
# Jika folder sudah ada, git clone akan menolak; jangan overwrite secara buta.
git clone --depth 1 --branch "$RELEASE_TAG" \
  https://github.com/wildanal2/ngaturi-cms.git \
  "ngaturi-migration-$RELEASE_TAG"

cd "/home/okee/ngaturi-migration-$RELEASE_TAG"
git describe --tags --exact-match
```

Pastikan yang tampil adalah tag tujuan. Untuk setiap versi berikutnya buat bundle dari source commit **yang sama** dengan image resmi, bukan dari branch Staging yang masih bergerak.

## 4. Build bundle dan cek isi SQL

```bash
sudo docker run --rm \
  --user "$(id -u):$(id -g)" \
  -e HOME=/tmp \
  -v "$PWD:/workspace" -w /workspace \
  node:24-bookworm \
  bash -lc 'npm ci --no-audit --no-fund && npm run db:operator-bundle'

cat dist/migration-job/manifest.json
```

Pastikan `sourceCommit`, daftar nama/hash SQL, dan snapshot sesuai release yang diuji. Bandingkan perubahan dengan migration journal sebelumnya (misalnya v1.1.2 mempunyai 10 migrasi, `0000`–`0009`). **Tidak semua release aplikasi harus menambah SQL migration.** Bila tag tujuan belum memiliki migrasi baru, jangan membuat SQL hanya demi menaikkan angka versi.

## 5. Siapkan koneksi yang benar dan image resmi

Migration operator membutuhkan **Neon Direct endpoint**, bukan pooled endpoint. Jika `/etc/ngaturi/migration-v1.1.2.env` masih mengarah ke Neon target yang benar, Anda boleh memakainya **setelah verifikasi project/branch/database**. Lebih baik gunakan nama file khusus versi atau prosedur pengelolaan secrets yang disetujui organisasi untuk menghindari salah target; file harus hanya bisa dibaca root (`0600`) dan jangan disimpan di repository.

```bash
MIG_ENV=/etc/ngaturi/migration-v1.1.2.env
sudo test -s "$MIG_ENV" && echo 'Migration env ada'

# Runtime Node dari image tag resmi tujuan
sudo docker pull ghcr.io/wildanal2/ngaturi-cms:v1.1.3
IMAGE=$(sudo docker image inspect \
  ghcr.io/wildanal2/ngaturi-cms:v1.1.3 \
  --format '{{index .RepoDigests 0}}')

BUNDLE="$PWD/dist/migration-job"
```

Verifikasi `IMAGE` sama dengan digest resmi pada Release manifest tag tujuan. **Perintah ini belum memindahkan aplikasi ke v1.1.3.**

## 6. Inspeksi dulu; untuk incremental **tanpa** `--require-empty`

```bash
sudo env NGATURI_IMAGE="$IMAGE" RUNTIME_ENV_FILE="$MIG_ENV" \
  docker compose -f "$BUNDLE/compose.migrate.yml" \
  -p ngaturi-migration run --rm migrate
```

Hasil yang harus dibaca:

- `tls=verified` → koneksi TLS berhasil.
- `targetFingerprint=...` → identitas target untuk konfirmasi. Cocokkan dengan target yang dimaksud di Neon Console.
- `applied` → jumlah SQL yang sudah tercatat di journal.
- `pending` → jumlah SQL **baru** yang akan dijalankan.
- `mode=inspect` → **belum** mengubah schema.

Contoh **ilustrasi**, bukan hasil v1.1.3 yang sudah diverifikasi:

```json
{"existingTables":15,"applied":10,"pending":1,"mode":"inspect"}
```

Jika `pending=0`, tidak ada SQL baru untuk diterapkan; evaluasi kompatibilitas aplikasi dan lanjut ke perencanaan deployment. Jika muncul `Database is ahead`, `Migration history differs`, `Migration ordering differs`, atau `Unmanaged nonempty schema`, **STOP**. Jangan mengubah journal untuk memaksa lolos.

## 7. Apply migrasi yang tertunda (tindakan mengubah database)

Lakukan hanya setelah SQL review, backup/restore, approval, target fingerprint, dan kompatibilitas versi lama-baru disetujui:

```bash
# PASTE nilai targetFingerprint terbaru dari langkah 6, jangan literal teks contoh.
FINGERPRINT='PASTE_64_HEX_DARI_OUTPUT_INSPECT'

sudo env NGATURI_IMAGE="$IMAGE" \
  RUNTIME_ENV_FILE="$MIG_ENV" \
  MIGRATION_TARGET_SHA256="$FINGERPRINT" \
  docker compose -f "$BUNDLE/compose.migrate.yml" \
  -p ngaturi-migration run --rm migrate --apply
```

**Jangan gunakan `--require-empty` di sini.** Migration operator akan memeriksa riwayat SQL yang sudah diterapkan lalu menjalankan **yang belum ada**; setelah itu ia membandingkan hasil tabel/kolom dengan schema committed. Jika gagal di tengah jalan, perubahan SQL tertentu mungkin sudah permanen. **Jangan langsung ulang apply** tanpa audit journal, struktur DB dan penyebab kegagalan.

## 8. Inspeksi ulang dan deployment aplikasi

```bash
sudo env NGATURI_IMAGE="$IMAGE" RUNTIME_ENV_FILE="$MIG_ENV" \
  docker compose -f "$BUNDLE/compose.migrate.yml" \
  -p ngaturi-migration run --rm migrate
```

Pastikan `pending=0` dan jumlah `applied` sesuai journal release tujuan. Baru setelah schema kompatibel, lanjutkan deployment app melalui [panduan deployment](production-deployment.md), dengan `--dry-run` lalu deploy versi resmi. Jangan membiarkan old app memakai schema yang breaking tanpa perlindungan.

## 9. Jika harus rollback setelah schema baru

1. **Rollback Docker:** `sudo ./rollback.sh` hanya kembali ke **release unit image** sebelumnya (app + scheduler + ops); tidak melakukan SQL reverse.
2. **Jika migrasi additive dan telah diuji kompatibel**, app lama mungkin masih aman; validasi dengan smoke test.
3. **Jika migrasi breaking/data tidak kompatibel**, jangan menjalankan app lama terhadap database baru secara buta. Ikuti prosedur restore database dari snapshot/backup terverifikasi, lakukan pengendalian writes, dan koordinasikan restore env + aplikasi. Keputusan restore dapat menghilangkan perubahan data setelah titik backup.
4. Simpan bukti tag/digest, manifest migrasi, fingerprint target, output apply, hasil QA, serta lokasi backup **tanpa mencatat password**.

## 10. Masalah umum dan keputusan cepat

| Situasi | Keputusan |
| --- | --- |
| `pending=0` | Tak perlu apply SQL; validasi schema & rilis aplikasi |
| `pending>0`, additive, SQL direview | Backup → apply → inspeksi → deploy |
| `--require-empty` gagal | Normal untuk database lama; hilangkan flag, jangan hapus tabel |
| Migrasi mencoba memakai host `-pooler` | Gunakan Neon Direct endpoint |
| Fingerprint salah | Inspeksi ulang dan konfirmasi target benar |
| History SQL berubah | Hentikan; jangan mengedit journal/migration yang sudah rilis |
| Apply gagal atau DB schema rusak | Hentikan deployment aplikasi; audit dan rencanakan recovery dari backup |

**Bacaan terkait:** [Migrasi awal database kosong](database-initial-migration.md) · [Runbook deployment dan rollback](production-deployment.md).
