import Image from "next/image";
import type { SectionRenderProps } from "../types";
import { SectionShell, SectionTitle } from "../shared";

/** Even square grid, gap & corner radius adjustable. */
export function GalleryGrid({ props }: SectionRenderProps) {
  const p = props as {
    images?: Array<{ url: string; caption?: string }>;
    columns?: number;
    s_gap?: string;
    s_radius?: string;
  };
  const cols = p.columns ?? 3;
  const gap = p.s_gap === "loose" ? "0.75rem" : "0.25rem";
  const radius = p.s_radius === "sharp" ? "" : "rounded-lg";
  return (
    <SectionShell muted>
      <SectionTitle>Galeri</SectionTitle>
      <div
        className="inv-stagger grid"
        style={{ gap, gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {(p.images ?? []).map((img, i) => (
          <Image
            key={i}
            src={img.url}
            alt={img.caption ?? ""}
            width={400}
            height={400}
            className={`aspect-square w-full object-cover ${radius}`}
          />
        ))}
      </div>
    </SectionShell>
  );
}
