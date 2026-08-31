import Image from "next/image";
import { AtSign } from "lucide-react";
import type { SectionRenderProps } from "../types";
import { pickDecor, decorBgStyle, DecorDivider, DecorOrnaments } from "../shared";
import styles from "../floating17.module.css";

type Person = {
  name?: string;
  full_name?: string;
  photo?: string;
  instagram?: string;
  parents?: string;
  child_order?: string;
};

function PersonCard({ person, fallback }: { person: Person; fallback: string }) {
  const handle = person.instagram?.replace(/^@/, "");
  return (
    <article className={`${styles.personCard} flex min-w-0 flex-col items-center text-center`}>
      <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-white bg-[#EFEADD] shadow-lg sm:h-40 sm:w-40">
        {person.photo ? (
          <Image src={person.photo} alt={person.full_name ?? fallback} fill sizes="160px" className="object-cover" />
        ) : null}
      </div>
      <h3 className={`${styles.scriptFont} mt-5 text-3xl leading-tight text-[#6F805A]`}>
        {person.full_name ?? fallback}
      </h3>
      {person.child_order ? <p className="mt-3 text-xs leading-relaxed text-[#707070]">{person.child_order}</p> : null}
      {person.parents ? <p className="mt-1 text-xs leading-relaxed text-[#707070]">{person.parents}</p> : null}
      {handle ? (
        <a
          href={`https://instagram.com/${handle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#668A5E] px-3 py-1.5 text-[11px] text-white shadow-sm"
        >
          <AtSign size={12} /> @{handle}
        </a>
      ) : null}
    </article>
  );
}

export function CoupleFloating17({ props }: SectionRenderProps) {
  const p = props as Record<string, unknown> & { bride?: Person; groom?: Person; title?: string };
  const d = pickDecor(p);
  return (
    <section className={`${styles.bodyFont} relative overflow-hidden px-5 py-20`} style={decorBgStyle(d)}>
      <DecorOrnaments d={d} />
      <div className="relative z-10 mx-auto max-w-lg text-center">
        {d.section_icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.section_icon} alt="" className="mx-auto h-11 w-11" />
        ) : null}
        <p className="mt-3 text-sm uppercase tracking-[0.24em] text-[#3A443D]">{p.title ?? "Mempelai"}</p>
        <DecorDivider d={d} className="mx-auto mt-3 h-4 w-24 object-contain" />
        <div className="mt-10 grid grid-cols-2 gap-5 sm:gap-8">
          <PersonCard person={p.bride ?? {}} fallback="Hani Ramadani" />
          <PersonCard person={p.groom ?? {}} fallback="Hari Septriansyah" />
        </div>
      </div>
    </section>
  );
}
