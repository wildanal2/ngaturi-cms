# Panduan Deployment Production Ngaturi CMS (SSH + Docker)

> **Bahasa sederhana (ELI10):** GitHub menyimpan dua barang untuk tiap versi: **image Docker** (isi aplikasi) dan **ops artifact** (petunjuk cara memasangnya). `deploy.sh` mengambil keduanya, memastikan cocok, kemudian menjalankan **app dan scheduler** sebagai satu paket. Berpindah versi aplikasi **tidak** otomatis memindahkan atau mengembalikan isi database.

Panduan ini berlaku untuk mekanisme **release unit** yang ada pada Ngaturi CMS v1.1.2 dan fitur **auto-fetch** yang disiapkan untuk v1.1.3. Ini adalah petunjuk operator, **bukan perintah untuk dijalankan sekaligus tanpa pemeriksaan**.

## 0. Kondisi yang sudah teruji (10 November 2026)

- VM: direktori live `/home/okee/ngaturi`, state `/var/lib/ngaturi-deploy`, secret aplikasi `/etc/ngaturi/ngaturi.env`.
- **Current:** `v1.1.2`; **previous:** `v1.1.1`. App healthy; scheduler running; tidak ada `pending.json` saat pemeriksaan terakhir.
- `v1.1.2` berhasil di-deploy menggunakan `deploy.sh` yang di-*stage* dari patch auto-fetch, setelah ops artifact v1.1.2 dipublikasikan. `--dry-run v1.1.2` juga berhasil.
- **Schema Neon baru:** 10 migrasi diterapkan; 14 tabel aplikasi. **Namun belum terbukti** bahwa database yang sedang dipakai app/scheduler adalah Neon baru (`DATABASE_URL` runtime dan migration URL berbeda). *Jangan anggap cutover database selesai hanya karena Docker healthy.*
- `v1.1.3` **belum dirilis** pada saat panduan ini disusun. Perintah v1.1.3 di bawah adalah **rencana untuk nanti**, bukan laporan deployment yang sudah berhasil.

## 1. Peta folder: yang mana untuk apa?

| Lokasi | Kegunaan | Jangan lakukan |
| --- | --- | --- |
| Repo `ops/production/` | **Sumber** file operasional yang dikemas CI | Jangan salin seluruh source Next.js ke VM untuk deploy |
| VM `/home/okee/ngaturi/` | **Runtime aktif:** `deploy.sh`, `rollback.sh`, `compose.yml`, `deploy.env`, symlink `.active-release`, scheduler | Jangan ekstrak arsip menimpa direktori ini |
| VM `/var/lib/ngaturi-deploy/` | State `units.json`, release unit sebelumnya, lock, dan `pending.json` jika transaksi terputus | Jangan hapus untuk “bersih-bersih” image |
| VM `/etc/ngaturi/ngaturi.env` | Secret dan URL layanan untuk app/scheduler | Jangan kirim isinya ke chat, log, Git, atau CI artifact |
| VM `/etc/ngaturi/migration-v1.1.2.env` | Koneksi **direct** khusus migrasi Neon | Jangan berasumsi ini sudah dipakai app |

**Analogi:** `image` = mesin yang dipasang, `ops artifact` = panduan instalasi lengkap, `units.json` = buku catatan versi terpasang, dan database = gudang data terpisah.

## 2. Sebelum membuat release v1.1.3 (di PC / GitHub)

1. Pastikan patch auto-fetch dan pengujian sudah berada di branch `Staging`.
2. Pastikan **CI untuk Staging berhasil**, termasuk tes Python yang perlu dijalankan di Linux (modul `fcntl` tidak tersedia di Windows).
3. Tinjau perubahan dan *merge* `Staging` ke `main` melalui proses review normal.
4. Buat tag **baru dan tidak berubah lagi** `v1.1.3` dari commit yang sudah berada di `main` (jangan force tag). Contoh dari lokal setelah `main` terbaru dan sudah diverifikasi:

   ```bash
   git switch main
   git pull --ff-only origin main
   git tag v1.1.3
   git push origin v1.1.3
   ```

