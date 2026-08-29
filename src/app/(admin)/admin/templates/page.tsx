import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import {
  toggleTemplateActive,
  toggleTemplateFeatured,
} from "@/lib/admin/actions";

export default async function AdminTemplates() {
  const rows = await db.select().from(templates).orderBy(asc(templates.name));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl">Template</h1>
      <p className="text-sm text-ink-soft">
        Dari tabel <code>templates</code>. Jalankan <code>npm run db:seed</code>{" "}
        untuk memuat ulang dari katalog kode.
      </p>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-cream-200 text-left text-ink-soft">
            <tr>
              <th className="px-3 py-2">Nama</th>
              <th className="px-3 py-2">Kategori</th>
              <th className="px-3 py-2">Tier</th>
              <th className="px-3 py-2">Aktif</th>
              <th className="px-3 py-2">Unggulan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-t border-line">
                <td className="px-3 py-2">{t.name}</td>
                <td className="px-3 py-2">{t.category}</td>
                <td className="px-3 py-2">{t.tier}</td>
                <td className="px-3 py-2">
                  <form action={toggleTemplateActive.bind(null, t.id, !t.isActive)}>
                    <button className="rounded-full border border-line px-2.5 py-1 text-xs">
                      {t.isActive ? "Aktif" : "Nonaktif"}
                    </button>
                  </form>
                </td>
                <td className="px-3 py-2">
                  <form
                    action={toggleTemplateFeatured.bind(null, t.id, !t.isFeatured)}
                  >
                    <button className="rounded-full border border-line px-2.5 py-1 text-xs">
                      {t.isFeatured ? "Ya" : "Tidak"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
