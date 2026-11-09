Usulan koreksi data `saya-kamu` — **belum diterapkan**. Sumber: payload publik read-only dari [halaman referensi](https://dev.ngaturi.com/saya-kamu), 17 Oktober 2026. Semua uji memakai salinan lokal; tidak ada query tulis, normalisasi, atau perubahan undangan remote.

**Urutan komposisi.** Payload berisi 14 section dengan ID unik. `closing.order=7`, `countdown.order=8` dan varian Countdown `flip`. Preset saat ini sudah menempatkan Countdown tepat sebelum Acara dan Closing terakhir, tetapi undangan ini menyimpan urutan lama. Kode baru memberikan treatment sinematik untuk `flip` dan menghormati urutan penulis. Karena itu undangan ini tetap membutuhkan keputusan pemilik agar Penutup menjadi bab terakhir.

Usulan urutan array beserta `order` 0–13:

`cover → hero → couple-intro → quote → gallery → countdown → event-details → map-location → rsvp → gift → guestbook → closing → music → navigation`

| Section       | ID tetap                               | Order lama → usulan |
| ------------- | -------------------------------------- | ------------------- |
| event-details | `c6ed7316-a03c-4c75-9490-82c14d77a24f` | 5 → 6               |
| map-location  | `261e0211-2f36-4ca3-ba31-3f9de56bd4ff` | 6 → 7               |
| closing       | `4e9ad8ab-d2fb-4e46-b35a-734ac5ea99a5` | 7 → 11              |
| countdown     | `7c339955-436f-46f3-9036-4cd321d1c5b0` | 8 → 5               |
| rsvp          | `fa50f2a6-de49-4fce-81d8-912385350296` | 9 → 8               |
| gift          | `a6510eb0-d478-4012-86aa-6c890d174c9b` | 10 → 9              |
| guestbook     | `5f3d244d-9382-43f9-a95e-dc5da2a3b50b` | 11 → 10             |

Pertahankan seluruh ID, `variant`, `visible`, `props` dan `global_settings`. Perubahan hanya posisi elemen dalam array serta `order` yang sesuai. Jika disetujui di sesi terpisah, ambil ulang versi undangan, pastikan seluruh ID/order masih cocok, simpan snapshot untuk rollback, lalu lakukan satu pembaruan komposisi melalui jalur yang memvalidasi kepemilikan. Hentikan bila ada perubahan bersamaan. Tidak ada tindakan tersebut dilakukan di pekerjaan ini.

**Tempat dan peta.** Kode CTA mengambil URL dari record terkait dan tidak menukar Events dengan Location. Tidak ada koordinat pengganti yang ditebak.

| Record / ID section                                                | Alamat / nama tersimpan                                                        | Field peta yang perlu diperiksa pemilik                                         |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `event-details.events[0]` / `c6ed7316-a03c-4c75-9490-82c14d77a24f` | Masjid Al-Falah; Jl. Melati No. 10, Bandung; Akad 08:00–10:00                  | `maps_url`: `query=-6.914744,107.609810`                                        |
| `event-details.events[1]` / ID sama                                | Gedung Serbaguna Graha Melati; Jl. Melati No. 12, Bandung; Resepsi 11:00–14:00 | `maps_url`: koordinat sama dengan Akad                                          |
| `map-location` / `261e0211-2f36-4ca3-ba31-3f9de56bd4ff`            | Graha Melati; Jl. Melati No. 12, Bandung                                       | `maps_url`: `query=-6.175392,106.827153`; `embed_url`: `q=-6.175392,106.827153` |

Pemilik perlu memastikan pin Akad dan Resepsi secara terpisah, lalu menyatakan Location merujuk acara yang mana. Setelah itu, samakan `maps_url` dan `embed_url` Location dengan lokasi yang disetujui. Alamat/nama venue hanya diubah jika pemilik mengonfirmasikannya. Tanggal tersimpan pada masing-masing `events[i].date`; jam berasal dari `start_time`/`end_time`. Hero dan Countdown mempunyai field tanggal sendiri; perubahan jadwal perlu meninjau ketiganya.

**Fotografi.** Hero/Closing menggunakan Picsum dan portrait menggunakan avatar contoh; gallery juga berisi foto sampel. Kode mempertahankan seluruh URL. Diperlukan satu set foto pasangan yang berizin, meliputi foto utama, dua portrait, gallery, dan penutup. Focal point foto pasangan asli perlu ditinjau setelah aset tersedia. Tidak ada biografi atau foto baru yang dibuat untuk menggantikan konten pemilik.