5. Di **GitHub Actions → Container release**, pastikan job `validate` dan `publish` sukses. Workflow release resmi seharusnya menerbitkan:
   - image `ghcr.io/wildanal2/ngaturi-cms:v1.1.3` dengan digest tetap;
   - GitHub Release `v1.1.3` dengan asset **`ngaturi-production-ops.tar.gz`**;
   - tag `stable` hanya setelah langkah publikasi berhasil.
6. **Jangan deploy** jika GitHub Release belum memiliki asset, workflow gagal, atau tag tidak sesuai commit main. Jangan deploy menggunakan `latest`/`stable` sebagai target production.

Catatan: **GitHub Actions tidak otomatis masuk ke VM**. Operator yang menjalankan deployment melalui SSH. `--artifact` tetap boleh digunakan untuk release historis/offline yang valid, tetapi tidak dibutuhkan untuk release baru dengan GitHub Release Asset resmi.

## 3. Periksa VM sebelum upgrade (SSH, tidak mengubah sistem)

```bash
ssh USER@HOST_VM
cd /home/okee/ngaturi

# Pastikan current/previous yang tercatat
sudo grep -E '^(CURRENT_VERSION|PREVIOUS_VERSION)=' \
  /var/lib/ngaturi-deploy/releases.env

# App dan scheduler harus aktif
sudo docker ps \
  --filter label=com.docker.compose.project=ngaturi-prod \
  --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'

# Pastikan tidak ada transaksi tertunda
sudo test ! -e /var/lib/ngaturi-deploy/pending.json \
  && echo 'OK: tidak ada pending transaction'

sudo test -s /etc/ngaturi/ngaturi.env && echo 'OK: runtime env ada'
```

**Berhenti** jika app tidak healthy, scheduler hilang, state tidak cocok, `pending.json` muncul, atau environment hilang. Jangan hapus file state untuk melewati pemeriksaan. Jika ada transaksi terputus, lihat bagian **Recovery**.

### Pemeriksaan DB sebelum cutover (tanpa membocorkan password)

Jalankan ini untuk membandingkan **endpoint dan nama database**, bukan kata sandi. Pooled dan direct bisa berbeda URL meskipun menunjuk target yang sama. Pemeriksaan ini hanya indikasi; **validasi project/branch/database di Neon Console tetap diperlukan**.

```bash
sudo python3 - <<'PY'
from pathlib import Path
from urllib.parse import urlsplit, unquote

def get_url(filename):
    rows = [line.split('=', 1)[1].strip()
            for line in Path(filename).read_text().splitlines()
            if line.startswith('DATABASE_URL=')]
    assert len(rows) == 1, 'DATABASE_URL hilang/duplikat'
    return rows[0]

def endpoint(url):
    u = urlsplit(url)
    host = (u.hostname or '').lower().replace('-pooler.', '.')
    return host, unquote(u.path.lstrip('/'))

runtime = get_url('/etc/ngaturi/ngaturi.env')
migration = get_url('/etc/ngaturi/migration-v1.1.2.env')
print('Target host+database sama:', endpoint(runtime) == endpoint(migration))
print('URL identik (bisa False karena pooler):', runtime == migration)
PY
```

**Keputusan sebelum lanjut:** bila database lama berisi data yang wajib dipertahankan, lakukan *data migration* dan validasi terlebih dahulu. Migrasi schema saja tidak memindahkan akun, undangan, pembayaran, maupun file objek. Bila memang memulai dari database kosong, catat keputusan tersebut.

## 4. Uji controller auto-fetch v1.1.3 dari direktori sementara

**Penting:** Controller resmi yang terpasang saat current `v1.1.2` masih versi lama. Karena itu **jangan langsung mengandalkan** `sudo ./deploy.sh v1.1.3` pada upgrade pertama. Jalankan controller baru dari **tag rilis resmi**, tanpa mengubah symlink controller aktif lebih dulu:

```bash
cd /home/okee/ngaturi
RELEASE_TAG=v1.1.3
STAGED_OPS=$(mktemp -d /tmp/ngaturi-release.XXXXXX)
chmod 700 "$STAGED_OPS"

for file in deploy.sh release.py; do
  curl -fsSL \
    "https://raw.githubusercontent.com/wildanal2/ngaturi-cms/${RELEASE_TAG}/ops/production/${file}" \
    -o "$STAGED_OPS/$file"
done
chmod 700 "$STAGED_OPS/deploy.sh"

# Periksa source dan sintaks sebelum menjalankan dengan hak root
bash -n "$STAGED_OPS/deploy.sh"
python3 -m py_compile "$STAGED_OPS/release.py"
# Tinjau/diff dua file dengan commit rilis tepercaya sebelum menjalankannya.

# HANYA preflight: download dan validasi ops artifact; tanpa docker pull/recreate
sudo "$STAGED_OPS/deploy.sh" --dry-run "$RELEASE_TAG"
```

