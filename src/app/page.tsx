import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
      <div className="space-y-4">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Undangan digital yang cantik, cepat, terjangkau
        </h1>
        <p className="mx-auto max-w-xl text-lg text-zinc-600">
          Buat undangan pernikahan, khitan, aqiqah, dan tahlil dalam hitungan
          menit — tanpa skill desain. Undangan pertama gratis.
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Mulai gratis
        </Link>
        <Link
          href="/templates"
          className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium hover:bg-zinc-50"
        >
          Lihat template
        </Link>
      </div>
    </main>
  );
}
