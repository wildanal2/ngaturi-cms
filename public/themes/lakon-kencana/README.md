# Lakon Kencana — sumber aset

Semua bitmap dibuat baru dengan **built-in imagegen**, 17 Oktober 2026. Tidak ada foto, wayang, gunungan, musik, branding, font, kode atau stylesheet Sowanan yang disalin atau di-hotlink. Pasangan dalam foto demo sepenuhnya fiktif/sintetis; nama contoh pada preset tidak mengidentifikasi orang dalam foto. Pengguna perlu menggantinya dengan foto dan konten mereka sebelum membagikan undangan.

| Berkas                                                      | Asal dan penggunaan                                                                                                                            |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `gunungan.webp`                                             | Generasi orisinal transparan, 600×900; pembuka/loading/penutup                                                                                 |
| `wayang-pair.webp`                                          | Generasi orisinal transparan, 1200×800; dekorasi hero dan muka kartu. Pemisahan kiri/kanan dilakukan dengan CSS tanpa mengambil wayang vendor. |
| `demo-couple.webp`, `demo-portrait.webp`, `demo-rings.webp` | Generasi orisinal; versi presentasi lebar 900 px: landscape 900×600, portrait 900×1350                                                         |
| `demo-*-full.webp`                                          | Versi resolusi penuh yang hanya dimuat saat lightbox dibuka, melalui field `images[].full_url`                                                 |
| `kawung.svg`, `kawung-dark.svg`                             | Motif geometris baru digambar langsung untuk proyek; bukan tracing                                                                             |
| `flourish.svg`                                              | Sulur/teratai simetris baru, dibuat dengan path SVG independen                                                                                 |
| `batik-border.svg`                                          | Pita wajik geometris baru                                                                                                                      |
| `thumbnail.webp`                                            | Komposisi baru 4:3 dari gunungan sendiri, tipografi dan bidang kertas                                                                          |

Konversi ukuran dan WebP memakai Sharp, mempertahankan alpha artwork. File PNG sumber tetap di direktori generasi lokal, bukan dependensi runtime. Semua aset yang dipakai aplikasi berada di folder ini. Total bitmap sekitar 1.9 MiB; versi penuh tidak masuk anggaran pemuatan pertama.

Potret presentasi berukuran 209.110 byte; versi penuh 1024×1536 berukuran 389.114 byte. Hero, dua kartu mempelai, satu babak cerita dan foto pertama galeri memakai pasangan sintetis yang sama. Dua kartu tersebut sengaja mendemokan pasangan bersama, bukan potret individu; sumber foto pria/wanita tetap terpisah dan editable. Untuk undangan nyata, gunakan foto masing-masing dan atur crop melalui Builder. Kartu memakai cover/center, sedangkan posisi hero memiliki field tersendiri.

Tipografi memakai Cormorant Garamond dan Inter lokal yang sudah tersedia di `src/assets/fonts/`, dengan fallback Georgia dan system-ui. Tidak menambah font eksternal atau font milik referensi. Musik sengaja kosong sampai pengguna memilih lagu melalui Music Picker yang sudah ada. Tidak ada nada latar yang diekstrak; bunyi bilah saron merupakan oscillator pendek yang hanya aktif setelah tamu memilih mengaktifkannya dan mengetuk bilah.

Ilustrasi wayang/gunungan merupakan interpretasi dekoratif baru berbantuan AI, bukan dokumentasi otentik karakter pewayangan tertentu. Nomor rekening/QRIS tidak disertakan. Gift baru muncul jika section diaktifkan dan rekening diisi; fitur QRIS referensi tidak ditambahkan karena kontrak Gift Ngaturi saat ini berupa rekening/e-wallet.

## Prompt generasi

