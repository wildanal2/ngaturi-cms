"use client";

import Link from "next/link";
import {
  Undo2,
  Redo2,
  ExternalLink,
  Check,
  Loader2,
  List,
  SlidersHorizontal,
} from "lucide-react";
import { useBuilder, useTemporal } from "@/stores/builder-store";
import { DEVICES } from "./devices";

const CATEGORY_LABEL: Record<string, string> = {
  phone: "Ponsel",
  tablet: "Tablet",
  desktop: "Desktop",
};

interface ActionProps {
  slug: string;
  status: string;
  saveState: "idle" | "saving" | "saved" | "error";
  onPublish: () => void;
  publishing: boolean;
}

function SaveIndicator({ saveState }: Pick<ActionProps, "saveState">) {
  const dirty = useBuilder((s) => s.dirty);
  return (
    <span
      role="status"
      className="flex items-center justify-center gap-1 text-xs text-muted"
    >
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
  );
}

export function MobileActionDock({
  slug,
  status,
  saveState,
  onPublish,
  publishing,
  mobilePanel,
  onTogglePanel,
}: ActionProps & {
  mobilePanel: "none" | "sections" | "inspector";
  onTogglePanel: (panel: "sections" | "inspector") => void;
}) {
  const locked = useBuilder((s) => s.locked);
  return (
    <div className="border-t border-line bg-paper px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <SaveIndicator saveState={saveState} />
      <nav
        aria-label="Aksi Builder"
        className="mt-1 grid grid-cols-[1fr_1fr_1fr_1.4fr] gap-1"
      >
        <button
          type="button"
          aria-label="Buka panel Bagian"
          aria-expanded={mobilePanel === "sections"}
          aria-controls="builder-sections"
          onClick={() => onTogglePanel("sections")}
          className="flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-lg text-xs text-ink-soft hover:bg-cream-200"
        >
          <List size={18} /> Bagian
        </button>
        <button
          type="button"
          aria-label="Buka panel Editor"
          aria-expanded={mobilePanel === "inspector"}
          aria-controls="builder-inspector"
          onClick={() => onTogglePanel("inspector")}
          className="flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-lg text-xs text-ink-soft hover:bg-cream-200"
        >
          <SlidersHorizontal size={18} /> Edit
        </button>
        <a
          href={`/${slug}`}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-lg text-xs text-ink-soft hover:bg-cream-200"
        >
          <ExternalLink size={18} /> Pratinjau
        </a>
        <button
          type="button"
          onClick={onPublish}
          disabled={publishing || locked}
          className="min-h-11 min-w-0 rounded-xl bg-forest px-1 text-xs font-medium text-cream hover:bg-forest-600 disabled:opacity-60"
        >
          {publishing
            ? "Menerbitkan…"
            : status === "published"
              ? "Perbarui"
              : "Publikasikan"}
        </button>
      </nav>
    </div>
  );
}

export function TopBar({
  slug,
  status,
  saveState,
  onPublish,
  publishing,
}: ActionProps) {
  const deviceId = useBuilder((s) => s.deviceId);
  const setDevice = useBuilder((s) => s.setDevice);
  const locked = useBuilder((s) => s.locked);
  const { undo, redo, pastStates, futureStates } = useTemporal();

  return (
    <header className="flex min-w-0 shrink-0 flex-wrap items-center justify-between gap-1 border-b border-line bg-paper px-2 py-2 lg:flex-nowrap lg:gap-3 lg:px-3">
      <div className="flex shrink-0 items-center gap-1 lg:gap-2">
        <Link
          href="/invitations"
          className="flex min-h-11 items-center rounded-lg px-1 text-sm text-ink-soft hover:bg-cream-200 lg:min-h-0 lg:px-2 lg:py-1"
        >
          ← Undangan
        </Link>
        <div className="flex items-center gap-0.5 border-l border-line pl-1 lg:pl-2">
          <button
            onClick={() => undo()}
            disabled={pastStates.length === 0 || locked}
            className="min-h-11 min-w-9 rounded-md p-1.5 text-ink-soft hover:bg-cream-200 disabled:opacity-30 lg:min-h-0 lg:min-w-0"
            aria-label="Undo"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={() => redo()}
            disabled={futureStates.length === 0 || locked}
            className="min-h-11 min-w-9 rounded-md p-1.5 text-ink-soft hover:bg-cream-200 disabled:opacity-30 lg:min-h-0 lg:min-w-0"
            aria-label="Redo"
          >
            <Redo2 size={16} />
          </button>
        </div>
      </div>

      <select
        value={deviceId}
        onChange={(e) => setDevice(e.target.value)}
        className="min-h-11 w-32 min-w-0 rounded-full border border-line bg-cream-200 px-2 py-1.5 text-xs lg:min-h-0 lg:w-auto lg:max-w-[190px] lg:px-3"
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

      <div className="hidden items-center gap-2 lg:flex">
        <SaveIndicator saveState={saveState} />
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
