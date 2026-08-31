import type { Metadata } from "next";
import { MarketingPage, PageHeading } from "@/components/marketing/page-shell";
import { ButtonLink } from "@/components/ui/button";
import { ShowcaseGrid } from "@/components/marketing/showcase-grid";
import { getRecentInvitations } from "@/lib/invitation/showcase";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Undangan Terbaru — Dibuat Pengguna Ngaturi",
  description:
    "Lihat undangan digital yang baru saja dibuat orang lain dengan Ngaturi — pernikahan, khitan, aqiqah, dan tahlil.",
  alternates: { canonical: "/undangan-terbaru" },
};

export default async function UndanganTerbaruPage() {
  const items = await getRecentInvitations(60);

  return (
    <MarketingPage>
      <PageHeading
        title="Undangan Terbaru"
        description="Baru saja dibuat orang lain dengan Ngaturi. Klik salah satu untuk membukanya."
      />

      {items.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-line p-12 text-center text-ink-soft">
          Belum ada undangan yang dipublikasikan.
        </div>
      ) : (
        <div className="mt-10 sm:mt-12">
          <ShowcaseGrid items={items} />
        </div>
      )}

      <div className="mt-16 rounded-2xl border border-line bg-cream-200/50 p-8 text-center sm:mt-20">
        <h2 className="text-2xl">Buat undanganmu sendiri</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
          Gratis untuk undangan pertama. Pilih template, isi, lalu bagikan.
        </p>
        <ButtonLink href="/login" size="lg" className="mt-5">
          Mulai gratis
        </ButtonLink>
      </div>
    </MarketingPage>
  );
}