1. **Gunungan** — `exec-7bd64802-5649-48cf-94c7-cf7b2054be8a.png`, transparan.

   Use case: illustration-story. Create ONE original fine-art Javanese gunungan kayon shadow-puppet artwork as a transparent PNG asset for an Indonesian wedding invitation called Lakon Kencana. No reference artwork supplied; create a fresh independent design, do not imitate a particular artisan. Upright leaf-shaped silhouette tapering to a sharp tip, central branching tree of life, two delicately engraved birds, curving lotus and vines, small symmetrical temple door at base. Exquisite pierced leather craft, aged warm brass-gold, dark chocolate engraved outlines, small ivory negative spaces, tiny restrained terracotta details. Sophisticated real handmade heirloom puppet aesthetic, materially dimensional but viewed straight-on, not flat simple icon. Full entire gunungan visible including a slim vertical wooden support rod underneath. Portrait composition, artwork fills 85% height with clear transparent margins. Background fully transparent; no cast backdrop, no surface, no text, no typography, no watermarks, no frame, no real people, no photographic reference assets.

2. **Pasangan wayang** — `exec-bd561852-3f47-4bde-a8e8-d55c97d42b6c.png`, transparan.

   Use case: illustration-story. Create ONE original asset: a matched pair of exquisite traditional Javanese wayang kulit shadow puppets, male at left facing right, female at right facing left, complete standing full bodies with long thin support rods below feet, separated by generous empty space. Fine pierced leather craft in antique warm gold, dark umber engraving, tiny muted rust details. Slender long arms, gracefully bowed narrow profile faces, elaborate curved crowns and patterned traditional clothing. Museum heirloom craftsmanship, straight on, crisp intricate details, warm matte gold not shiny plastic. Independent new design, not a copy of any supplied image. Landscape canvas 3:2 with equally sized figures each occupying about 35% width. Both entire puppets visible, no clipped heads or feet. Fully transparent background, no stage, no text, no people, no lettering, no watermark.

3. **Foto pasangan demo** — `exec-17acc036-6ac0-42a2-8fbf-14a990c57890.png`.

   Use case: photorealistic-natural. Create one editorial wedding portrait for a website demo, landscape 3:2. Fictional Indonesian Javanese newlyweds, adult man and woman in their late 20s, warm medium brown skin, natural human faces. Groom in dark brown beskap and blangkon, bride in ivory kebaya with jasmine in hair, no crown. Both stand close in the right half of a sunlit old Javanese wooden pendopo, bride gently holds the groom's arm, candid affectionate quiet smiles. Left side shows softly lit wood columns and trailing jasmine. Premium analog photography, soft daylight, tasteful warm muted sepia undertone, real fine grain and natural skin, restrained luxurious editorial feeling. Full bodies, careful hands. No text, no lettering, no logos, no real person imitation.

4. **Cincin/jasmine** — `exec-dfe79fd8-7b1d-4962-a83f-d590b11367ca.png`.

   Use case: photorealistic-natural. Create one editorial macro wedding detail photograph for an Indonesian wedding website demo. Landscape 3:2. Two simple gold wedding rings resting on rich dark brown patterned batik fabric and an ivory folded invitation sheet without any writing, loose jasmine blossoms to one side, edge of a warm wooden tray. Natural late-afternoon side light, soft shadow, shallow depth of field, premium analog film photography, warm muted cream and umber tones with restrained brass gold, generous quiet negative space in top third. Authentic still life without humans. No readable text, no branding, no lettering, no watermark.

5. **Foto portrait demo** — `exec-f0902d6e-8149-46f5-8e2a-9d6d3c81d773.png`. Edit memakai foto pasangan orisinal nomor 3 sebagai satu-satunya input.

   Edit the supplied original generated fictional wedding portrait into ONE new portrait-oriented editorial close-up photo of the SAME fictional adult Indonesian newlywed couple with the SAME natural faces, warm medium brown skin, clothing, groom in dark brown beskap with batik blangkon and bride in ivory kebaya with jasmine hair garland. They stand together in a shaded lush green courtyard by the same Javanese wooden pendopo, framed waist-up, groom at left, bride at right, natural affectionate smile toward each other. Soft late afternoon sunlight, slightly film-grained premium muted warm analog look matching the original. Keep faces and clothing consistent. This is a new angle for a demo gallery. No text, no logos, no letters, no watermarks. Portrait 2:3 composition.
