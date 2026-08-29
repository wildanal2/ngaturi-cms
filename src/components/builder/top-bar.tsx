"use client";

import Link from "next/link";
import {
  Undo2,
  Redo2,
  Smartphone,
  Tablet,
  Monitor,
  ExternalLink,
  Check,
  Loader2,
} from "lucide-react";
import { useBuilder, useTemporal, type PreviewDevice } from "@/stores/builder-store";

const DEVICES: { key: PreviewDevice; icon: typeof Smartphone }[] = [
  { key: "mobile", icon: Smartphone },
  { key: "tablet", icon: Tablet },
  { key: "desktop", icon: Monitor },
];

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
  const device = useBuilder((s) => s.device);
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

      <div className="flex items-center gap-1 rounded-full bg-cream-200 p-0.5">
        {DEVICES.map(({ key, icon: Ic }) => (
          <button
            key={key}
            onClick={() => setDevice(key)}
            className={`rounded-full p-1.5 ${
              device === key ? "bg-paper shadow-sm" : "text-muted"
            }`}
            aria-label={key}
          >
            <Ic size={15} />
          </button>
        ))}
      </div>

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
