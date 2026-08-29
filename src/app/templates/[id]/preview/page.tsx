import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTemplate } from "@/lib/templates/catalog";
import { hydrateTemplateSections } from "@/lib/templates/hydrate";
import { InvitationRenderer } from "@/lib/invitation/renderer";
import { InvitationCover } from "@/components/invitation/cover";
import type { SectionData } from "@/sections/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const t = getTemplate(id);
  return { title: t ? `Pratinjau ${t.name} — Ngaturi` : "Template" };
}

export default async function TemplatePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = getTemplate(id);
  if (!t) notFound();

  const sections: SectionData[] = hydrateTemplateSections(t);

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-line bg-paper/95 px-4 py-2.5 backdrop-blur">
        <Link href="/templates" className="text-sm text-ink-soft hover:text-ink">
          ← Semua template
        </Link>
        <span className="text-sm font-medium">{t.name}</span>
        <Link
          href={`/templates/${t.id}/use`}
          className="rounded-full bg-forest px-4 py-1.5 text-sm font-medium text-cream hover:bg-forest-600"
        >
          Pakai template
        </Link>
      </div>

      <div className="relative mx-auto max-w-lg">
        <InvitationCover
          names={
            (t.sections.find((s) => s.type === "hero")?.props
              ?.couple_names as string) ?? t.name
          }
          guestName={null}
          global={t.global_settings}
        />
        <InvitationRenderer
          sections={sections}
          global={t.global_settings}
          isPreview
        />
      </div>
    </div>
  );
}
