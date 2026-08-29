import Image from "next/image";
import type { SectionRenderProps } from "./types";
import {
  SectionShell,
  SectionTitle,
  formatEventDate,
  formatTimeRange,
} from "./shared";
import styles from "./static-parts.module.css";
import { CornerFloral, LeafSprig } from "./ornaments";

/* ---------- HERO ---------- */

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
    s_photo_side?: string;
  };
  const photoRight = p.s_photo_side === "right";
  return (
    <section className="grid min-h-[80vh] sm:grid-cols-2">
      <div
        className={`relative min-h-[40vh] ${photoRight ? "sm:order-2" : ""}`}
      >
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

const SHAPE_CLASS: Record<string, string> = {
  circle: "rounded-full",
  rounded: "rounded-2xl",
  arch: "rounded-[50%_50%_1rem_1rem/60%_60%_1rem_1rem]",
};

function PersonCard({
  person,
  shape = "circle",
}: {
  person: Person;
  shape?: string;
}) {
  const sc = SHAPE_CLASS[shape] ?? SHAPE_CLASS.circle;
  return (
    <div className="text-center">
      {person.photo ? (
        <Image
          src={person.photo}
          alt={person.name ?? ""}
          width={180}
          height={180}
          className={`mx-auto h-44 w-44 object-cover ${sc}`}
        />
      ) : (
        <div
          className={`mx-auto h-44 w-44 bg-[color-mix(in_srgb,var(--inv-primary)_12%,transparent)] ${sc}`}
        />
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
  const p = props as { bride?: Person; groom?: Person; s_photo_shape?: string };
  return (
    <SectionShell muted>
      <SectionTitle>Mempelai</SectionTitle>
      <div className="inv-stagger grid gap-10 sm:grid-cols-2">
        <PersonCard person={p.bride ?? {}} shape={p.s_photo_shape} />
        <PersonCard person={p.groom ?? {}} shape={p.s_photo_shape} />
      </div>
    </SectionShell>
  );
}

export function CoupleStacked({ props }: SectionRenderProps) {
  const p = props as { bride?: Person; groom?: Person; s_photo_shape?: string };
  return (
    <SectionShell>
      <SectionTitle>Mempelai</SectionTitle>
      <div className="inv-stagger space-y-12">
        <PersonCard person={p.bride ?? {}} shape={p.s_photo_shape} />
        <p className="text-center font-[family-name:var(--inv-font)] text-3xl text-[var(--inv-secondary)]">
          &amp;
        </p>
        <PersonCard person={p.groom ?? {}} shape={p.s_photo_shape} />
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
      <div className="space-y-6 inv-stagger">
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
        style={{
          gap,
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        }}
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

/* =========================================================
 * ADDITIONAL VARIANTS
 * ======================================================= */

/* HERO — minimal typographic (no photo) */
export function HeroMinimal({ props, guestName }: SectionRenderProps) {
  const p = props as {
    couple_names?: string;
    event_date?: string;
    tagline?: string;
    s_scale?: string;
  };
  const size = p.s_scale === "lg" ? "text-5xl" : "text-6xl";
  return (
    <section className="flex min-h-[80vh] flex-col items-center justify-center bg-[var(--inv-bg)] px-6 py-20 text-center">
      {guestName ? (
        <p className="mb-6 text-xs tracking-widest text-[var(--inv-primary)] uppercase">
          Kepada Yth. {guestName}
        </p>
      ) : null}
      <p className={styles.hHairline + " w-full max-w-[220px] text-xs tracking-[0.3em] uppercase"}>
        {p.tagline ?? "The Wedding Of"}
      </p>
      <h1
        className={`mt-6 font-[family-name:var(--inv-font)] ${size} leading-none text-[var(--inv-primary)]`}
      >
        {p.couple_names ?? "Nama Mempelai"}
      </h1>
      <p className="mt-6 text-[var(--inv-ink)]">{formatEventDate(p.event_date)}</p>
    </section>
  );
}

/* HERO — arched photo with ornamental frame */
export function HeroArch({ props, guestName }: SectionRenderProps) {
  const p = props as {
    couple_names?: string;
    event_date?: string;
    tagline?: string;
    background_image?: string;
    s_frame?: string;
  };
  return (
    <section className="bg-[var(--inv-bg)] px-6 py-16 text-center text-[var(--inv-primary)]">
      <div className={p.s_frame === "plain" ? "px-2 py-6" : styles.ornFrame}>
        {p.tagline ? (
          <p className="text-xs tracking-[0.3em] uppercase">{p.tagline}</p>
        ) : null}
        <div className={styles.arch + " mx-auto mt-5 h-72 w-56"}>
          {p.background_image ? (
            <Image
              src={p.background_image}
              alt=""
              width={224}
              height={288}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-[color-mix(in_srgb,var(--inv-primary)_15%,transparent)]" />
          )}
        </div>
        <h1 className="mt-5 font-[family-name:var(--inv-font)] text-4xl">
          {p.couple_names ?? "Nama Mempelai"}
        </h1>
        <p className="mt-2 text-sm text-[var(--inv-ink)]">
          {formatEventDate(p.event_date)}
        </p>
        {guestName ? (
          <p className="mt-4 text-xs text-[var(--inv-ink)]">
            Kepada Yth. {guestName}
          </p>
        ) : null}
      </div>
    </section>
  );
}

/* COUPLE — polaroid tilted cards */
function PolaroidCard({ person, tilt }: { person: Person; tilt: string }) {
  return (
    <div className={styles.polaroid + " " + tilt}>
      {person.photo ? (
        <Image
          src={person.photo}
          alt={person.name ?? ""}
          width={220}
          height={220}
          className="h-52 w-52 object-cover"
        />
      ) : (
        <div className="h-52 w-52 bg-[color-mix(in_srgb,var(--inv-primary)_12%,transparent)]" />
      )}
      <p className="mt-3 text-center font-[family-name:var(--inv-font)] text-xl text-[var(--inv-primary)]">
        {person.full_name || person.name}
      </p>
    </div>
  );
}

export function CouplePolaroid({ props }: SectionRenderProps) {
  const p = props as { bride?: Person; groom?: Person };
  return (
    <SectionShell muted>
      <SectionTitle>Mempelai</SectionTitle>
      <div className="inv-stagger flex flex-wrap justify-center gap-6">
        <PolaroidCard person={p.bride ?? {}} tilt={styles.polaroidTiltL} />
        <PolaroidCard person={p.groom ?? {}} tilt={styles.polaroidTiltR} />
      </div>
    </SectionShell>
  );
}

/* GALLERY — masonry via CSS columns */
export function GalleryMasonry({ props }: SectionRenderProps) {
  const p = props as {
    images?: Array<{ url: string; caption?: string }>;
    columns?: number;
  };
  return (
    <SectionShell>
      <SectionTitle>Galeri</SectionTitle>
      <div className={styles.masonry} style={{ columnCount: p.columns ?? 3 }}>
        {(p.images ?? []).map((img, i) => (
          <Image
            key={i}
            src={img.url}
            alt={img.caption ?? ""}
            width={400}
            height={0}
            style={{ height: "auto" }}
            className="w-full rounded-lg object-cover"
          />
        ))}
      </div>
    </SectionShell>
  );
}

/* GALLERY — horizontal snap carousel */
export function GalleryCarousel({ props }: SectionRenderProps) {
  const p = props as { images?: Array<{ url: string; caption?: string }> };
  return (
    <SectionShell muted>
      <SectionTitle>Galeri</SectionTitle>
      <div className={styles.carousel}>
        {(p.images ?? []).map((img, i) => (
          <Image
            key={i}
            src={img.url}
            alt={img.caption ?? ""}
            width={400}
            height={500}
            className="aspect-[4/5] rounded-xl object-cover"
          />
        ))}
      </div>
    </SectionShell>
  );
}

/* EVENT DETAILS — side cards */
export function EventCards({ props }: SectionRenderProps) {
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
    <SectionShell muted>
      <SectionTitle>Acara</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2 inv-stagger">
        {(p.events ?? []).map((e, i) => (
          <div
            key={i}
            className="rounded-2xl bg-[var(--inv-bg)] p-5 text-center shadow-sm"
          >
            <h3 className="font-[family-name:var(--inv-font)] text-lg text-[var(--inv-primary)]">
              {e.name}
            </h3>
            <p className="mt-1 text-sm text-[var(--inv-ink)]">
              {formatEventDate(e.date)}
            </p>
            <p className="text-sm text-[var(--inv-ink)]">
              {formatTimeRange(e.start_time, e.end_time)}
            </p>
            <p className="mt-2 text-sm font-medium text-[var(--inv-ink)]">
              {e.venue_name}
            </p>
            {e.maps_url ? (
              <a
                href={e.maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs text-[var(--inv-primary)] underline"
              >
                Google Maps
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

/* QUOTE — bordered with hairlines */
export function QuoteBordered({ props }: SectionRenderProps) {
  const p = props as { text?: string; source?: string };
  return (
    <SectionShell muted>
      <div className="text-center">
        <p className={styles.hHairline + " mx-auto mb-5 max-w-[120px]"} />
        <p className="font-[family-name:var(--inv-font)] text-lg leading-relaxed text-[var(--inv-primary)]">
          {p.text}
        </p>
        {p.source ? (
          <p className="mt-3 text-sm text-[var(--inv-ink)]">— {p.source}</p>
        ) : null}
        <p className={styles.hHairline + " mx-auto mt-5 max-w-[120px]"} />
      </div>
    </SectionShell>
  );
}

/* GIFT — minimal single block */
export function GiftMinimal({ props }: SectionRenderProps) {
  const p = props as {
    intro?: string;
    bank_accounts?: Array<{
      bank_name: string;
      account_number: string;
      account_name: string;
    }>;
  };
  return (
    <SectionShell>
      <SectionTitle>Amplop Digital</SectionTitle>
      {p.intro ? (
        <p className="mb-4 text-center text-sm text-[var(--inv-ink)]">
          {p.intro}
        </p>
      ) : null}
      <div className="divide-y divide-[color-mix(in_srgb,var(--inv-primary)_15%,transparent)] rounded-xl border border-[color-mix(in_srgb,var(--inv-primary)_15%,transparent)]">
        {(p.bank_accounts ?? []).map((b, i) => (
          <div key={i} className="flex items-center justify-between p-4 text-sm">
            <span className="text-[var(--inv-ink)]">
              <b className="text-[var(--inv-primary)]">{b.bank_name}</b> ·{" "}
              {b.account_name}
            </span>
            <span className="font-mono text-[var(--inv-ink)]">
              {b.account_number}
            </span>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

/* MAP LOCATION */
export function MapEmbed({ props }: SectionRenderProps) {
  const p = props as { embed_url?: string; venue_name?: string; address?: string };
  return (
    <SectionShell>
      <SectionTitle>Lokasi</SectionTitle>
      {p.venue_name ? (
        <p className="mb-1 text-center font-[family-name:var(--inv-font)] text-lg text-[var(--inv-primary)]">
          {p.venue_name}
        </p>
      ) : null}
      {p.address ? (
        <p className="mb-4 text-center text-sm text-[var(--inv-ink)]">
          {p.address}
        </p>
      ) : null}
      {p.embed_url ? (
        <iframe
          src={p.embed_url}
          title="Peta lokasi"
          loading="lazy"
          className="aspect-video w-full rounded-xl border border-[color-mix(in_srgb,var(--inv-primary)_20%,transparent)]"
        />
      ) : (
        <p className="rounded-xl border border-dashed border-[color-mix(in_srgb,var(--inv-primary)_25%,transparent)] p-6 text-center text-sm text-[var(--inv-ink)]">
          Tempel URL embed Google Maps di panel editor.
        </p>
      )}
    </SectionShell>
  );
}

export function MapButton({ props }: SectionRenderProps) {
  const p = props as { maps_url?: string; venue_name?: string; address?: string };
  return (
    <SectionShell muted>
      <div className="text-center">
        <SectionTitle>Lokasi</SectionTitle>
        <p className="font-[family-name:var(--inv-font)] text-lg text-[var(--inv-primary)]">
          {p.venue_name}
        </p>
        <p className="mt-1 text-sm text-[var(--inv-ink)]">{p.address}</p>
        {p.maps_url ? (
          <a
            href={p.maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block rounded-full bg-[var(--inv-primary)] px-6 py-2.5 text-sm font-medium text-white"
          >
            Buka di Google Maps
          </a>
        ) : null}
      </div>
    </SectionShell>
  );
}

/* CLOSING / THANK YOU */
export function ClosingSimple({ props }: SectionRenderProps) {
  const p = props as { message?: string; names?: string };
  return (
    <section className="bg-[var(--inv-primary)] px-6 py-20 text-center text-white">
      <p className="mx-auto max-w-md leading-relaxed">
        {p.message ??
          "Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu."}
      </p>
      <p className="mt-8 text-sm tracking-widest uppercase opacity-80">
        Kami yang berbahagia
      </p>
      <p className="mt-2 font-[family-name:var(--inv-font)] text-2xl">
        {p.names ?? "Dinda & Raka"}
      </p>
    </section>
  );
}

export function ClosingPhoto({ props }: SectionRenderProps) {
  const p = props as { message?: string; names?: string; photo?: string };
  return (
    <section className="relative px-6 py-24 text-center text-white">
      {p.photo ? (
        <Image src={p.photo} alt="" fill className="object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[var(--inv-secondary)]" />
      )}
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative mx-auto max-w-md">
        <p className="leading-relaxed">
          {p.message ?? "Terima kasih atas doa dan restunya."}
        </p>
        <p className="mt-6 font-[family-name:var(--inv-font)] text-3xl">
          {p.names ?? "Dinda & Raka"}
        </p>
      </div>
    </section>
  );
}

/* HERO — botanical framed photo (original SVG ornaments) */
export function HeroBotanical({ props, guestName }: SectionRenderProps) {
  const p = props as {
    couple_names?: string;
    event_date?: string;
    tagline?: string;
    background_image?: string;
  };
  return (
    <section className="relative overflow-hidden bg-[var(--inv-bg)] px-6 py-20 text-center text-[var(--inv-primary)]">
      <CornerFloral className="pointer-events-none absolute -top-2 -left-2 h-28 w-28 text-[var(--inv-secondary)] opacity-70" />
      <CornerFloral className="pointer-events-none absolute -right-2 -bottom-2 h-28 w-28 -scale-x-100 -scale-y-100 text-[var(--inv-secondary)] opacity-70" />
      {guestName ? (
        <p className="mb-3 text-xs tracking-widest uppercase opacity-80">
          Kepada Yth. {guestName}
        </p>
      ) : null}
      <p className="text-sm tracking-[0.3em] uppercase">
        {p.tagline ?? "The Wedding Of"}
      </p>
      <div className="mx-auto mt-6 w-56 overflow-hidden rounded-full border-4 border-[color-mix(in_srgb,var(--inv-secondary)_50%,transparent)]">
        {p.background_image ? (
          <Image
            src={p.background_image}
            alt=""
            width={224}
            height={280}
            className="h-64 w-full object-cover"
          />
        ) : (
          <div className="h-64 w-full bg-[color-mix(in_srgb,var(--inv-primary)_14%,transparent)]" />
        )}
      </div>
      <h1 className="mt-6 font-[family-name:var(--inv-font)] text-4xl">
        {p.couple_names ?? "Nama Mempelai"}
      </h1>
      <LeafSprig className="mx-auto mt-3 h-5 w-40 text-[var(--inv-secondary)]" />
      <p className="mt-3 text-sm text-[var(--inv-ink)]">
        {formatEventDate(p.event_date)}
      </p>
    </section>
  );
}
