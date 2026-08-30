import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ketentuan Layanan — Ngaturi" };

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl flex-1 space-y-4 px-5 py-16 text-ink-soft">
        <h1 className="text-3xl text-ink">Ketentuan Layanan</h1>
        <p>
          Dengan menggunakan Ngaturi, Anda setuju untuk tidak mengunggah konten
          yang melanggar hukum atau hak orang lain. Setiap akun mendapat satu
          undangan gratis dengan masa edit 3 hari.
        </p>
        <p>
          Undangan berbayar bersifat sekali bayar per undangan dan aktif sampai
          30 hari setelah tanggal acara, kecuali diperpanjang. Undangan yang
          sudah dipublikasikan tetap tayang meski masa edit berakhir.
        </p>
        <p>
          Kami dapat menonaktifkan undangan yang melanggar ketentuan tanpa
          pemberitahuan sebelumnya.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
