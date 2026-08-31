import Image from "next/image";
import type { SectionRenderProps } from "../types";
import { formatEventDate } from "../shared";

type GarlandProps = {
  bismillah?: string;
  couple_names?: string;
  event_date?: string;
  tagline?: string;
  background_image?: string;
  couple_image?: string;
  garland_left_image?: string;
  garland_right_image?: string;
  flower_left_image?: string;
  flower_right_image?: string;
};

/** Watercolor hero with a hanging floral garland and a full couple illustration. */
export function HeroGarland({ props, guestName }: SectionRenderProps) {
  const p = props as GarlandProps;

  return (
    <section className="relative flex min-h-[92vh] flex-col items-center justify-center overflow-hidden bg-[var(--inv-bg)] px-6 py-20 text-center">
      {p.background_image ? (
        <Image
          src={p.background_image}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, 512px"
          className="pointer-events-none z-0 object-cover"
        />
      ) : null}
      <div className="pointer-events-none absolute -top-1 left-0 right-0 z-[1] flex justify-center">
        <div className="relative h-28 w-full max-w-lg">
          {p.garland_left_image ? (
            <Image
              src={p.garland_left_image}
              alt=""
              fill
              sizes="(max-width: 640px) 60vw, 300px"
              className="inv-ornament inv-ornament--slow object-contain object-left-top"
            />
          ) : null}
          {p.garland_right_image ? (
            <Image
              src={p.garland_right_image}
              alt=""
              fill
              sizes="(max-width: 640px) 60vw, 300px"
              className="inv-ornament object-contain object-right-top"
            />
          ) : null}
        </div>
      </div>
      {p.flower_left_image ? (
        <div className="pointer-events-none absolute bottom-0 left-0 z-[1] h-[38%] w-[30%] max-w-40">
          <Image
            src={p.flower_left_image}
            alt=""
            fill
            sizes="(max-width: 640px) 30vw, 160px"
            className="object-contain object-left-bottom opacity-90"
          />
        </div>
      ) : null}
      {p.flower_right_image ? (
        <div className="pointer-events-none absolute bottom-0 right-0 z-[1] h-[38%] w-[30%] max-w-40">
          <Image
            src={p.flower_right_image}
            alt=""
            fill
            sizes="(max-width: 640px) 30vw, 160px"
            className="object-contain object-right-bottom opacity-90"
          />
        </div>
      ) : null}

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center pb-16 pt-16 text-[var(--inv-primary)]">
        {p.bismillah ? (
          <p
            className="text-2xl leading-snug"
            style={{ fontFamily: '"Amiri", "Noto Naskh Arabic", serif' }}
            dir="rtl"
          >
            {p.bismillah}
          </p>
        ) : null}
        <p className="mt-4 text-[9px] uppercase tracking-[0.3em] opacity-70">
          {p.tagline ?? "The Wedding Of"}
        </p>
        <h1 className="mt-2 font-[family-name:var(--inv-font)] text-4xl leading-snug">
          {p.couple_names ?? "Nama & Pasangan"}
        </h1>
        {guestName ? (
          <p className="mt-6 text-xs opacity-75">Kepada Yth. {guestName}</p>
        ) : null}
        <div className="relative mt-5 h-72 w-full max-w-xs">
          {p.couple_image ? (
            <Image
              src={p.couple_image}
              alt=""
              fill
              sizes="(max-width: 640px) 80vw, 320px"
              className="object-contain object-bottom"
            />
          ) : null}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded bg-white/75 px-3 py-1 backdrop-blur-sm">
            <p className="text-[10px] tracking-widest text-[var(--inv-primary)]">
              {formatEventDate(p.event_date)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
