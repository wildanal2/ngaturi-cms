"use client";

import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  TrendingUp,
  Music,
  Upload,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { FieldContext } from "./field-editors";

interface Track {
  id: string;
  title: string;
  artist: string | null;
  audioUrl: string;
  coverUrl: string | null;
  license: string | null;
  genre: string | null;
  picks?: number;
  source?: "catalog" | "jamendo";
  shareUrl?: string | null;
}

export function MusicPickerField({
  ctx,
  label,
}: {
  ctx: FieldContext;
  label: string;
}) {
  const [tab, setTab] = useState<"catalog" | "url">("catalog");
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<{ q: string; items: Track[] } | null>(null);
  const [provider, setProvider] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const currentUrl = (ctx.read("audio_url") as string) || "";
  const currentTitle = (ctx.read("track_title") as string) || "";
  const currentTrackId = (ctx.read("track_id") as string) || "";

  useEffect(() => {
    fetch("/api/music/catalog")
      .then((r) => (r.ok ? r.json() : { tracks: [] }))
      .then((d) => setTracks(d.tracks ?? []))
      .catch(() => setTracks([]));
  }, []);

  // debounced search
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/music/search?q=${encodeURIComponent(q)}`, {
        signal: ctrl.signal,
      })
        .then((r) => (r.ok ? r.json() : { results: [], provider: null }))
        .then((d) => {
          setHits({ q, items: d.results ?? [] });
          setProvider(d.provider ?? null);
        })
        .catch(() => {});
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  function preview(t: Track) {
    const a = audioRef.current;
    if (!a) return;
    if (previewId === t.id) {
      a.pause();
      setPreviewId(null);
      return;
    }
    if (loadingId === t.id) {
      // cancel a pending load
      a.removeAttribute("src");
      a.load();
      setLoadingId(null);
      return;
    }
    setPreviewId(null);
    setLoadingId(t.id);
    a.src = t.audioUrl;
    a.play()
      .then(() => {
        setPreviewId(t.id);
        setLoadingId(null);
      })
      .catch(() => {
        setLoadingId(null);
        toast.error("Gagal memuat lagu. Coba lagi.");
      });
  }

  function choose(t: Track) {
    ctx.write("audio_url", t.audioUrl);
    ctx.write("track_id", t.id);
    ctx.write("track_title", t.title);
    ctx.write("track_artist", t.artist ?? "");
    ctx.write("cover_url", t.coverUrl ?? "");
    toast.success(`Lagu dipilih: ${t.title}`);
  }

  function clearTrack() {
    ["audio_url", "track_id", "track_title", "track_artist", "cover_url"].forEach(
      (k) => ctx.write(k, ""),
    );
  }

  async function upload(file: File) {
    if (!file.type.startsWith("audio/")) {
      toast.error("File harus berupa audio (mp3).");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("invitationId", ctx.invitationId);
      fd.set("kind", "audio");
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal upload");
      ctx.write("audio_url", data.publicUrl);
      ctx.write("track_id", "");
      toast.success("Musik diunggah");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal upload");
    } finally {
      setUploading(false);
    }
  }

  const q = query.trim();
  const searchMode = q.length >= 2;
  const freshHits = hits && hits.q === q ? hits.items : null;
  const list: Track[] = searchMode ? (freshHits ?? []) : (tracks ?? []);
  const maxPicks = Math.max(1, ...(tracks?.map((t) => t.picks ?? 0) ?? [1]));

  function TrackRow({ t, rank }: { t: Track; rank: number }) {
    const active = currentTrackId === t.id;
    const trending = !searchMode && rank < 3 && (t.picks ?? 0) > 0;
    return (
      <li
        className={`rounded-lg border p-2 ${
          active ? "border-forest bg-cream-200" : "border-line"
        }`}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => preview(t)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink/80 text-white transition-colors disabled:opacity-70"
            aria-label={
              loadingId === t.id
                ? "Memuat lagu"
                : previewId === t.id
                  ? "Hentikan pratinjau"
                  : "Pratinjau lagu"
            }
            aria-busy={loadingId === t.id}
          >
            {loadingId === t.id ? (
              <Loader2 size={13} className="animate-spin" />
            ) : previewId === t.id ? (
              <Pause size={13} />
            ) : (
              <Play size={13} className="translate-x-[1px]" />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate font-medium">
              {t.title}
              {trending ? (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-wine/10 px-1.5 py-px text-[10px] text-wine">
                  <TrendingUp size={9} /> {t.picks}×
                </span>
              ) : null}
            </p>
            <p className="truncate text-xs text-muted">
              {t.artist ?? "—"}
              {t.genre ? ` · ${t.genre}` : ""}
              {t.license ? ` · ${t.license}` : ""}
            </p>
            {!searchMode && (t.picks ?? 0) > 0 ? (
              <div className="mt-1 h-1 w-full overflow-hidden rounded bg-line">
                <div
                  className="h-full bg-forest/60"
                  style={{ width: `${((t.picks ?? 0) / maxPicks) * 100}%` }}
                />
              </div>
            ) : null}
          </div>
          <button
            onClick={() => choose(t)}
            disabled={ctx.disabled}
            className={`shrink-0 rounded-full px-3 py-1 text-xs ${
              active
                ? "bg-forest text-cream"
                : "border border-line hover:bg-cream-200"
            }`}
          >
            {active ? "Dipakai" : "Pakai"}
          </button>
        </div>
      </li>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      <span className="block text-ink-soft">{label}</span>

      {currentUrl ? (
        <div className="flex items-center justify-between rounded-lg border border-forest/40 bg-forest/5 px-3 py-2">
          <span className="truncate">
            <Music size={13} className="mr-1 inline" />
            {currentTitle || "Audio kustom"}
          </span>
          <button
            onClick={clearTrack}
            disabled={ctx.disabled}
            className="text-xs text-wine"
          >
            Hapus
          </button>
        </div>
      ) : null}

      <div className="flex gap-1 rounded-full bg-cream-200 p-0.5 text-xs">
        {(["catalog", "url"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-full px-2 py-1 ${
              tab === t ? "bg-paper shadow-sm" : "text-muted"
            }`}
          >
            {t === "catalog" ? "Katalog & Cari" : "Upload / URL"}
          </button>
        ))}
      </div>

      <audio
        ref={audioRef}
        onEnded={() => setPreviewId(null)}
        onError={() => {
          if (loadingId || previewId) toast.error("Lagu tidak bisa diputar.");
          setLoadingId(null);
          setPreviewId(null);
        }}
        hidden
      />

      {tab === "catalog" ? (
        <>
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari judul / artis / genre…"
              className="w-full rounded-lg border border-line bg-paper py-1.5 pl-8 pr-8"
            />
            {query ? (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted"
                aria-label="Bersihkan"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>

          {tracks === null ? (
            <p className="py-4 text-center text-xs text-muted">Memuat…</p>
          ) : searchMode ? (
            freshHits === null ? (
              <p className="flex items-center justify-center gap-1.5 py-4 text-xs text-muted">
                <Loader2 size={13} className="animate-spin" /> Mencari…
              </p>
            ) : list.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line p-3 text-xs text-muted">
                Tidak ada hasil untuk “{query}”.
                {provider
                  ? ""
                  : " Untuk cari dari pustaka lebih besar, aktifkan penyedia musik, atau pakai tab “Upload / URL”."}
              </p>
            ) : (
              <ul className="max-h-72 space-y-1.5 overflow-y-auto">
                {list.map((t, i) => (
                  <TrackRow key={t.id} t={t} rank={i} />
                ))}
              </ul>
            )
          ) : list.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line p-3 text-xs text-muted">
              Katalog musik belum diisi. Sementara, pakai tab “Upload / URL”.
            </p>
          ) : (
            <ul className="max-h-72 space-y-1.5 overflow-y-auto">
              {list.map((t, i) => (
                <TrackRow key={t.id} t={t} rank={i} />
              ))}
            </ul>
          )}

          <p className="pt-1 text-[10px] leading-relaxed text-muted">
            {searchMode && provider
              ? `Hasil juga dari ${provider} (Creative Commons). Cek lisensi tiap lagu sebelum dipakai komersial.`
              : "Katalog: Kevin MacLeod (incompetech.com), lisensi Creative Commons BY 4.0 — bebas dipakai termasuk untuk undangan."}
          </p>
        </>
      ) : null}

      {tab === "url" ? (
        <div className="space-y-2">
          <input
            type="url"
            defaultValue={currentUrl}
            disabled={ctx.disabled}
            placeholder="https://…/lagu.mp3"
            onBlur={(e) => {
              ctx.write("audio_url", e.target.value);
              ctx.write("track_id", "");
            }}
            className="w-full rounded-lg border border-line bg-paper px-2.5 py-1.5"
          />
          <button
            type="button"
            disabled={ctx.disabled || uploading}
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-line py-2 text-sm hover:bg-cream-200 disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Upload size={14} />
            )}
            Unggah file mp3
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
