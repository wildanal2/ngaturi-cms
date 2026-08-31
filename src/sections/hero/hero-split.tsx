import Image from "next/image";
import type { SectionRenderProps } from "../types";
import { formatEventDate } from "../shared";

/** Photo on one side, text on the other. */
export function HeroSplit({ props, guestName }: SectionRenderProps) {
  const p = props as {
    couple_names?: string;
    event_date?: string;
    tagline?: string;
    background_image?: string;
    s_photo_side?: string;
  };
  const photoRight = p.s_photo_side === "right";
  return (
    <section className="grid min-h-[80vh] sm:grid-cols-2">
      <div className={`relative min-h-[40vh] ${photoRight ? "sm:order-2" : ""}`}>
        {p.background_image ? (
          <Image src={p.background_image} alt="" fill priority className="object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[var(--inv-secondary)]" />
        )}
      </div>
      <div className="flex flex-col items-center justify-center bg-[var(--inv-bg)] px-8 py-16 text-center">
        {guestName ? (
          <p className="mb-4 text-xs tracking-widest text-[var(--inv-primary)] uppercase">
            Kepada Yth. {guestName}
          </p>
        ) : null}
        <p className="text-sm tracking-[0.3em] text-[var(--inv-primary)] uppercase">
          {p.tagline ?? "The Wedding Of"}
        </p>
        <h1 className="mt-4 font-[family-name:var(--inv-font)] text-4xl text-[var(--inv-primary)]">
          {p.couple_names ?? "Nama Mempelai"}
        </h1>
        <p className="mt-4 text-[var(--inv-ink)]">{formatEventDate(p.event_date)}</p>
      </div>
    </section>
  );
}
