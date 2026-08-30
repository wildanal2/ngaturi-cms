import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  CircleCheck,
  Users,
  Images,
  MessageCircleHeart,
  Timer,
  Music,
  Gift,
  MapPin,
  Share2,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ShowcaseGrid } from "@/components/marketing/showcase-grid";
import { Reveal } from "@/components/marketing/reveal";
import { getRecentInvitations } from "@/lib/invitation/showcase";
import { TEMPLATES } from "@/lib/templates/catalog";
import {
  CornerFloral,
  LeafSprig,
  Divider,
  TopGarland,
} from "@/sections/ornaments";

export const revalidate = 600;

const FEATURES = [
  { icon: Sparkles, title: "Sampul yang berkesan", body: "Halaman pembuka 'Buka Undangan' dengan foto & nama tamu personal." },
  { icon: Users, title: "Profil mempelai", body: "Perkenalan kedua mempelai lengkap dengan orang tua & Instagram." },
  { icon: Timer, title: "Hitung mundur", body: "Beberapa gaya — flip clock, cincin progres, minimalis — menuju hari-H." },
  { icon: MapPin, title: "Lokasi & rangkaian acara", body: "Akad, resepsi, unduh mantu — dengan peta Google tersemat." },
  { icon: CircleCheck, title: "RSVP", body: "Konfirmasi kehadiran + jumlah tamu, terkelola rapi di dashboard." },
  { icon: MessageCircleHeart, title: "Buku tamu / ucapan", body: "Ucapan & doa dari tamu, dengan moderasi anti-spam." },
  { icon: Images, title: "Galeri foto", body: "Grid, masonry, atau carousel — foto dioptimasi otomatis ke WebP." },
  { icon: Gift, title: "Amplop digital", body: "Rekening & e-wallet dengan tombol salin dan logo bank." },
  { icon: Music, title: "Musik latar", body: "Putar otomatis saat undangan dibuka, tombol jeda mengambang." },
];

const STEPS = [
  ["Pilih template", "Mulai dari desain gratis yang sudah rapi & elegan."],
  ["Isi & atur di builder", "Ubah teks, foto, warna, dan urutan bagian — pratinjau real-time di frame HP."],
  ["Publikasikan & bagikan", "Salin tautan, sebar via WhatsApp, atau kirim link personal per tamu."],
];

const TESTIMONIALS = [
  { name: "Dinda & Raka", role: "Pernikahan · Bandung", text: "Bikinnya cepat banget, tinggal ganti foto sama teks. Tamu bilang undangannya cakep dan gampang isi RSVP." },
  { name: "Keluarga Arkan", role: "Khitan · Sidoarjo", text: "Suka karena ada pilihan tema yang nggak kaku. Fitur ucapan bikin acara terasa lebih hangat." },
  { name: "Fatimah & Umar", role: "Pernikahan · Yogyakarta", text: "Nuansa islamik-nya pas, ada kolom ayat & doa. Musiknya juga bikin adem waktu dibuka." },
];

const FAQ = [
  ["Apakah benar-benar gratis?", "Undangan pertama gratis dengan masa edit 7 hari — bisa publish, terima RSVP & ucapan. Setelah itu builder terkunci sampai kamu upgrade (mulai Rp 49rb, sekali bayar per undangan)."],
  ["Undangan tetap online setelah masa trial?", "Ya. Undangan yang sudah dipublikasikan tetap tayang meski masa edit berakhir — hanya penyuntingannya yang terkunci."],
  ["Bisa personalisasi nama tamu?", "Bisa (paket Premium). Buat tautan personal per tamu — nama tamu tampil di sampul, jumlah tamu terkontrol, plus link WhatsApp siap kirim."],
  ["Bagaimana dengan foto — perlu diedit dulu?", "Tidak. Upload langsung dari builder, foto otomatis di-crop sesuai keinginan, di-resize, dan dikonversi ke WebP agar undangan tetap ringan."],
  ["Jenis acara apa saja yang didukung?", "Pernikahan, khitan, aqiqah, tahlil, lamaran, dan acara umum lainnya."],
];