Periksa hasil: `target=v1.1.3`, image digest `sha256:...`, dan `fallback=v1.1.2` (jika current masih v1.1.2). `--dry-run` bukan deployment; file artifact diunduh ke area sementara untuk divalidasi. **Jangan lanjut jika gagal.**

## 5. Cutover database, jika memang diperlukan

Bagian ini **opsional**: jalankan hanya jika target database aplikasi **belum** Neon baru dan keputusan pindah database sudah disetujui. Siapkan *maintenance window* dan rencana kembali ke database lama. Saat ini file `/etc/ngaturi/ngaturi.env` **belum dipastikan** menunjuk Neon yang dimigrasikan.

1. Pastikan data lama yang diperlukan sudah dipindahkan/dipastikan tidak diperlukan, dan tidak ada penulisan yang berjalan ke database lama selama cutover.
2. Buat backup root-only (pernah dibuat pada 10 Nov 2026, tetapi untuk cutover baru buat backup bertanggal lagi):

   ```bash
   BACKUP="/etc/ngaturi/ngaturi.env.pre-cutover.$(date +%Y%m%d%H%M%S)"
   sudo install -o root -g root -m 600 /etc/ngaturi/ngaturi.env "$BACKUP"
   echo "Backup env tersimpan: $BACKUP"
   ```

3. Siapkan `DATABASE_URL` aplikasi yang benar dari Neon Console (boleh direct atau konfigurasi pooler yang memang telah disetujui). **Jangan otomatis menyalin URL direct migrasi** tanpa verifikasi; jangan ubah secret lain. Edit file root-only secara aman, misalnya `sudoedit /etc/ngaturi/ngaturi.env`, dan pastikan hanya satu kunci `DATABASE_URL`.
4. **Segera lanjutkan deployment aplikasi yang kompatibel** pada bagian 6. Perubahan file env saja tidak mengubah environment container yang sudah berjalan.
5. Jika deploy gagal, kembalikan env dari backup yang tepat dan gunakan prosedur pemulihan release sesuai kondisi state. **Rollback image saja tidak memulihkan env atau database.**

## 6. Upgrade aplikasi v1.1.2 → v1.1.3

Saat dry-run, kompatibilitas schema, backup, dan rencana cutover sudah disetujui, jalankan **satu kali**:

```bash
cd /home/okee/ngaturi
sudo "$STAGED_OPS/deploy.sh" v1.1.3
```

Controller men-*pull* image berdasarkan **digest** di ops artifact, melakukan stop/recreate app dan scheduler, menjalankan readiness gate, dan mencatat release. **Ada downtime singkat**; gunakan maintenance window.

Verifikasi:

```bash
sudo grep -E '^(CURRENT_VERSION|PREVIOUS_VERSION)=' \
  /var/lib/ngaturi-deploy/releases.env

sudo docker ps \
  --filter label=com.docker.compose.project=ngaturi-prod \
  --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'

sudo test ! -e /var/lib/ngaturi-deploy/pending.json \
  && echo 'OK: transaksi selesai'

# Jangan cetak environment atau token ke terminal/log.
```

Harapannya `CURRENT_VERSION=v1.1.3`, `PREVIOUS_VERSION=v1.1.2`, app **healthy**, scheduler **running**, tanpa pending. Selain Docker health, lakukan uji fungsi aplikasi nyata: login, akses data yang seharusnya ada, penyimpanan undangan, Redis, R2, dan readiness `/api/ready` **secara terbatas**. `/api/health` hanya memeriksa liveness, bukan DB. Hindari polling `/api/ready` terus-menerus karena membangunkan Neon.

Setelah **v1.1.3 berhasil terpasang**, controller auto-fetch menjadi bagian runtime dan untuk release berikutnya cukup:

