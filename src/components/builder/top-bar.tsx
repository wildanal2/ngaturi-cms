"use client";

import Link from "next/link";
import { Undo2, Redo2, ExternalLink, Check, Loader2 } from "lucide-react";
import { useBuilder, useTemporal } from "@/stores/builder-store";
import { DEVICES } from "./devices";

const CATEGORY_LABEL: Record<string, string> = {
  phone: "Ponsel",
  tablet: "Tablet",
  desktop: "Desktop",
};

export function TopBar({
  slug,
  status,
  saveState,
  onPublish,
  publishing,
}: {
  slug: string;
  status: string;
  saveState: "idle" | "saving" | "saved" | "error";
  onPublish: () => void;
  publishing: boolean;
}) {
  const deviceId = useBuilder((s) => s.deviceId);
  const setDevice = useBuilder((s) => s.setDevice);
  const dirty = useBuilder((s) => s.dirty);
  const locked = useBuilder((s) => s.locked);
  const { undo, redo, pastStates, futureStates } = useTemporal();

  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-paper px-3 py-2">
      <div className="flex items-center gap-2">
        <Link
          href="/invitations"
          className="rounded-lg px-2 py-1 text-sm text-ink-soft hover:bg-cream-200"
        >
          ← Undangan
        </Link>
        <div className="flex items-center gap-0.5 border-l border-line pl-2">
          <button
            onClick={() => undo()}
            disabled={pastStates.length === 0 || locked}
            className="rounded-md p-1.5 text-ink-soft hover:bg-cream-200 disabled:opacity-30"
            aria-label="Undo"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={() => redo()}
            disabled={futureStates.length === 0 || locked}
            className="rounded-md p-1.5 text-ink-soft hover:bg-cream-200 disabled:opacity-30"
            aria-label="Redo"
          >
            <Redo2 size={16} />
          </button>
        </div>
      </div>

      <select
        value={deviceId}
        onChange={(e) => setDevice(e.target.value)}
        className="max-w-[190px] rounded-full border border-line bg-cream-200 px-3 py-1.5 text-xs"
        aria-label="Perangkat pratinjau"
      >
        {["phone", "tablet", "desktop"].map((cat) => (
          <optgroup key={cat} label={CATEGORY_LABEL[cat]}>
            {DEVICES.filter((d) => d.category === cat).map((d) => (
              <option key={d.id} value={d.id}>
                {d.label} · {d.width}×{d.height}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-1 text-xs text-muted sm:flex">
          {saveState === "saving" ? (
            <>
              <Loader2 size={12} className="animate-spin" /> Menyimpan
            </>
          ) : saveState === "error" ? (
            <span className="text-wine">Gagal simpan</span>
          ) : dirty ? (
            "Belum disimpan"
          ) : (
            <>
              <Check size={12} /> Tersimpan
            </>
          )}
        </span>
        <a
          href={`/${slug}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-ink-soft hover:bg-cream-200"
        >
          <ExternalLink size={14} /> Pratinjau
        </a>
        <button
          onClick={onPublish}
          disabled={publishing || locked}
          className="rounded-full bg-forest px-4 py-1.5 text-sm font-medium text-cream hover:bg-forest-600 disabled:opacity-60"
        >
          {publishing
            ? "Menerbitkan…"
            : status === "published"
              ? "Perbarui"
              : "Publikasikan"}
        </button>
      </div>
    </header>
  );
}
