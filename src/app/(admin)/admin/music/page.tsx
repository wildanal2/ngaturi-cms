import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { musicTracks } from "@/lib/db/schema";
import { upsertMusicTrack, deleteMusicTrack } from "@/lib/admin/actions";

export default async function AdminMusic() {
  const rows = await db
    .select()
    .from(musicTracks)
    .orderBy(asc(musicTracks.sortOrder), asc(musicTracks.title));

  const input =
    "w-full rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl">Katalog musik</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Lagu di sini muncul di section &ldquo;Musik Latar&rdquo; builder,
          dengan badge &ldquo;Trending&rdquo; berdasarkan berapa kali dipakai.
          Pakai hanya audio bebas royalti / lisensi yang mengizinkan
          (CC0, CC-BY, dsb).
        </p>
      </div>

      <form
        action={upsertMusicTrack}
        className="grid gap-3 rounded-xl border border-line bg-paper p-4 sm:grid-cols-2"
      >
        <label className="text-sm">
          <span className="mb-1 block text-ink-soft">Judul *</span>
          <input name="title" required className={input} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-ink-soft">Artis</span>
          <input name="artist" className={input} />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-ink-soft">URL audio (.mp3) *</span>
          <input name="audio_url" type="url" required className={input} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-ink-soft">URL cover (opsional)</span>
          <input name="cover_url" type="url" className={input} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-ink-soft">Genre</span>
          <input name="genre" className={input} placeholder="acoustic, piano…" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-ink-soft">Lisensi</span>
          <input name="license" className={input} placeholder="CC0 / CC-BY 4.0" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-ink-soft">Urutan</span>
          <input name="sort_order" type="number" defaultValue={0} className={input} />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-ink-soft">Atribusi (jika CC-BY)</span>
          <input name="attribution" className={input} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_active" defaultChecked /> Aktif
        </label>
        <div className="sm:col-span-2">
          <button className="rounded-full bg-forest px-4 py-2 text-sm font-medium text-cream">
            Simpan lagu
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-cream-200 text-left text-ink-soft">
            <tr>
              <th className="px-3 py-2">Judul</th>
              <th className="px-3 py-2">Artis</th>
              <th className="px-3 py-2">Lisensi</th>
              <th className="px-3 py-2">Aktif</th>
              <th className="px-3 py-2">Pratinjau</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-t border-line">
                <td className="px-3 py-2">{t.title}</td>
                <td className="px-3 py-2 text-ink-soft">{t.artist ?? "—"}</td>
                <td className="px-3 py-2 text-ink-soft">{t.license ?? "—"}</td>
                <td className="px-3 py-2">{t.isActive ? "✅" : "—"}</td>
                <td className="px-3 py-2">
                  <audio src={t.audioUrl} controls preload="none" className="h-8 w-44" />
                </td>
                <td className="px-3 py-2">
                  <form action={deleteMusicTrack.bind(null, t.id)}>
                    <button className="rounded-full border border-line px-2.5 py-1 text-xs text-wine">
                      Hapus
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted">
                  Belum ada lagu.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