```bash
cd /home/okee/ngaturi
sudo ./deploy.sh --dry-run v1.1.4
sudo ./deploy.sh v1.1.4
```

Jangan menggunakan contoh v1.1.4 sampai release tersebut benar-benar tersedia.

## 7. Rollback versi aplikasi (bukan rollback database)

Jika upgrade gagal, controller mencoba memulihkan unit asal. Jika upgrade **sudah berhasil** tetapi perlu kembali ke `previous`:

1. Periksa apakah versi sebelumnya kompatibel dengan schema database saat ini. **Jangan melakukan rollback produksi jika schema lama tidak bisa membaca perubahan baru.**
2. Siapkan maintenance window, cek `CURRENT_VERSION`, `PREVIOUS_VERSION`, serta keberadaan image dan runtime env.
3. Jalankan:

   ```bash
   cd /home/okee/ngaturi
   sudo ./rollback.sh
   ```

4. Ulangi pemeriksaan container, readiness, fungsi aplikasi, dan riwayat release. Setelah rollback ke `v1.1.2`, **controller lama dapat terpasang kembali**, sehingga fitur auto-fetch mungkin tidak tersedia sampai Anda memakai staged controller dari release yang sudah diaudit.
5. **`rollback.sh` tidak mengubah schema PostgreSQL, data Neon, atau isi `/etc/ngaturi/ngaturi.env`.** Untuk pemulihan database gunakan backup/restore tervalidasi dan prosedur khusus, bukan asal membalik migrasi SQL.

## 8. Recovery jika deploy/rollback terputus

Jika listrik/SSH terputus atau `pending.json` ada, jangan menghapus state, symlink, atau container untuk “reset”. Gunakan:

```bash
cd /home/okee/ngaturi
sudo ./deploy.sh --recover
```

Recovery menggunakan **image yang telah di-cache** dan state resmi; tidak melakukan Docker pull atau migrasi DB. Jika image hilang, cek state/digest dan siapkan image yang benar sebelum mengulang. Jika recovery gagal, catat pesan gagal dan periksa log/state tanpa menghapus `pending.json`.

## 9. Kesalahan yang pernah ditemui

| Gejala | Penyebab | Tindakan aman |
| --- | --- | --- |
| `No module named fcntl` di Windows | `release.py` mengandalkan Linux | Jalankan tes runtime di WSL/Ubuntu/GitHub Actions |
| `--artifact` wajib pada controller lama | v1.1.2 resmi belum mengandung auto-fetch | Gunakan staged controller dari tag baru yang diaudit |
| GitHub Release mengembalikan `404` | Tag/image mungkin ada, tetapi Release Asset ops belum dipublikasi | Tunggu CI/publikasi asset resmi; jangan pakai artifact Staging untuk versi historis |
| `deploy.env` tidak ditemukan | Folder runtime pernah dikosongkan | Pulihkan dari release unit/state terverifikasi, bukan membuat asumsi konfigurasi |
| `pending.json` masih ada | Transaksi terputus | Jalankan prosedur recovery; jangan hapus jurnal |
| Docker app `healthy` tetapi data tidak ada | `/api/health` tidak memeriksa PostgreSQL | Periksa target Neon dan lakukan readiness + uji data nyata |

## 10. Checklist sebelum operator menyatakan sukses

- [ ] Tag rilis resmi dan GitHub Release Asset **sesuai commit**; CI hijau.
- [ ] Backup environment, database, dan rencana rollback sudah disiapkan jika ada perubahan DB.
- [ ] Preflight `--dry-run` lulus tanpa mengubah container.
- [ ] Runtime app dan scheduler menggunakan image digest release yang sama.
- [ ] Current/previous sesuai; tidak ada `pending.json`.
- [ ] App healthy, scheduler running, `/api/ready` diuji secukupnya.
- [ ] Database yang **benar-benar digunakan aplikasi** telah diperiksa, bukan hanya file migrasi.
- [ ] Login, data, pembayaran/undangan yang relevan, dan layanan eksternal lolos smoke test.
- [ ] Waktu deployment, operator, tag, digest, status DB, dan hasil verifikasi dicatat.

**Bacaan lanjutan:** [Migrasi awal Neon](database-initial-migration.md) · [Migrasi lanjutan](database-incremental-migration.md) · [Detail controller](../ops/production/README.md).
