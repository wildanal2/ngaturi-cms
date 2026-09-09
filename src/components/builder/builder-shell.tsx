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
import {
  ChangeTemplateDialog,
  type BuilderTemplateOption,
} from "./template-picker";
import type { GlobalSettings, SectionData } from "@/sections/types";
import type { CompositionPolicy } from "@/lib/templates/composition-policy";

type SaveState = "idle" | "saving" | "saved" | "error";

export function BuilderShell({
  invitationId,
  slug,
  status,
  locked,
  editExpiresAt,
  initialSections,
  initialGlobal,
  compositionPolicy,
  activeTemplate,
  templates,
}: {
  invitationId: string;
  slug: string;
  status: string;
  locked: boolean;
  editExpiresAt: string | null;
  hasWatermark: boolean;
  initialSections: SectionData[];
  initialGlobal: GlobalSettings;
  compositionPolicy: CompositionPolicy;
  activeTemplate: { id: string; name: string };
  templates: BuilderTemplateOption[];
}) {
  const load = useBuilder((s) => s.load);
  const dirty = useBuilder((s) => s.dirty);
  const markClean = useBuilder((s) => s.markClean);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [publishing, setPublishing] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [preparingTemplate, setPreparingTemplate] = useState(false);
  const loadedRef = useRef(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlightRef = useRef<Promise<boolean> | null>(null);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    load({
      invitationId,
      sections: initialSections,
      global: initialGlobal,
      locked,
      compositionPolicy,
    });
    useBuilder.temporal.getState().clear();
  }, [
    invitationId,
    initialSections,
    initialGlobal,
    locked,
    compositionPolicy,
    load,
  ]);

  const clearScheduledAutosave = useCallback(() => {
    if (autosaveTimerRef.current !== null) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    if (locked) return false;

    // Serialize callers and keep draining if the user changed state while a
    // previous snapshot was in flight. Only the exact saved snapshot is ever
    // allowed to clear the dirty flag.
    for (;;) {
      const activeSave = saveInFlightRef.current;
      if (activeSave) {
        const activeSaved = await activeSave;
        if (saveInFlightRef.current === activeSave) {
          saveInFlightRef.current = null;
        }
        if (!activeSaved) return false;
        continue;
      }

      const snapshot = useBuilder.getState();
      if (!snapshot.dirty) return true;
      const { sections, global } = snapshot;
      setSaveState("saving");

      const request = (async () => {
        try {
          const res = await saveComposition(invitationId, {
            sections,
            global_settings: global,
            source_template: activeTemplate.id,
          });
          if (!res.ok) {
            setSaveState("error");
            toast.error(res.error);
            return false;
          }

          const current = useBuilder.getState();
          if (current.sections === sections && current.global === global) {
            markClean();
          }
          setSaveState("saved");
          return true;
        } catch {
          setSaveState("error");
          toast.error("Perubahan gagal disimpan. Silakan coba lagi.");
          return false;
        }
      })();

      saveInFlightRef.current = request;
      const saved = await request;
      if (saveInFlightRef.current === request) {
        saveInFlightRef.current = null;
      }
      if (!saved) return false;
    }
  }, [activeTemplate.id, invitationId, locked, markClean]);

  const flushAutosave = useCallback(async () => {
    clearScheduledAutosave();
    return save();
  }, [clearScheduledAutosave, save]);

  // autosave
  useEffect(() => {
    if (!dirty) return;
    clearScheduledAutosave();
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      void save();
    }, 1200);
    return clearScheduledAutosave;
  }, [clearScheduledAutosave, dirty, save]);

  // keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (templatePickerOpen || preparingTemplate) return;
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
  }, [preparingTemplate, save, templatePickerOpen]);

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

  async function openTemplatePicker() {
    if (locked || preparingTemplate) return;
    setPreparingTemplate(true);
    const saved = await flushAutosave();
    setPreparingTemplate(false);
    if (saved) setTemplatePickerOpen(true);
  }

  async function prepareTemplateApply() {
    if (locked || preparingTemplate) return false;
    setPreparingTemplate(true);
    const saved = await flushAutosave();
    setPreparingTemplate(false);
    return saved;
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

        <main className="min-w-0 flex-1 overflow-auto bg-cream-200/50">
          <Canvas invitationId={invitationId} />
        </main>

        <aside className="w-80 shrink-0 overflow-y-auto border-l border-line bg-paper p-4">
          <Inspector
            invitationId={invitationId}
            activeTemplateName={activeTemplate.name}
            onChangeTemplate={openTemplatePicker}
            changeTemplatePending={preparingTemplate}
          />
        </aside>
      </div>

      <ChangeTemplateDialog
        invitationId={invitationId}
        templates={templates}
        activeTemplateId={activeTemplate.id}
        open={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        beforeApply={prepareTemplateApply}
      />

      {preparingTemplate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="rounded-xl bg-paper px-5 py-4 text-sm font-medium text-ink shadow-xl">
            Menyimpan perubahan sebelum memilih template…
          </div>
        </div>
      ) : null}
    </>
  );
}
