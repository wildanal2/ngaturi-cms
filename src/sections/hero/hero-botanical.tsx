import Image from "next/image";
import type { SectionRenderProps } from "../types";
import { formatEventDate } from "../shared";
import { CornerFloral, LeafSprig, TopGarland } from "../ornaments";

/** Botanical framed round photo with original SVG ornaments. */
export function HeroBotanical({ props, guestName }: SectionRenderProps) {
  const p = props as {
    couple_names?: string;
    event_date?: string;
    tagline?: string;
    background_image?: string;
    background_texture?: string;
    garland_left_image?: string;
    garland_right_image?: string;
    flower_left_image?: string;
    flower_right_image?: string;
    s_palette?: string;
  };
  const noir = p.s_palette === "noir";
  const orn = "text-[var(--inv-secondary)]";
  return (
    <section
      className={`relative flex min-h-[92vh] flex-col items-center justify-center overflow-hidden px-6 py-20 text-center ${
        noir ? "text-white" : "text-[var(--inv-primary)]"
      }`}
      style={{
        background: noir
          ? "radial-gradient(120% 90% at 50% 0%, color-mix(in srgb, var(--inv-primary) 55%, #0b0f0c) 0%, #0b0f0c 70%)"
          : "var(--inv-bg)",
      }}
    >
      {p.background_texture ? (
        <Image
          src={p.background_texture}
          alt=""
          fill
          sizes="100vw"
          className="pointer-events-none z-0 object-cover opacity-80"
        />
      ) : null}
      {p.garland_left_image ? (
        <Image
          src={p.garland_left_image}
          alt=""
          width={360}
          height={180}
          className="pointer-events-none absolute left-0 top-0 z-[1] h-auto w-3/5 max-w-[360px] object-contain"
        />
      ) : (
        <TopGarland
          className={`inv-ornament inv-ornament--drift pointer-events-none absolute inset-x-0 top-0 z-[1] h-24 w-full ${orn} opacity-80`}
        />
      )}
      {p.garland_right_image ? (
        <Image
          src={p.garland_right_image}
          alt=""
          width={360}
          height={180}
          className="pointer-events-none absolute right-0 top-0 z-[1] h-auto w-3/5 max-w-[360px] object-contain"
        />
      ) : null}
      {p.flower_left_image ? (
        <Image
          src={p.flower_left_image}
          alt=""
          width={240}
          height={480}
          className="pointer-events-none absolute -bottom-6 -left-8 z-[1] h-64 w-auto object-contain object-left-bottom"
        />
      ) : (
        <CornerFloral
          className={`inv-ornament inv-ornament--slow pointer-events-none absolute -bottom-6 -left-8 z-[1] h-52 w-52 ${orn} opacity-90`}
        />
      )}
      {p.flower_right_image ? (
        <Image
          src={p.flower_right_image}
          alt=""
          width={240}
          height={480}
          className="pointer-events-none absolute -bottom-6 -right-8 z-[1] h-64 w-auto object-contain object-right-bottom"
        />
      ) : (
        <CornerFloral
          className={`inv-ornament inv-ornament--flip pointer-events-none absolute -right-8 -bottom-6 z-[1] h-52 w-52 ${orn} opacity-90`}
        />
      )}

      <div className="relative z-10">
        {guestName ? (
          <p className="mb-3 text-xs tracking-widest uppercase opacity-80">
            Kepada Yth. {guestName}
          </p>
        ) : null}
        <p className="text-sm tracking-[0.35em] uppercase opacity-90">
          {p.tagline ?? "The Wedding Of"}
        </p>
        <div
          className={`mx-auto mt-7 w-52 overflow-hidden rounded-full border-4 ${
            noir
              ? "border-[var(--inv-secondary)]"
              : "border-[color-mix(in_srgb,var(--inv-secondary)_55%,transparent)]"
          }`}
        >
          {p.background_image ? (
            <Image
              src={p.background_image}
              alt=""
              width={224}
              height={280}
              className="h-60 w-full object-cover"
            />
          ) : (
            <div className="h-60 w-full bg-white/10" />
          )}
        </div>
        <h1 className="mt-7 font-[family-name:var(--inv-font)] text-5xl">
          {p.couple_names ?? "Nama Mempelai"}
        </h1>
        <LeafSprig
          className={`inv-ornament inv-ornament--drift mx-auto mt-3 h-6 w-48 ${orn}`}
        />
        <p className="mt-3 text-sm opacity-90">{formatEventDate(p.event_date)}</p>
      </div>
    </section>
  );
}
