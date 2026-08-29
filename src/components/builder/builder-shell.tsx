"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useBuilder } from "@/stores/builder-store";
import { SectionRegistry, getAllSections } from "@/sections/registry";
import { InvitationRenderer } from "@/lib/invitation/renderer";
import {
  saveComposition,
  publishInvitation,
} from "@/lib/invitation/actions";
import { PropertyPanel } from "./property-panel";
import type { GlobalSettings, SectionData } from "@/sections/types";

export function BuilderShell({
  invitationId,
  slug,
  status,
  locked,
  editExpiresAt,
  hasWatermark,
  initialSections,
  initialGlobal,
}: {
  invitationId: string;
  slug: string;
  status: string;
  locked: boolean;
  editExpiresAt: string | null;
  hasWatermark: boolean;
  initialSections: SectionData[];
  initialGlobal: GlobalSettings;
}) {
  const store = useBuilder();
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    store.load({
      invitationId,
      sections: initialSections,
      global: initialGlobal,
      locked,
    });
  }, [invitationId, initialSections, initialGlobal, locked, store]);

  const save = useCallback(async () => {
    const { sections, global, dirty } = useBuilder.getState();
    if (!dirty || locked) return;
    setSaveState("saving");
    const res = await saveComposition(invitationId, {
      sections,
      global_settings: global,
    });
    if (res.ok) {
      useBuilder.getState().markClean();
      setSaveState("saved");
      setMsg(null);
    } else {
      setSaveState("error");
      setMsg(res.error);
    }
  }, [invitationId, locked]);

  // autosave 1.5s setelah perubahan terakhir
  useEffect(() => {
    if (!store.dirty) return;
    const t = setTimeout(save, 1500);
    return () => clearTimeout(t);
  }, [store.dirty, store.sections, store.global, save]);

  async function onPublish() {
    setPublishing(true);
    await save();
    const res = await publishInvitation(invitationId);
    setPublishing(false);
    if (res.ok) window.open(`/${res.slug}`, "_blank");
  }

  const selected = store.sections.find((s) => s.id === store.selectedId) ?? null;

  return (
    <>
      {/* top bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-line bg-paper px-4 py-2.5">
        <div className="flex items-center gap-3 text-sm">
          <Link href="/invitations" className="text-ink-soft hover:text-ink">
            ← Undangan
          </Link>
          <span className="text-line">|</span>
          <span className="text-muted">
            {saveState === "saving"
              ? "Menyimpan…"
              : saveState === "saved"
                ? "Tersimpan"
                : saveState === "error"
                  ? "Gagal simpan"
                  : store.dirty
                    ? "Belum disimpan"
                    : "Tersimpan"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/${slug}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full px-3 py-1.5 text-sm text-ink-soft hover:bg-cream-200"
          >
            Pratinjau publik
          </a>
          <button
            onClick={onPublish}
            disabled={publishing || locked}
            className="rounded-full bg-forest px-4 py-1.5 text-sm font-medium text-cream hover:bg-forest-600 disabled:opacity-60"
          >
            {status === "published" ? "Perbarui" : "Publikasikan"}
          </button>
        </div>
      </header>

      {locked ? (
        <div className="shrink-0 bg-wine px-4 py-2 text-center text-sm text-cream">
          Masa edit gratis (7 hari) sudah berakhir. Undangan tetap online,
          tapi builder terkunci.{" "}
          <Link href={`/invitations/${invitationId}`} className="underline">
            Upgrade
          </Link>
        </div>
      ) : editExpiresAt ? (
        <div className="shrink-0 bg-cream-200 px-4 py-1.5 text-center text-xs text-ink-soft">
          Masa edit gratis sampai{" "}
          {new Date(editExpiresAt).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
          })}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        {/* left: section list */}
        <aside className="w-64 shrink-0 overflow-y-auto border-r border-line bg-paper p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium tracking-wide text-muted uppercase">
              Bagian
            </span>
            <button
              onClick={() => setShowAdd((v) => !v)}
              className="rounded-full bg-cream-200 px-2 py-0.5 text-sm"
              disabled={locked}
            >
              + Tambah
            </button>
          </div>

          {showAdd ? (
            <div className="mb-3 space-y-1 rounded-lg border border-line p-2">
              {getAllSections().map((def) => (
                <button
                  key={def.type}
                  onClick={() => {
                    const firstVariant = Object.keys(def.variants)[0];
                    store.addSection(def.type, firstVariant);
                    setShowAdd(false);
                  }}
                  className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-cream-200"
                >
                  {def.name}
                </button>
              ))}
            </div>
          ) : null}

          <ul className="space-y-1">
            {store.sections.map((s, i) => (
              <li
                key={s.id}
                className={`rounded-lg border px-2 py-1.5 text-sm ${
                  store.selectedId === s.id
                    ? "border-forest bg-cream-200"
                    : "border-transparent hover:bg-cream-200"
                }`}
              >
                <button
                  onClick={() => store.select(s.id)}
                  className="block w-full text-left"
                >
                  <span className={s.visible ? "" : "opacity-40"}>
                    {SectionRegistry[s.type]?.name ?? s.type}
                  </span>
                </button>
                {store.selectedId === s.id && !locked ? (
                  <div className="mt-1 flex gap-1 text-xs text-ink-soft">
                    <button onClick={() => store.move(s.id, -1)} disabled={i === 0}>
                      ↑
                    </button>
                    <button
                      onClick={() => store.move(s.id, 1)}
                      disabled={i === store.sections.length - 1}
                    >
                      ↓
                    </button>
                    <button onClick={() => store.toggleVisible(s.id)}>
                      {s.visible ? "Sembunyikan" : "Tampilkan"}
                    </button>
                    <button
                      onClick={() => store.removeSection(s.id)}
                      className="text-wine"
                    >
                      Hapus
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </aside>

        {/* center: preview */}
        <main className="flex-1 overflow-y-auto bg-cream-200/60 p-6">
          <div className="mx-auto max-w-lg rounded-2xl bg-paper shadow-sm">
            <InvitationRenderer
              sections={store.sections}
              global={store.global}
              invitationId={invitationId}
              isPreview
            />
            {hasWatermark ? (
              <p className="py-3 text-center text-xs text-muted">
                Dibuat dengan Ngaturi
              </p>
            ) : null}
          </div>
        </main>

        {/* right: property panel */}
        <aside className="w-80 shrink-0 overflow-y-auto border-l border-line bg-paper p-4">
          {msg ? (
            <p className="mb-3 rounded-lg bg-wine/10 p-2 text-sm text-wine">
              {msg}
            </p>
          ) : null}
          <PropertyPanel section={selected} disabled={locked} />
        </aside>
      </div>
    </>
  );
}
