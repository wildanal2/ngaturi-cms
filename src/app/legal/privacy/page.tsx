import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Kebijakan Privasi — Ngaturi" };

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl flex-1 space-y-4 px-5 py-16 text-ink-soft">
        <h1 className="text-3xl text-ink">Kebijakan Privasi</h1>
        <p>
          Ngaturi mengumpulkan data yang Anda berikan saat membuat undangan
          (nama, foto, detail acara) serta data tamu yang mengisi RSVP dan buku
          tamu. Data digunakan semata untuk menjalankan layanan undangan Anda.
        </p>
        <p>
          Data tamu (nama, nomor telepon, ucapan) dimiliki oleh pembuat
          undangan. Kami tidak menjual data ke pihak ketiga. Data undangan yang
          kedaluwarsa diarsipkan dan dapat dihapus permanen setelah 90 hari.
        </p>
        <p>
          Untuk permintaan penghapusan data, hubungi kami melalui email dukungan.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
