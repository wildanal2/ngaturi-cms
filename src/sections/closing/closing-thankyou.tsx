import type { SectionRenderProps } from "../types";
import { pickDecor, decorBgStyle, DecorOrnaments } from "../shared";

/** Minimal "Thank You" sign-off with swaying botanical corners.
 *  Supports background texture and layered leaf ornaments. */
export function ClosingThankYou({ props }: SectionRenderProps) {
  const p = props as {
    message?: string;
    names?: string;
    background_image?: string;
    ornament_tr_images?: string[];
    ornament_bl_images?: string[];
  };
  const d = pickDecor(p);
  return (
    <section
      className="relative overflow-hidden px-6 py-20 text-center"
      style={decorBgStyle(d)}
    >
      <DecorOrnaments d={d} />
      <div className="relative flex flex-col items-center">
        <p className="font-[family-name:var(--inv-font)] text-5xl text-[var(--inv-primary)]">
          Thank You!
        </p>
        <p className="mt-6 max-w-sm text-sm leading-relaxed text-[var(--inv-ink)]">
          {p.message ??
            "Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu."}
        </p>
        <p className="mt-6 text-xs tracking-[0.2em] uppercase text-[var(--inv-secondary)]">
          Kami yang berbahagia
        </p>
        <p className="mt-1 font-[family-name:var(--inv-font)] text-2xl text-[var(--inv-primary)]">
          {p.names ?? "Nama & Pasangan"}
        </p>
      </div>
    </section>
  );
}
