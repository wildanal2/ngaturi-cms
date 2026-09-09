"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Toaster, toast } from "sonner";
import { applyInitialTemplate } from "@/lib/invitation/actions";
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

  function selectTemplate(templateId: string) {
    if (locked || submitting.current) return;
    submitting.current = true;
    setPendingId(templateId);

    startTransition(async () => {
      try {
        const result = await applyInitialTemplate(invitationId, templateId);
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
            Masa edit gratis sudah berakhir. Upgrade akun untuk memilih template.
          </div>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
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
                    onClick={() => selectTemplate(template.id)}
                    disabled={locked || pending || pendingId !== null}
                    aria-busy={isApplying}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-forest py-2.5 text-sm font-medium text-cream hover:bg-forest-600 disabled:pointer-events-none disabled:opacity-60"
                  >
                    {isApplying ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Menerapkan template…
                      </>
                    ) : (
                      "Pakai template ini"
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