export default async function Home() {
  const recent = await getRecentInvitations(6);

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        {/* ================= HERO ================= */}
        <section className="relative overflow-hidden">
          <TopGarland className="pointer-events-none absolute inset-x-0 -top-2 h-28 w-full text-gold/25" />
          <CornerFloral className="m-float pointer-events-none absolute -top-10 -left-16 hidden h-64 w-64 text-forest/15 md:block" />
          <CornerFloral className="m-float-slow pointer-events-none absolute -right-16 top-28 hidden h-56 w-56 -scale-x-100 text-wine/15 lg:block" />

          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-16 pb-24 sm:pt-24 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <Reveal dir="up">
                <span className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-1 text-xs font-medium tracking-wide text-forest-400 uppercase">
                  <Sparkles size={13} /> Undangan digital Indonesia
                </span>
              </Reveal>
              <Reveal dir="up" delay={60}>
                <h1 className="mt-5 max-w-2xl text-4xl leading-[1.08] text-ink sm:text-6xl">
                  Undangan Digital{" "}
                  <span className="m-shimmer">Berkelas</span> &amp; Bermakna
                </h1>
              </Reveal>
              <Reveal dir="up" delay={120}>
                <p className="mt-6 max-w-xl text-lg text-ink-soft">
                  Rangkai undangan pernikahan, khitan, aqiqah, dan tahlil yang
                  elegan dalam hitungan menit — lengkap dengan RSVP, buku tamu,
                  galeri, dan hitung mundur. Undangan pertama gratis.
                </p>
              </Reveal>
              <Reveal dir="up" delay={180} className="mt-9 flex flex-wrap gap-3">
                <ButtonLink href="/login" size="lg">
                  Buat undangan gratis
                </ButtonLink>
                <ButtonLink href="/templates" variant="outline" size="lg">
                  Lihat template
                </ButtonLink>
              </Reveal>
              <Reveal
                dir="up"
                delay={240}
                className="mt-8 flex items-center gap-3 text-sm text-muted"
              >
                <Share2 size={15} className="text-forest" />
                Bagikan via WhatsApp, salin tautan, atau QR code
              </Reveal>
            </div>

            {/* floating template preview */}
            <Reveal dir="zoom" className="relative mx-auto w-full max-w-sm">
              <div className="m-float absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-forest/10 to-wine/10 blur-2xl" />
              <div className="relative overflow-hidden rounded-[2rem] border-8 border-ink bg-white shadow-2xl">
                <Image
                  src="/templates/kana-noir/card"
                  alt="Contoh undangan Ngaturi"
                  width={600}
                  height={800}
                  className="aspect-[3/4] w-full object-cover"
                  unoptimized
                  priority
                />
              </div>
              <LeafSprig className="m-float-slow absolute -bottom-6 left-1/2 h-8 w-48 -translate-x-1/2 text-gold/60" />
            </Reveal>
          </div>
        </section>

        {/* ================= TRUST STRIP ================= */}
        <section className="border-y border-line/70 bg-cream-200/40">
          <Reveal
            stagger
            className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-5 py-10 text-center sm:grid-cols-4"
          >
            {[
              ["Menit", "Rata-rata bikin"],
              ["11 bagian", "Blok siap pakai"],
              ["25+", "Varian tampilan"],
              ["Rp 0", "Undangan pertama"],
            ].map(([big, small]) => (
              <div key={small}>
                <p className="font-display text-2xl text-forest sm:text-3xl">
                  {big}
                </p>
                <p className="mt-1 text-xs text-ink-soft sm:text-sm">{small}</p>
              </div>
            ))}
          </Reveal>
        </section>

        {/* ================= FITUR ================= */}
        <section className="mx-auto max-w-6xl px-5 py-24">
          <Reveal dir="up" className="text-center">
            <Divider className="mx-auto h-5 w-40 text-gold" />
            <h2 className="mt-4 text-3xl sm:text-4xl">
              Semua yang bikin undangan terasa lengkap
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-ink-soft">
              Bukan sekadar poster digital — setiap bagian bisa diatur, diganti
              gayanya, dan diurutkan sesuka hati.
            </p>
          </Reveal>

          <Reveal
            stagger
            className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-line bg-paper p-6 transition-shadow hover:shadow-[0_8px_30px_rgba(52,80,63,0.08)]"
              >
                <span className="inline-grid h-10 w-10 place-items-center rounded-xl bg-forest/10 text-forest">
                  <f.icon size={18} />
                </span>
                <h3 className="mt-4 text-lg">{f.title}</h3>
                <p className="mt-1.5 text-sm text-ink-soft">{f.body}</p>
              </div>
            ))}
          </Reveal>
        </section>

        {/* ================= CARA KERJA ================= */}
        <section className="border-y border-line/70 bg-cream-200/40">
          <div className="mx-auto max-w-5xl px-5 py-24">
            <Reveal dir="up" className="text-center">
              <h2 className="text-3xl sm:text-4xl">Tiga langkah, selesai</h2>
            </Reveal>
            <Reveal stagger className="mt-14 grid gap-6 sm:grid-cols-3">
              {STEPS.map(([t, d], i) => (
                <div
                  key={t}
                  className="relative rounded-2xl border border-line bg-paper p-6"
                >
                  <span className="font-display text-4xl text-forest/25">
                    0{i + 1}
                  </span>
                  <h3 className="mt-2 text-lg">{t}</h3>
                  <p className="mt-1.5 text-sm text-ink-soft">{d}</p>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ================= TEMPLATE ================= */}
        <section className="mx-auto max-w-6xl px-5 py-24">
          <Reveal dir="up" className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-3xl sm:text-4xl">Template pilihan</h2>
              <p className="mt-2 text-ink-soft">
                Semua bisa dipakai gratis untuk undangan pertamamu.
              </p>
            </div>
            <Link
              href="/templates"
              className="text-sm font-medium text-forest hover:underline"
            >
              Semua template →
            </Link>
          </Reveal>
          <Reveal stagger className="mt-12 grid gap-6 sm:grid-cols-3">
            {TEMPLATES.slice(0, 3).map((t) => (
              <Link
                key={t.id}
                href={`/templates/${t.id}/preview`}
                className="group overflow-hidden rounded-2xl border border-line bg-paper"
              >
                <Image
                  src={t.thumbnail}
                  alt={t.name}
                  width={400}
                  height={300}
                  className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-105"
                  unoptimized
                />
                <div className="p-5">
                  <h3 className="text-lg">{t.name}</h3>
                  <p className="mt-1 text-sm text-ink-soft">{t.description}</p>
                </div>
              </Link>
            ))}
          </Reveal>
        </section>

        {/* ================= UNDANGAN TERBARU ================= */}
        {recent.length >= 1 ? (
          <section className="border-y border-line/70 bg-cream-200/40">
            <div className="mx-auto max-w-6xl px-5 py-24">
              <Reveal dir="up" className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-3xl sm:text-4xl">Undangan Terbaru</h2>
                  <p className="mt-2 text-ink-soft">
                    Baru saja dibuat orang lain dengan Ngaturi.
                  </p>
                </div>
                <Link
                  href="/undangan-terbaru"
                  className="text-sm font-medium text-forest hover:underline"
                >
                  Lihat semua →
                </Link>
              </Reveal>
              <Reveal dir="up" className="mt-12">
                <ShowcaseGrid items={recent} />
              </Reveal>
            </div>
          </section>
        ) : null}

        {/* ================= TESTIMONI ================= */}
        <section className="mx-auto max-w-6xl px-5 py-24">
          <Reveal dir="up" className="text-center">
            <Divider className="mx-auto h-5 w-40 text-gold" />
            <h2 className="mt-4 text-3xl sm:text-4xl">Kata mereka</h2>
          </Reveal>
          <Reveal stagger className="mt-14 grid gap-6 sm:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure
                key={t.name}
                className="rounded-2xl border border-line bg-paper p-6"
              >
                <blockquote className="text-ink-soft">
                  &ldquo;{t.text}&rdquo;
                </blockquote>
                <figcaption className="mt-4 text-sm">
                  <span className="font-medium">{t.name}</span>
                  <span className="block text-xs text-muted">{t.role}</span>
                </figcaption>
              </figure>
            ))}
          </Reveal>
        </section>

        {/* ================= FAQ ================= */}
        <section className="border-t border-line/70 bg-cream-200/40">
          <div className="mx-auto max-w-3xl px-5 py-24">
            <Reveal dir="up" className="text-center">
              <h2 className="text-3xl sm:text-4xl">Pertanyaan umum</h2>
            </Reveal>
            <Reveal stagger className="mt-12 space-y-3">
              {FAQ.map(([q, a]) => (
                <details
                  key={q}
                  className="group rounded-xl border border-line bg-paper p-4"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
                    {q}
                    <span className="text-muted transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm text-ink-soft">{a}</p>
                </details>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ================= CTA ================= */}
        <section className="relative overflow-hidden px-5 py-28 text-center">
          <CornerFloral className="m-float pointer-events-none absolute -bottom-12 -left-12 h-56 w-56 text-forest/15" />
          <CornerFloral className="m-float-slow pointer-events-none absolute -right-12 -bottom-12 h-56 w-56 -scale-x-100 text-wine/15" />
          <Reveal dir="up" className="relative mx-auto max-w-xl">
            <LeafSprig className="mx-auto h-6 w-40 text-gold" />
            <h2 className="mt-5 text-3xl sm:text-4xl">
              Siap membuat undanganmu?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-ink-soft">
              Masuk dengan Google, pilih template, bagikan hari ini juga.
            </p>
            <ButtonLink href="/login" size="lg" className="mt-8">
              Mulai sekarang — gratis
            </ButtonLink>
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
