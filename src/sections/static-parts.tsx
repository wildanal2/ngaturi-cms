import Image from "next/image";
import type { SectionRenderProps } from "./types";
import {
  SectionShell,
  SectionTitle,
  formatEventDate,
  formatTimeRange,
} from "./shared";

/* ---------- HERO ---------- */

export function HeroCentered({ props, guestName }: SectionRenderProps) {
  const p = props as {
    couple_names?: string;
    event_date?: string;
    tagline?: string;
    background_image?: string;
    overlay_opacity?: number;
  };
  return (
    <section className="relative flex min-h-[85vh] flex-col items-center justify-center px-6 text-center text-white">
      {p.background_image ? (
        <Image
          src={p.background_image}
          alt=""
          fill
          priority
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-[var(--inv-primary)]" />
      )}
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: p.overlay_opacity ?? 0.45 }}
      />
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
        <p className="mt-5 text-lg opacity-90">
          {formatEventDate(p.event_date)}
        </p>
      </div>
    </section>
  );
}

export function HeroSplit({ props, guestName }: SectionRenderProps) {
  const p = props as {
    couple_names?: string;
    event_date?: string;
    tagline?: string;
    background_image?: string;
  };
  return (
    <section className="grid min-h-[80vh] sm:grid-cols-2">
      <div className="relative min-h-[40vh]">
        {p.background_image ? (
          <Image
            src={p.background_image}
            alt=""
            fill
            priority
            className="object-cover"
          />
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
        <p className="mt-4 text-[var(--inv-ink)]">
          {formatEventDate(p.event_date)}
        </p>
      </div>
    </section>
  );
}

/* ---------- COUPLE INTRO ---------- */

type Person = {
  name?: string;
  full_name?: string;
  bio?: string;
  photo?: string;
  parents?: string;
  child_order?: string;
};

function PersonCard({ person }: { person: Person }) {
  return (
    <div className="text-center">
      {person.photo ? (
        <Image
          src={person.photo}
          alt={person.name ?? ""}
          width={180}
          height={180}
          className="mx-auto h-44 w-44 rounded-full object-cover"
        />
      ) : (
        <div className="mx-auto h-44 w-44 rounded-full bg-[color-mix(in_srgb,var(--inv-primary)_12%,transparent)]" />
      )}
      <h3 className="mt-4 font-[family-name:var(--inv-font)] text-2xl text-[var(--inv-primary)]">
        {person.full_name || person.name}
      </h3>
      {person.child_order ? (
        <p className="mt-1 text-sm text-[var(--inv-ink)]">
          {person.child_order}
        </p>
      ) : null}
      {person.parents ? (
        <p className="mt-1 text-sm text-[var(--inv-ink)]">
          Putra/Putri dari {person.parents}
        </p>
      ) : null}
    </div>
  );
}

export function CoupleSideBySide({ props }: SectionRenderProps) {
  const p = props as { bride?: Person; groom?: Person };
  return (
    <SectionShell muted>
      <SectionTitle>Mempelai</SectionTitle>
      <div className="grid gap-10 sm:grid-cols-2">
        <PersonCard person={p.bride ?? {}} />
        <PersonCard person={p.groom ?? {}} />
      </div>
    </SectionShell>
  );
}

export function CoupleStacked({ props }: SectionRenderProps) {
  const p = props as { bride?: Person; groom?: Person };
  return (
    <SectionShell>
      <SectionTitle>Mempelai</SectionTitle>
      <div className="space-y-12">
        <PersonCard person={p.bride ?? {}} />
        <p className="text-center font-[family-name:var(--inv-font)] text-3xl text-[var(--inv-secondary)]">
          &amp;
        </p>
        <PersonCard person={p.groom ?? {}} />
      </div>
    </SectionShell>
  );
}

/* ---------- EVENT DETAILS ---------- */

export function EventTimeline({ props }: SectionRenderProps) {
  const p = props as {
    events?: Array<{
      name: string;
      date: string;
      start_time?: string;
      end_time?: string;
      venue_name: string;
      address?: string;
      maps_url?: string;
    }>;
  };
  return (
    <SectionShell>
      <SectionTitle>Rangkaian Acara</SectionTitle>
      <div className="space-y-6">
        {(p.events ?? []).map((e, i) => (
          <div
            key={i}
            className="rounded-xl border border-[color-mix(in_srgb,var(--inv-primary)_20%,transparent)] bg-[var(--inv-bg)] p-6 text-center"
          >
            <h3 className="font-[family-name:var(--inv-font)] text-xl text-[var(--inv-primary)]">
              {e.name}
            </h3>
            <p className="mt-2 text-[var(--inv-ink)]">{formatEventDate(e.date)}</p>
            <p className="text-[var(--inv-ink)]">
              {formatTimeRange(e.start_time, e.end_time)}
            </p>
            <p className="mt-3 font-medium text-[var(--inv-ink)]">
              {e.venue_name}
            </p>
            {e.address ? (
              <p className="text-sm text-[var(--inv-ink)] opacity-80">
                {e.address}
              </p>
            ) : null}
            {e.maps_url ? (
              <a
                href={e.maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block rounded-full border border-[var(--inv-primary)] px-4 py-1.5 text-sm text-[var(--inv-primary)]"
              >
                Lihat lokasi
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

/* ---------- GALLERY ---------- */

export function GalleryGrid({ props }: SectionRenderProps) {
  const p = props as {
    images?: Array<{ url: string; caption?: string }>;
    columns?: number;
  };
  const cols = p.columns ?? 3;
  return (
    <SectionShell muted>
      <SectionTitle>Galeri</SectionTitle>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {(p.images ?? []).map((img, i) => (
          <Image
            key={i}
            src={img.url}
            alt={img.caption ?? ""}
            width={400}
            height={400}
            className="aspect-square w-full rounded-lg object-cover"
          />
        ))}
      </div>
    </SectionShell>
  );
}

/* ---------- QUOTE ---------- */

export function QuoteCentered({ props }: SectionRenderProps) {
  const p = props as { text?: string; source?: string };
  return (
    <SectionShell>
      <blockquote className="text-center">
        <p className="font-[family-name:var(--inv-font)] text-xl leading-relaxed text-[var(--inv-primary)]">
          &ldquo;{p.text}&rdquo;
        </p>
        {p.source ? (
          <footer className="mt-4 text-sm text-[var(--inv-ink)]">
            — {p.source}
          </footer>
        ) : null}
      </blockquote>
    </SectionShell>
  );
}

/* ---------- GIFT ---------- */

export function GiftCards({ props }: SectionRenderProps) {
  const p = props as {
    intro?: string;
    bank_accounts?: Array<{
      bank_name: string;
      account_number: string;
      account_name: string;
    }>;
  };
  return (
    <SectionShell muted>
      <SectionTitle>Amplop Digital</SectionTitle>
      {p.intro ? (
        <p className="mb-6 text-center text-[var(--inv-ink)]">{p.intro}</p>
      ) : null}
      <div className="space-y-4">
        {(p.bank_accounts ?? []).map((b, i) => (
          <div
            key={i}
            className="rounded-xl border border-[color-mix(in_srgb,var(--inv-primary)_20%,transparent)] bg-[var(--inv-bg)] p-5 text-center"
          >
            <p className="font-[family-name:var(--inv-font)] text-lg text-[var(--inv-primary)]">
              {b.bank_name}
            </p>
            <p className="mt-1 font-mono text-[var(--inv-ink)]">
              {b.account_number}
            </p>
            <p className="text-sm text-[var(--inv-ink)] opacity-80">
              a.n. {b.account_name}
            </p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
