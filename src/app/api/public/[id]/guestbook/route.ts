import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invitations, guestbookMessages } from "@/lib/db/schema";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const rows = await db
    .select({
      id: guestbookMessages.id,
      name: guestbookMessages.name,
      message: guestbookMessages.message,
      createdAt: guestbookMessages.createdAt,
    })
    .from(guestbookMessages)
    .where(
      and(
        eq(guestbookMessages.invitationId, id),
        eq(guestbookMessages.status, "approved"),
      ),
    )
    .orderBy(desc(guestbookMessages.createdAt))
    .limit(100);
  return NextResponse.json({ messages: rows });
}

const Body = z.object({
  _hp: z.string().optional(),
  "cf-turnstile-response": z.string().optional(),
  name: z.string().min(1).max(120),
  message: z.string().min(1).max(1000),
});

const LINK_RE = /(https?:\/\/|www\.)/i;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";

  if (!(await rateLimit(`gb:${ip}`, 5, 60))) {
    return NextResponse.json({ error: "Terlalu banyak percobaan." }, { status: 429 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }
  if (parsed.data._hp) return NextResponse.json({ ok: true, pending: true });

  if (!(await verifyTurnstile(parsed.data["cf-turnstile-response"], ip))) {
    return NextResponse.json(
      { error: "Verifikasi keamanan gagal." },
      { status: 400 },
    );
  }

  const [inv] = await db
    .select({
      status: invitations.status,
      settings: invitations.globalSettings,
      sections: invitations.sections,
    })
    .from(invitations)
    .where(eq(invitations.id, id))
    .limit(1);
  if (!inv || inv.status !== "published") {
    return NextResponse.json({ error: "Undangan tidak aktif." }, { status: 404 });
  }

  const gbSection = (inv.sections as Array<{ type: string; props?: Record<string, unknown> }>).find(
    (s) => s.type === "guestbook",
  );
  const requireApproval = gbSection?.props?.require_approval !== false;
  const looksSpammy = LINK_RE.test(parsed.data.message);
  const status = looksSpammy ? "spam" : requireApproval ? "pending" : "approved";

  const [row] = await db
    .insert(guestbookMessages)
    .values({
      invitationId: id,
      name: parsed.data.name,
      message: parsed.data.message,
      status,
      ipAddress: ip.slice(0, 64),
    })
    .returning({
      id: guestbookMessages.id,
      name: guestbookMessages.name,
      message: guestbookMessages.message,
      createdAt: guestbookMessages.createdAt,
    });

  return NextResponse.json({
    ok: true,
    pending: status !== "approved",
    message: status === "approved" ? row : undefined,
  });
}
