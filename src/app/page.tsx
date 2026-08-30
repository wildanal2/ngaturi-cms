import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getRecentInvitations } from "@/lib/invitation/showcase";

export const revalidate = 600;

const EVENT_LABEL: Record<string, string> = {
  wedding: "Pernikahan",
  khitan: "Khitan",
  tahlil: "Tahlil",
  aqiqah: "Aqiqah",
  engagement: "Lamaran",
  birthday: "Ulang tahun",
  generic: "Acara",
};

const FEATURES = [
  {
    title: "Builder per-bagian",
    body: "Susun undangan dari blok siap pakai — sampul, mempelai, acara, galeri, RSVP, ucapan. Ganti gaya sekali klik.",
  },
  {
    title: "RSVP & buku tamu",
    body: "Kumpulkan konfirmasi kehadiran dan ucapan doa dalam satu tempat, lengkap dengan moderasi anti-spam.",
  },
  {
    title: "Undangan per-tamu",
    body: "Bagikan tautan personal — nama tamu tampil di sampul, jumlah tamu terkontrol.",
  },
  {
    title: "Cepat & ringan",
    body: "Halaman undangan dioptimalkan untuk dibuka di WhatsApp: hitungan mundur, musik, galeri, semua mulus.",
  },
];

const STEPS = [
  ["Pilih template", "Mulai dari desain gratis yang sudah rapi."],
  ["Isi & atur", "Ubah teks, foto, dan urutan bagian di builder."],
  ["Bagikan", "Publikasikan, salin tautan, sebar via WhatsApp & QR."],
];

export default async function Home() {
  const recent = await getRecentInvitations(8);

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-5 pt-16 pb-20 sm:pt-24">
          <p className="mb-4 text-sm font-medium tracking-wide text-forest-400 uppercase">
            Undangan digital · sejak hari ini
          </p>
          <h1 className="max-w-3xl text-4xl leading-[1.1] text-ink sm:text-6xl">
            Undangan digital yang tenang, elegan, dan mudah dibuat.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink-soft">
            Pernikahan, khitan, aqiqah, tahlil — rangkai undangan yang indah
            dalam hitungan menit. Undangan pertama gratis.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href="/login" size="lg">
              Buat undangan gratis
            </ButtonLink>
            <ButtonLink href="/templates" variant="outline" size="lg">
              Lihat template
            </ButtonLink>
          </div>

          <div className="mt-16 grid gap-4 rounded-2xl border border-line bg-paper p-4 shadow-[0_1px_0_rgba(0,0,0,0.03)] sm:grid-cols-3">
            {STEPS.map(([t, d], i) => (
              <div key={t} className="rounded-xl bg-cream-200/60 p-5">
                <span className="font-display text-2xl text-forest">
                  {i + 1}
                </span>
                <h3 className="mt-2 text-lg">{t}</h3>
                <p className="mt-1 text-sm text-ink-soft">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="border-y border-line/70 bg-cream-200/40">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <h2 className="text-3xl sm:text-4xl">Semua yang kamu butuhkan</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl border border-line bg-paper p-6"
                >
                  <h3 className="text-xl">{f.title}</h3>
                  <p className="mt-2 text-ink-soft">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Undangan Terbaru */}
        {recent.length >= 1 ? (
          <section className="mx-auto max-w-6xl px-5 py-20">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-3xl sm:text-4xl">Undangan Terbaru</h2>
                <p className="mt-2 text-ink-soft">
                  Baru saja dibuat orang lain dengan Ngaturi.
                </p>
              </div>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((r) => (
                <Link
                  key={r.slug}
                  href={`/${r.slug}`}
                  className="group overflow-hidden rounded-2xl border border-line bg-paper"
                >
                  <div className="relative aspect-[1200/630] w-full bg-cream-200">
                    <Image
                      src={r.image}
                      alt={r.title}
                      fill
                      unoptimized
                      className="object-contain transition-transform group-hover:scale-[1.03]"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-muted">
                      {EVENT_LABEL[r.eventType] ?? "Acara"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* CTA */}
        <section className="mx-auto max-w-4xl px-5 py-24 text-center">
          <h2 className="text-3xl sm:text-4xl">Siap membuat undanganmu?</h2>
          <p className="mx-auto mt-4 max-w-md text-ink-soft">
            Masuk dengan Google, pilih template, dan bagikan hari ini juga.
          </p>
          <ButtonLink href="/login" size="lg" className="mt-8">
            Mulai sekarang
          </ButtonLink>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
