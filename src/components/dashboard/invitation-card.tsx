import Link from "next/link";
import type { InferSelectModel } from "drizzle-orm";
import type { invitations } from "@/lib/db/schema";
import { isEditLocked } from "@/lib/invitation/entitlement";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draf",
  published: "Terbit",
  archived: "Arsip",
  expired: "Kedaluwarsa",
};

export function InvitationCard({
  invitation: inv,
}: {
  invitation: InferSelectModel<typeof invitations>;
}) {
  const locked = isEditLocked(inv) || inv.isEditLocked;

  return (
    <li className="rounded-2xl border border-line bg-paper p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg">{inv.eventTitle ?? inv.slug}</h3>
        <span className="rounded-full bg-cream-200 px-2.5 py-0.5 text-xs text-ink-soft">
          {STATUS_LABEL[inv.status] ?? inv.status}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted">
        {inv.plan === "free_trial" ? "Gratis" : inv.plan}
        {inv.eventDate
          ? ` · ${new Date(inv.eventDate).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}`
          : ""}
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link
          href={`/builder/${inv.id}`}
          className="rounded-full bg-forest px-3.5 py-1.5 font-medium text-cream hover:bg-forest-600"
        >
          {locked ? "Lihat" : "Edit"}
        </Link>
        {inv.status === "published" ? (
          <a
            href={`/${inv.slug}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-line px-3.5 py-1.5 hover:bg-cream-200"
          >
            Buka
          </a>
        ) : null}
        <Link
          href={`/invitations/${inv.id}`}
          className="rounded-full border border-line px-3.5 py-1.5 hover:bg-cream-200"
        >
          RSVP &amp; ucapan
        </Link>
      </div>
    </li>
  );
}
