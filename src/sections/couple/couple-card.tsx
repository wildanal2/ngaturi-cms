import Image from "next/image";
import { AtSign } from "lucide-react";
import type { SectionRenderProps } from "../types";
import { Divider, FloatingLeaves } from "../ornaments";
import type { Person } from "./person";

function Half({ person }: { person: Person }) {
  return (
    <div className="flex flex-col items-center text-center">
      {person.photo ? (
        <Image
          src={person.photo}
          alt={person.name ?? ""}
          width={140}
          height={140}
          className="h-32 w-32 rounded-full border-4 border-white object-cover shadow"
        />
      ) : (
        <div className="h-32 w-32 rounded-full border-4 border-white bg-[color-mix(in_srgb,var(--inv-primary)_12%,transparent)] shadow" />
      )}
      <h3 className="mt-4 font-[family-name:var(--inv-font)] text-3xl leading-tight text-[var(--inv-primary)]">
        {person.full_name || person.name}
      </h3>
      {person.child_order || person.parents ? (
        <p className="mt-2 max-w-xs text-sm text-[var(--inv-ink)]">
          {[person.child_order, person.parents].filter(Boolean).join(" ")}
        </p>
      ) : null}
      {person.residence ? (
        <p className="text-sm text-[var(--inv-ink)] opacity-80">
          {person.residence}
        </p>
      ) : null}
      {person.instagram ? (
        <a
          href={`https://instagram.com/${person.instagram.replace(/^@/, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--inv-secondary)] px-4 py-1 text-xs font-medium text-white"
        >
          <AtSign size={12} /> @{person.instagram.replace(/^@/, "")}
        </a>
      ) : null}
    </div>
  );
}

/** White floating card, bride above groom, botanical corners. */
export function CoupleCard({ props }: SectionRenderProps) {
  const p = props as { bride?: Person; groom?: Person };
  return (
    <section className="relative overflow-hidden px-6 py-16">
      <FloatingLeaves />
      <div className="relative mx-auto max-w-md rounded-3xl bg-white p-8 shadow-lg">
        <p className="text-center text-sm font-medium tracking-[0.3em] text-[var(--inv-secondary)] uppercase">
          Mempelai
        </p>
        <Divider className="mx-auto mt-3 h-4 w-32 text-[var(--inv-secondary)] opacity-70" />
        <div className="mt-8 flex flex-col items-center gap-8 inv-stagger">
          <Half person={p.bride ?? {}} />
          <span className="font-[family-name:var(--inv-font)] text-3xl text-[var(--inv-secondary)]">
            &amp;
          </span>
          <Half person={p.groom ?? {}} />
        </div>
      </div>
    </section>
  );
}
