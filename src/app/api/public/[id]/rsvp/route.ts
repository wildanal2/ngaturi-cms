import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invitations, rsvpResponses } from "@/lib/db/schema";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { isInvitationPubliclyActive } from "@/lib/invitation/visibility";
import { authorizeGuest } from "@/lib/invitation/guest-authorization";
import { trustedClientIp } from "@/lib/security/request-metadata";

const Body = z.object({
  guest_token: z.string().min(1).max(40).optional(),
  _hp: z.string().optional(),
  "cf-turnstile-response": z.string().optional(),
  name: z.string().trim().min(1).max(255),
  phone: z.string().max(40).optional().or(z.literal("")),
  status: z.enum(["attending", "not_attending", "maybe"]),
  guest_count: z.coerce.number().int().min(1).max(20).default(1),
  message: z.string().max(1000).optional().or(z.literal("")),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success)
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  const h = await headers();
  const ip = trustedClientIp(h) ?? "unknown";

  if (!(await rateLimit(`rsvp:${ip}`, 5, 60))) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan." },
      { status: 429 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }
  // Honeypot — diam-diam sukses.
  if (parsed.data._hp) return NextResponse.json({ ok: true });

  if (!(await verifyTurnstile(parsed.data["cf-turnstile-response"], ip))) {
    return NextResponse.json(
      { error: "Verifikasi keamanan gagal. Muat ulang halaman." },
      { status: 400 },
    );
  }

  const [inv] = await db
    .select({
      id: invitations.id,
      status: invitations.status,
      expiresAt: invitations.expiresAt,
    })
    .from(invitations)
    .where(eq(invitations.id, id))
    .limit(1);
  if (!inv || !isInvitationPubliclyActive(inv)) {
    return NextResponse.json(
      { error: "Undangan tidak aktif." },
      { status: 404 },
    );
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Lock the guest row so concurrent submissions cannot bypass one RSVP.
      const guest = await authorizeGuest(
        id,
        parsed.data.guest_token,
        parsed.data.name,
        tx,
        true,
      );
      if (!guest) return 403;
      if (parsed.data.guest_count > guest.maxGuests) return 400;
      const [existing] = await tx
        .select({ id: rsvpResponses.id })
        .from(rsvpResponses)
        .where(
          and(
            eq(rsvpResponses.invitationId, id),
            eq(rsvpResponses.guestInviteId, guest.id),
          ),
        )
        .limit(1);
      if (existing) return 409;
      await tx.insert(rsvpResponses).values({
        invitationId: id,
        guestInviteId: guest.id,
        name: guest.guestName,
        phone: parsed.data.phone || null,
        status: parsed.data.status,
        guestCount: parsed.data.guest_count,
        message: parsed.data.message || null,
        ipAddress: ip.slice(0, 64),
        userAgent: h.get("user-agent")?.slice(0, 500) ?? null,
      });
      return 200;
    });
    if (result !== 200)
      return NextResponse.json(
        {
          error:
            result === 409
              ? "RSVP sudah dikirim dan tidak dapat diubah."
              : result === 403
                ? "Gunakan link undangan personal dengan nama tamu yang sesuai."
                : "Jumlah tamu melebihi batas undangan.",
        },
        { status: result },
      );
  } catch {
    return NextResponse.json(
      { error: "Kamu sudah pernah mengisi RSVP dengan nomor ini." },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}
