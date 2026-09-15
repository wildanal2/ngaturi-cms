"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { Toaster, toast } from "sonner";
import {
  applyInitialTemplate,
  changeInvitationTemplate,
} from "@/lib/invitation/actions";
import type { TemplatePreset } from "@/lib/templates/catalog";

export type BuilderTemplateOption = Pick<
  TemplatePreset,
  "id" | "name" | "description" | "category" | "tier" | "thumbnail"
>;

const tierLabel: Record<TemplatePreset["tier"], string> = {
  free: "Gratis",
  basic: "Basic",
  premium: "Premium",
};

function TemplateCatalog({
  templates,
  locked,
  activeTemplateId,
  pendingId,
  pending,
  onSelect,
}: {
  templates: BuilderTemplateOption[];
  locked: boolean;
  activeTemplateId?: string;
  pendingId: string | null;
  pending: boolean;
  onSelect: (template: BuilderTemplateOption) => void;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => {
        const isActive = template.id === activeTemplateId;
        const isApplying = pendingId === template.id;
        return (
          <article
            key={template.id}
            className="overflow-hidden rounded-2xl border border-line bg-paper"
          >
            <Image
              src={template.thumbnail}
              alt={template.name}
              width={400}
              height={300}
              className="aspect-[4/3] w-full object-cover"
              unoptimized
            />
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg text-ink">{template.name}</h2>
                <span className="shrink-0 rounded-full bg-cream-200 px-2.5 py-1 text-[0.65rem] font-medium tracking-wide text-ink-soft uppercase">
                  {tierLabel[template.tier]}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-soft">
                {template.description}
              </p>
              <p className="mt-2 text-xs tracking-wide text-muted uppercase">
                {template.category}
              </p>
              <button
                type="button"
                onClick={() => onSelect(template)}
                disabled={locked || isActive || pending || pendingId !== null}
                aria-busy={isApplying}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-forest py-2.5 text-sm font-medium text-cream hover:bg-forest-600 disabled:pointer-events-none disabled:opacity-60"
              >
                {isApplying ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Menerapkan template…
                  </>
                ) : isActive ? (
                  "Template aktif"
                ) : activeTemplateId ? (
                  "Pilih template"
                ) : (
                  "Pakai template ini"
                )}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function TemplatePicker({
  invitationId,
  templates,
  locked,
}: {
  invitationId: string;
  templates: BuilderTemplateOption[];
  locked: boolean;
}) {
  const submitting = useRef(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function selectTemplate(template: BuilderTemplateOption) {
    if (locked || submitting.current) return;
    submitting.current = true;
    setPendingId(template.id);

    startTransition(async () => {
      try {
        const result = await applyInitialTemplate(invitationId, template.id);
        if (!result.ok) {
          toast.error(result.error);
          submitting.current = false;
          setPendingId(null);
        }
      } catch {
        toast.error("Template gagal diterapkan. Silakan coba lagi.");
        submitting.current = false;
        setPendingId(null);
      }
    });
  }

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-cream-200/50 px-4 py-8 sm:px-6 lg:px-8">
      <Toaster position="bottom-center" richColors />
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl text-ink">Pilih template undangan</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Pilih satu template untuk mulai mengisi undanganmu.
          </p>
        </div>

        {locked ? (
          <div className="mb-5 rounded-xl border border-wine/30 bg-wine/5 p-4 text-sm text-wine">
            Masa edit gratis sudah berakhir. Upgrade akun untuk memilih
            template.
          </div>
        ) : null}

        <TemplateCatalog
          templates={templates}
          locked={locked}
          pendingId={pendingId}
          pending={pending}
          onSelect={selectTemplate}
        />
      </div>
    </main>
  );
}

export function ChangeTemplateDialog({
  invitationId,
  templates,
  activeTemplateId,
  open,
  onClose,
  beforeApply,
}: {
  invitationId: string;
  templates: BuilderTemplateOption[];
  activeTemplateId: string;
  open: boolean;
  onClose: () => void;
  beforeApply: () => Promise<boolean>;
}) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const confirmationRef = useRef<HTMLDivElement>(null);
  const submitting = useRef(false);
  const [selected, setSelected] = useState<BuilderTemplateOption | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const close = useCallback(() => {
    if (pending || submitting.current) return;
    setSelected(null);
    setPendingId(null);
    onClose();
  }, [onClose, pending]);

  const cancelConfirmation = useCallback(() => {
    if (pending || submitting.current) return;
    setSelected(null);
    setPendingId(null);
  }, [pending]);

  useEffect(() => {
    if (!open) return;
    const layer = selected ? confirmationRef.current : pickerRef.current;
    if (!layer) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () =>
      [
        ...layer.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
        ),
      ].filter(
        (element) =>
          !element.closest("[inert]") && element.getClientRects().length,
      );
    (focusable()[0] ?? layer).focus({ preventScroll: true });
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const controls = focusable();
      const first = controls[0];
      const last = controls.at(-1);
      if (!first) {
        event.preventDefault();
        layer.focus({ preventScroll: true });
      } else if (
        !layer.contains(document.activeElement) ||
        (event.shiftKey && document.activeElement === first) ||
        (!event.shiftKey && document.activeElement === last)
      ) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus({ preventScroll: true });
      }
    };
    window.addEventListener("keydown", trapFocus);
    return () => {
      window.removeEventListener("keydown", trapFocus);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open, selected]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (selected) cancelConfirmation();
      else close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cancelConfirmation, close, open, selected]);

  if (!open) return null;

  function apply() {
    if (!selected || pending || submitting.current) return;
    submitting.current = true;
    setPendingId(selected.id);

    startTransition(async () => {
      try {
        const ready = await beforeApply();
        if (!ready) {
          submitting.current = false;
          setPendingId(null);
          return;
        }
        const result = await changeInvitationTemplate(
          invitationId,
          selected.id,
        );
        if (!result.ok) {
          toast.error(result.error);
          submitting.current = false;
          setPendingId(null);
          return;
        }
        submitting.current = false;
        setPendingId(null);
        setSelected(null);
        onClose();
        toast.success("Template berhasil diubah.");
      } catch {
        toast.error("Template gagal diterapkan. Silakan coba lagi.");
        submitting.current = false;
        setPendingId(null);
      }
    });
  }

  return (
    <div
      ref={pickerRef}
      tabIndex={-1}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-template-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-2xl sm:max-h-[90vh]">
        <div
          inert={Boolean(selected)}
          className="flex shrink-0 items-start justify-between border-b border-line bg-paper px-5 py-4"
        >
          <div>
            <h2 id="change-template-title" className="text-2xl text-ink">
              Ubah Template
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Pilih tampilan baru untuk undanganmu.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Tutup pemilih template"
            className="rounded-full p-2 text-muted hover:bg-cream-200 hover:text-ink"
          >
            <X size={20} />
          </button>
        </div>

        <div
          inert={Boolean(selected)}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-cream px-4 py-5 sm:px-5"
        >
          <TemplateCatalog
            templates={templates}
            locked={false}
            activeTemplateId={activeTemplateId}
            pendingId={pendingId}
            pending={pending}
            onSelect={setSelected}
          />
        </div>

        <div
          inert={Boolean(selected)}
          className="flex shrink-0 justify-start border-t border-line bg-paper px-5 py-3"
        >
          <button
            type="button"
            onClick={close}
            disabled={pending}
            className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink hover:bg-cream-200 disabled:opacity-60"
          >
            Batal
          </button>
        </div>

        {selected ? (
          <div
            ref={confirmationRef}
            tabIndex={-1}
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 p-3 sm:p-6"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="change-template-confirm-title"
            aria-describedby="change-template-confirm-description"
            onClick={(event) => {
              if (event.target === event.currentTarget) cancelConfirmation();
            }}
          >
            <div className="w-full max-w-lg rounded-2xl border border-line bg-paper p-6 shadow-2xl sm:p-8">
              <h3
                id="change-template-confirm-title"
                className="text-2xl text-ink"
              >
                Gunakan {selected.name}?
              </h3>
              <p
                id="change-template-confirm-description"
                className="mt-3 text-sm leading-6 text-ink-soft"
              >
                Konten undangan akan dipertahankan. Tampilan, layout, dan
                pengaturan visual akan mengikuti template baru.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={cancelConfirmation}
                  disabled={pending}
                  className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink hover:bg-cream-200 disabled:opacity-60"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={apply}
                  disabled={pending}
                  aria-busy={pending}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-medium text-cream hover:bg-forest-600 disabled:pointer-events-none disabled:opacity-60"
                >
                  {pending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Menerapkan…
                    </>
                  ) : (
                    "Gunakan Template"
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
