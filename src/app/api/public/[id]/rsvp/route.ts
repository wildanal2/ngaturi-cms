import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invitations, rsvpResponses } from "@/lib/db/schema";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

const Body = z.object({
  _hp: z.string().optional(),
  "cf-turnstile-response": z.string().optional(),
  name: z.string().min(1).max(120),
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
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";

  if (!(await rateLimit(`rsvp:${ip}`, 5, 60))) {
    return NextResponse.json({ error: "Terlalu banyak percobaan." }, { status: 429 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }
  // Honeypot — diam-diam sukses.
  if (parsed.data._hp) return NextResponse.json({ ok: true });

  if (
    !(await verifyTurnstile(parsed.data["cf-turnstile-response"], ip))
  ) {
    return NextResponse.json(
      { error: "Verifikasi keamanan gagal. Muat ulang halaman." },
      { status: 400 },
    );
  }

  const [inv] = await db
    .select({ id: invitations.id, status: invitations.status })
    .from(invitations)
    .where(eq(invitations.id, id))
    .limit(1);
  if (!inv || inv.status !== "published") {
    return NextResponse.json({ error: "Undangan tidak aktif." }, { status: 404 });
  }

  try {
    await db.insert(rsvpResponses).values({
      invitationId: id,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      status: parsed.data.status,
      guestCount: parsed.data.guest_count,
      message: parsed.data.message || null,
      ipAddress: ip.slice(0, 64),
      userAgent: h.get("user-agent")?.slice(0, 500) ?? null,
    });
  } catch {
    return NextResponse.json(
      { error: "Kamu sudah pernah mengisi RSVP dengan nomor ini." },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}
