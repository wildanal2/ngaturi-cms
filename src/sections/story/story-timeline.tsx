import Image from "next/image";
import type { SectionRenderProps } from "../types";
import {
  DecoratedSectionShell,
  SectionHeader,
  pickDecor,
} from "../shared";

type StoryItem = {
  year?: string;
  title?: string;
  description?: string;
  image?: string;
};

/** Vertical dotted timeline with a photo card per milestone. */
export function StoryTimeline({ props }: SectionRenderProps) {
  const p = props as Record<string, unknown> & {
    eyebrow?: string;
    title?: string;
    items?: StoryItem[];
  };
  const items = p.items ?? [];
  const d = pickDecor(p);

  return (
    <DecoratedSectionShell d={d} muted>
      {d.section_icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={d.section_icon} alt="" className="mx-auto mb-3 h-10 w-10" />
      ) : null}
      <SectionHeader
        eyebrow={p.eyebrow ?? "Our Journey"}
        title={p.title ?? "Kisah Cinta"}
      />
      <div className="relative">
        <span
          aria-hidden
          className="absolute bottom-2 left-[7px] top-2 w-px bg-[color-mix(in_srgb,var(--inv-ink)_18%,transparent)]"
        />
        <div className="space-y-8 inv-stagger">
          {items.map((it, i) => (
            <div key={i} className="relative pl-9">
              <span
                aria-hidden
                className="absolute left-0 top-1.5 h-[15px] w-[15px] rounded-full border-2 border-white bg-[var(--inv-primary)] shadow"
              />
              <div className="overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--inv-primary)_12%,transparent)] bg-[var(--inv-bg)] shadow-sm">
                {it.image ? (
                  <div className="relative h-40 w-full">
                    <Image
                      src={it.image}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 90vw, 430px"
                      className="object-cover"
                    />
                  </div>
                ) : null}
                <div className="p-4">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--inv-secondary)]">
                    {it.year ?? "20XX"}
                  </p>
                  <h3 className="mt-1 font-[family-name:var(--inv-font)] text-xl text-[var(--inv-primary)]">
                    {it.title ?? "Momen"}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--inv-ink)]">
                    {it.description ?? "Cerita singkat momen ini."}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DecoratedSectionShell>
  );
}
