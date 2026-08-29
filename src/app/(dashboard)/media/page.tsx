import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import { CopyChip } from "@/components/dashboard/copy-chip";

function collectImageUrls(sections: unknown): string[] {
  const urls = new Set<string>();
  const walk = (v: unknown) => {
    if (typeof v === "string") {
      if (/^https?:\/\/.+\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(v)) urls.add(v);
    } else if (Array.isArray(v)) {
      v.forEach(walk);
    } else if (v && typeof v === "object") {
      Object.values(v).forEach(walk);
    }
  };
  walk(sections);
  return [...urls];
}

export default async function MediaPage() {
  const session = await requireUser();
  const rows = await db
    .select({ id: invitations.id, title: invitations.eventTitle, slug: invitations.slug, sections: invitations.sections })
    .from(invitations)
    .where(eq(invitations.userId, session.user.id));

  const groups = rows
    .map((r) => ({
      label: r.title ?? r.slug,
      images: collectImageUrls(r.sections),
    }))
    .filter((g) => g.images.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Media</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Semua foto yang dipakai di undanganmu. Unggah foto baru langsung dari
          builder.
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="text-ink-soft">Belum ada foto. Tambahkan lewat builder.</p>
      ) : (
        groups.map((g) => (
          <section key={g.label}>
            <h2 className="mb-2 text-sm font-medium text-ink-soft">{g.label}</h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {g.images.map((url) => (
                <div key={url} className="group relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="aspect-square w-full rounded-lg border border-line object-cover"
                  />
                  <div className="absolute inset-x-1 bottom-1 opacity-0 group-hover:opacity-100">
                    <CopyChip text={url} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
