"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Toaster, toast } from "sonner";
import { useBuilder } from "@/stores/builder-store";
import { saveComposition, publishInvitation } from "@/lib/invitation/actions";
import { MobileActionDock, TopBar } from "./top-bar";
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
type MobilePanel = "none" | "sections" | "inspector";

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
  premiumFeatures,
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
  premiumFeatures: boolean;
}) {
  const load = useBuilder((s) => s.load);
  const dirty = useBuilder((s) => s.dirty);
  const markClean = useBuilder((s) => s.markClean);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [publishing, setPublishing] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [preparingTemplate, setPreparingTemplate] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("none");
  const sectionsPanelRef = useRef<HTMLElement>(null);
  const inspectorPanelRef = useRef<HTMLElement>(null);
  const mobileTriggerRef = useRef<HTMLElement | null>(null);
  const loadedRef = useRef(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlightRef = useRef<Promise<boolean> | null>(null);

  // Keep the CSS lg breakpoint and modal keyboard behavior in sync on resize.
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 64rem)");
    const closeOnDesktop = () => {
      if (desktop.matches) setMobilePanel("none");
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    if (mobilePanel === "none") return;
    const panel =
      mobilePanel === "sections"
        ? sectionsPanelRef.current
        : inspectorPanelRef.current;
    if (!panel) return;
    const controls = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
        ),
      ).filter((el) => el.getClientRects().length > 0);
    (controls()[0] ?? panel).focus({ preventScroll: true });
    function onKey(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setMobilePanel("none");
      } else if (event.key === "Tab") {
        const items = controls();
        const first = items[0] ?? panel;
        const last = items.at(-1) ?? panel;
        if (
          !panel?.contains(document.activeElement) ||
          (event.shiftKey && document.activeElement === first) ||
          (!event.shiftKey && document.activeElement === last)
        ) {
          event.preventDefault();
          (event.shiftKey ? last : first)?.focus();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      const trigger = mobileTriggerRef.current;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [mobilePanel]);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    load({
      invitationId,
      sections: initialSections,
      global: initialGlobal,
      locked,
      premiumFeatures,
      compositionPolicy,
    });
    useBuilder.temporal.getState().clear();
  }, [
    invitationId,
    initialSections,
    initialGlobal,
    locked,
    premiumFeatures,
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
    const saved = await save();
    if (!saved) {
      setPublishing(false);
      return;
    }
    const res = await publishInvitation(invitationId);
    setPublishing(false);
    if (res.ok) {
      toast.success("Undangan terbit!");
      window.open(`/${res.slug}`, "_blank");
    } else {
      toast.error(res.error);
    }
  }

  async function openTemplatePicker() {
    if (locked || preparingTemplate) return;
    setPreparingTemplate(true);
    const saved = await flushAutosave();
    setPreparingTemplate(false);
    if (saved) {
      setMobilePanel("none");
      setTemplatePickerOpen(true);
    }
  }

  async function prepareTemplateApply() {
    if (locked || preparingTemplate) return false;
    setPreparingTemplate(true);
    const saved = await flushAutosave();
    setPreparingTemplate(false);
    return saved;
  }

  return (
    <div className="flex h-dvh w-full shrink-0 flex-col overflow-hidden [--builder-toast-offset:calc(6rem+env(safe-area-inset-bottom))] lg:[--builder-toast-offset:32px]">
      <Toaster
        position="bottom-center"
        richColors
        offset={{ bottom: "var(--builder-toast-offset)" }}
        mobileOffset={{ bottom: "var(--builder-toast-offset)" }}
      />
      <div inert={mobilePanel !== "none"}>
        <TopBar
          slug={slug}
          status={status}
          saveState={saveState}
          onPublish={onPublish}
          publishing={publishing}
        />
      </div>

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

      <div className="flex min-h-0 min-w-0 flex-1">
        {mobilePanel !== "none" ? (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Tutup panel"
            onClick={() => setMobilePanel("none")}
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          />
        ) : null}
        <aside
          ref={sectionsPanelRef}
          id="builder-sections"
          role={mobilePanel === "sections" ? "dialog" : undefined}
          aria-modal={mobilePanel === "sections" ? true : undefined}
          aria-labelledby="builder-sections-title"
          tabIndex={-1}
          className={`${mobilePanel === "sections" ? "flex" : "hidden"} fixed inset-y-0 left-0 z-50 w-[min(86vw,320px)] flex-col border-r border-line bg-paper pb-[env(safe-area-inset-bottom)] lg:static lg:z-auto lg:flex lg:w-60 lg:shrink-0 lg:pb-0`}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-line p-3">
            <span
              id="builder-sections-title"
              className="text-xs font-medium tracking-wide text-muted uppercase"
            >
              Bagian
            </span>
            <button
              type="button"
              aria-label="Tutup panel Bagian"
              onClick={() => setMobilePanel("none")}
              className="rounded-lg p-2 text-ink-soft hover:bg-cream-200 lg:hidden"
            >
              <X size={20} />
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3">
            <SectionList
              onSelect={() => {
                if (mobilePanel === "sections") setMobilePanel("inspector");
              }}
            />
            <AddSectionButton />
          </div>
        </aside>

        <main
          inert={mobilePanel !== "none"}
          className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-cream-200/50"
        >
          <Canvas invitationId={invitationId} />
        </main>

        <aside
          ref={inspectorPanelRef}
          id="builder-inspector"
          role={mobilePanel === "inspector" ? "dialog" : undefined}
          aria-modal={mobilePanel === "inspector" ? true : undefined}
          aria-label="Editor dan Tema"
          tabIndex={-1}
          className={`${mobilePanel === "inspector" ? "flex" : "hidden"} fixed inset-y-0 right-0 z-50 w-[min(90vw,360px)] flex-col border-l border-line bg-paper pb-[env(safe-area-inset-bottom)] lg:static lg:z-auto lg:flex lg:w-80 lg:shrink-0 lg:overflow-y-auto lg:p-4`}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-line p-3 lg:hidden">
            <span className="text-sm font-medium">Editor / Tema</span>
            <button
              type="button"
              aria-label="Tutup panel Editor"
              onClick={() => setMobilePanel("none")}
              className="rounded-lg p-2 text-ink-soft hover:bg-cream-200"
            >
              <X size={20} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 lg:overflow-visible lg:p-0">
            <Inspector
              invitationId={invitationId}
              activeTemplateName={activeTemplate.name}
              onChangeTemplate={openTemplatePicker}
              changeTemplatePending={preparingTemplate}
            />
          </div>
        </aside>
      </div>

      <div
        inert={mobilePanel !== "none"}
        className="sticky bottom-0 z-20 shrink-0 lg:hidden"
      >
        <MobileActionDock
          slug={slug}
          status={status}
          saveState={saveState}
          onPublish={onPublish}
          publishing={publishing}
          mobilePanel={mobilePanel}
          onTogglePanel={(panel) => {
            mobileTriggerRef.current = document.activeElement as HTMLElement;
            setMobilePanel((current) => (current === panel ? "none" : panel));
          }}
        />
      </div>

      <ChangeTemplateDialog
        invitationId={invitationId}
        templates={templates}
        activeTemplateId={activeTemplate.id}
        open={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        beforeApply={prepareTemplateApply}
        premiumFeatures={premiumFeatures}
      />

      {preparingTemplate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="rounded-xl bg-paper px-5 py-4 text-sm font-medium text-ink shadow-xl">
            Menyimpan perubahan sebelum memilih template…
          </div>
        </div>
      ) : null}
    </div>
  );
}
