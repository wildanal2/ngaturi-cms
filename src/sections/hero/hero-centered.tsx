import Image from "next/image";
import type { SectionRenderProps } from "../types";
import { formatEventDate } from "../shared";

/** Full-bleed photo, text overlaid, position + darkness adjustable. */
export function HeroCentered({ props, guestName }: SectionRenderProps) {
  const p = props as {
    couple_names?: string;
    event_date?: string;
    tagline?: string;
    background_image?: string;
    s_overlay?: string;
    s_text_pos?: string;
  };
  const overlay =
    p.s_overlay === "light" ? 0.25 : p.s_overlay === "dark" ? 0.65 : 0.45;
  const justify =
    p.s_text_pos === "top"
      ? "justify-start pt-24"
      : p.s_text_pos === "bottom"
        ? "justify-end pb-24"
        : "justify-center";
  return (
    <section
      className={`relative flex min-h-[85vh] flex-col items-center ${justify} px-6 text-center text-white`}
    >
      {p.background_image ? (
        <Image src={p.background_image} alt="" fill priority className="object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[var(--inv-primary)]" />
      )}
      <div className="absolute inset-0 bg-black" style={{ opacity: overlay }} />
      <div className="relative">
        {guestName ? (
          <p className="mb-6 text-sm tracking-widest uppercase opacity-90">
            Kepada Yth. {guestName}
          </p>
        ) : null}
        {p.tagline ? (
          <p className="mb-3 text-sm tracking-[0.3em] uppercase opacity-90">
            {p.tagline}
          </p>
        ) : null}
        <h1 className="font-[family-name:var(--inv-font)] text-5xl leading-tight sm:text-6xl">
          {p.couple_names ?? "Nama Mempelai"}
        </h1>
        <p className="mt-5 text-lg opacity-90">{formatEventDate(p.event_date)}</p>
      </div>
    </section>
  );
}
