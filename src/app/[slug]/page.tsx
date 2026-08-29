import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { invitations, invitationViews } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { InvitationRenderer } from "@/lib/invitation/renderer";
import {
  getPublicInvitation,
  getGuestByToken,
  markGuestOpened,
} from "@/lib/invitation/query";
import { InvitationCover } from "@/components/invitation/cover";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const inv = await getPublicInvitation(slug);
  if (!inv || inv.status !== "published") {
    return { title: "Undangan tidak ditemukan" };
  }
  const hero = inv.sections.find((s) => s.type === "hero");
  const names = (hero?.props?.couple_names as string) ?? inv.eventTitle ?? "Undangan";
  return {
    title: `${names} — Undangan`,
    description: `Undangan ${inv.eventType}. Kami mengundang Anda untuk hadir.`,
    openGraph: {
      title: names,
      description: "Kami mengundang Anda untuk hadir di acara spesial kami.",
      images: hero?.props?.background_image
        ? [hero.props.background_image as string]
        : [],
    },
  };
}

export default async function InvitationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ to?: string }>;
}) {
  const { slug } = await params;
  const { to } = await searchParams;
  const inv = await getPublicInvitation(slug);

  if (!inv || inv.status !== "published") notFound();

  const guest = to ? await getGuestByToken(inv.id, to) : null;
  const guestName = guest?.name ?? null;

  // track view setelah response
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  const ua = h.get("user-agent") ?? null;
  after(async () => {
    try {
      await db.insert(invitationViews).values({
        invitationId: inv.id,
        visitorId: (ip ?? "anon").slice(0, 100),
        ipAddress: ip?.slice(0, 64) ?? null,
        userAgent: ua?.slice(0, 500) ?? null,
        referrer: h.get("referer")?.slice(0, 500) ?? null,
      });
      await db
        .update(invitations)
        .set({ viewCount: sql`${invitations.viewCount} + 1` })
        .where(eq(invitations.id, inv.id));
      if (guest) await markGuestOpened(guest.id);
    } catch {
      /* noop */
    }
  });

  return (
    <>
      <InvitationCover
        names={
          (inv.sections.find((s) => s.type === "hero")?.props
            ?.couple_names as string) ?? inv.eventTitle ?? "Undangan"
        }
        guestName={guestName}
        global={inv.global}
      />
      <InvitationRenderer
        sections={inv.sections}
        global={inv.global}
        invitationId={inv.id}
        guestName={guestName}
      />
      {inv.hasWatermark ? (
        <p className="bg-white py-4 text-center text-xs text-gray-400">
          Dibuat dengan Ngaturi · buat undanganmu di ngaturi.com
        </p>
      ) : null}
    </>
  );
}
