import Link from "next/link";
import { Eye, MessageCircleHeart, PencilLine, Users } from "lucide-react";
import type { InferSelectModel } from "drizzle-orm";
import type { invitations } from "@/lib/db/schema";
import {
  invitationStage,
  isEditLocked,
  planLabel,
} from "@/lib/invitation/entitlement";
import { InlineShare } from "./inline-share";

const EVENT_LABEL: Record<string, string> = {
  wedding: "Pernikahan",
  khitan: "Khitan",
  tahlil: "Tahlil",
  aqiqah: "Aqiqah",
  engagement: "Lamaran",
  birthday: "Ulang tahun",
  generic: "Acara",
};

const TONE: Record<string, string> = {
  good: "bg-forest text-cream",
  warn: "bg-gold/90 text-ink",
  neutral: "bg-white/90 text-ink",
};

function countdown(date: Date | null): string | null {
  if (!date) return null;
  const days = Math.ceil((date.getTime() - Date.now()) / 86_400_000);
  if (days > 1) return `H-${days}`;
  if (days === 1) return "Besok";
  if (days === 0) return "Hari ini";
  return "Sudah lewat";
}

export function InvitationCard({
  invitation: inv,
  stats,
  appUrl,
}: {
  invitation: InferSelectModel<typeof invitations>;
  stats?: { attending: number; messages: number };
  appUrl: string;
}) {
  const locked = isEditLocked(inv) || inv.isEditLocked;
  const stage = invitationStage(inv);
  const url = `${appUrl.replace(/\/$/, "")}/${inv.slug}`;
  const title = inv.eventTitle ?? "Undangan tanpa judul";

  // Lightweight preview: the template card is plain coloured divs (cached
  // 1 day, no remote image fetch), so a dashboard with many cards stays
  // fast. The heavy OG image is only for social-share unfurls.
  const thumb = inv.sourceTemplate
    ? `/templates/${inv.sourceTemplate}/card`
    : null;

  const cd = countdown(inv.eventDate);

  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-line bg-paper">
      {/* preview */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-forest/15 to-wine/15">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            Belum ada pratinjau
          </div>
        )}
        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur ${
            TONE[stage.tone]
          }`}
        >
          {stage.label}
        </span>
        {cd ? (
          <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
            {cd}
          </span>
        ) : null}
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="text-lg leading-tight">{title}</h3>
          <p className="mt-0.5 text-xs text-muted">
            {EVENT_LABEL[inv.eventType] ?? "Acara"} · Paket {planLabel(inv)}
            {inv.eventDate
              ? ` · ${inv.eventDate.toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}`
              : ""}
          </p>
        </div>

        <p className="text-xs leading-relaxed text-ink-soft">{stage.hint}</p>

        {inv.status === "published" ? (
          <div className="flex items-center gap-3 text-xs text-ink-soft">
            <span className="inline-flex items-center gap-1">
              <Users size={13} /> {stats?.attending ?? 0} hadir
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircleHeart size={13} /> {stats?.messages ?? 0} ucapan
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye size={13} /> {inv.viewCount} dilihat
            </span>
          </div>
        ) : null}

        {inv.status === "published" ? (
          <InlineShare url={url} title={inv.eventTitle ?? undefined} />
        ) : null}

        <div className="mt-auto flex flex-wrap gap-2 pt-1 text-sm">
          <Link
            href={`/builder/${inv.id}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-forest px-4 py-2 font-medium text-cream hover:bg-forest-600"
          >
            <PencilLine size={14} />
            {locked ? "Lihat isi" : inv.status === "published" ? "Edit" : "Lanjut edit"}
          </Link>
          {inv.status === "published" ? (
            <a
              href={`/${inv.slug}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-line px-4 py-2 hover:bg-cream-200"
            >
              Buka undangan
            </a>
          ) : null}
          <Link
            href={`/invitations/${inv.id}`}
            className="rounded-full border border-line px-4 py-2 hover:bg-cream-200"
          >
            Kelola &amp; RSVP
          </Link>
        </div>

        {locked ? (
          <Link
            href={`/invitations/${inv.id}/unlock`}
            className="rounded-lg bg-gold/10 px-3 py-2 text-center text-xs font-medium text-ink hover:bg-gold/20"
          >
            Upgrade untuk buka kunci edit &amp; hapus watermark →
          </Link>
        ) : null}
      </div>
    </li>
  );
}
