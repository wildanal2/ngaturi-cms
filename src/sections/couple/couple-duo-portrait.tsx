import Image from "next/image";
import type { SectionRenderProps } from "../types";
import { SectionHeader } from "../shared";
import type { Person } from "./person";

type DuoPortraitProps = {
  bride?: Person;
  groom?: Person;
  eyebrow?: string;
  title?: string;
  background_image?: string;
  divider_image?: string;
  flower_left_image?: string;
  flower_right_image?: string;
  s_photo_shape?: string;
  s_ornament?: string;
};

function photoShape(shape?: string) {
  if (shape === "circle") return "rounded-full";
  if (shape === "rounded") return "rounded-2xl";
  return "rounded-t-full rounded-b-[28px]";
}

function Portrait({ person, shape }: { person: Person; shape: string }) {
  const family = [person.child_order, person.parents].filter(Boolean).join(" ");
  const instagram = person.instagram?.replace(/^@/, "");

  return (
    <div className="inv-stagger flex flex-col items-center text-center">
      <div className={`relative h-44 w-36 overflow-hidden border border-black/5 bg-white/30 shadow-sm ${shape}`}>
        {person.photo ? (
          <Image
            src={person.photo}
            alt={person.name ?? ""}
            fill
            sizes="144px"
            className="object-cover"
          />
        ) : null}
      </div>
      <h3 className="mt-4 font-[family-name:var(--inv-font)] text-2xl text-[var(--inv-primary)]">
        {person.name ?? "Nama"}
      </h3>
      {person.full_name ? <p className="mt-2 text-[13px] leading-relaxed text-[var(--inv-ink)]">{person.full_name}</p> : null}
      {family ? <p className="mt-1 text-xs text-[var(--inv-ink)] opacity-70">{family}</p> : null}
      {instagram ? (
        <a
          href={`https://instagram.com/${instagram}`}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block rounded-full border border-[var(--inv-secondary)] px-3 py-1 text-[11px] text-[var(--inv-secondary)]"
        >
          @{instagram}
        </a>
      ) : null}
    </div>
  );
}

/** Two arch portraits with the watercolor and floral framing of kana1. */
export function CoupleDuoPortrait({ props }: SectionRenderProps) {
  const p = props as DuoPortraitProps;
  const showOrnaments = p.s_ornament !== "plain";
  const shape = photoShape(p.s_photo_shape);

  return (
    <section className="relative overflow-hidden bg-[var(--inv-bg)] px-6 py-24">
      {p.background_image ? (
        <Image
          src={p.background_image}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, 512px"
          className="pointer-events-none z-0 object-cover"
        />
      ) : null}
      {showOrnaments && p.flower_left_image ? (
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
      {showOrnaments && p.flower_right_image ? (
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
      {showOrnaments && p.divider_image ? (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-[1] h-24 w-16 -translate-x-1/2">
          <Image
            src={p.divider_image}
            alt=""
            fill
            sizes="64px"
            className="object-contain object-bottom"
          />
        </div>
      ) : null}

      <div className="relative z-10 mx-auto max-w-md">
        <SectionHeader eyebrow={p.eyebrow ?? "The Bride & Groom"} title={p.title ?? "Calon Mempelai"} />
        <div className="mt-10 grid grid-cols-2 gap-5">
          <Portrait person={p.groom ?? {}} shape={shape} />
          <Portrait person={p.bride ?? {}} shape={shape} />
        </div>
      </div>
    </section>
  );
}
