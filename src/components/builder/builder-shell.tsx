"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Toaster, toast } from "sonner";
import { useBuilder } from "@/stores/builder-store";
import { saveComposition, publishInvitation } from "@/lib/invitation/actions";
import { TopBar } from "./top-bar";
import { SectionList } from "./section-list";
import { AddSectionButton } from "./add-section-menu";
import { Canvas } from "./canvas";
import { Inspector } from "./inspector";
import type { GlobalSettings, SectionData } from "@/sections/types";

type SaveState = "idle" | "saving" | "saved" | "error";

export function BuilderShell({
  invitationId,
  slug,
  status,
  locked,
  editExpiresAt,
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
  const load = useBuilder((s) => s.load);
  const dirty = useBuilder((s) => s.dirty);
  const markClean = useBuilder((s) => s.markClean);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [publishing, setPublishing] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    load({ invitationId, sections: initialSections, global: initialGlobal, locked });
    useBuilder.temporal.getState().clear();
  }, [invitationId, initialSections, initialGlobal, locked, load]);

  const save = useCallback(async () => {
    const { sections, global, dirty: isDirty } = useBuilder.getState();
    if (!isDirty || locked) return;
    setSaveState("saving");
    const res = await saveComposition(invitationId, {
      sections,
      global_settings: global,
    });
    if (res.ok) {
      markClean();
      setSaveState("saved");
    } else {
      setSaveState("error");
      toast.error(res.error);
    }
  }, [invitationId, locked, markClean]);

  // autosave
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(save, 1200);
    return () => clearTimeout(t);
  }, [dirty, save]);

  // keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === "s") {
        e.preventDefault();
        save();
      } else if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        useBuilder.temporal.getState().undo();
      } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        e.preventDefault();
        useBuilder.temporal.getState().redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  // unsaved-changes guard
  useEffect(() => {
    function beforeUnload(e: BeforeUnloadEvent) {
      if (useBuilder.getState().dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);

  async function onPublish() {
    setPublishing(true);
    await save();
    const res = await publishInvitation(invitationId);
    setPublishing(false);
    if (res.ok) {
      toast.success("Undangan terbit!");
      window.open(`/${res.slug}`, "_blank");
    }
  }

  return (
    <>
      <Toaster position="bottom-center" richColors />
      <TopBar
        slug={slug}
        status={status}
        saveState={saveState}
        onPublish={onPublish}
        publishing={publishing}
      />

      {locked ? (
        <div className="shrink-0 bg-wine px-4 py-2 text-center text-sm text-cream">
          Masa edit gratis sudah berakhir. Undangan tetap online, builder
          terkunci.{" "}
          <Link
            href={`/invitations/${invitationId}/unlock`}
            className="underline"
          >
            Upgrade untuk buka lagi
          </Link>
        </div>
      ) : editExpiresAt ? (
        <div className="shrink-0 bg-cream-200 px-4 py-1 text-center text-xs text-ink-soft">
          Masa edit gratis sampai{" "}
          {new Date(editExpiresAt).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
          })}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-paper">
          <div className="border-b border-line p-3">
            <span className="text-xs font-medium tracking-wide text-muted uppercase">
              Bagian
            </span>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            <SectionList />
            <AddSectionButton />
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto bg-cream-200/50">
          <Canvas invitationId={invitationId} />
        </main>

        <aside className="w-80 shrink-0 overflow-y-auto border-l border-line bg-paper p-4">
          <Inspector invitationId={invitationId} />
        </aside>
      </div>
    </>
  );
}
