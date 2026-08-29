import Link from "next/link";
import { requireUser } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function DashboardPage() {
  const session = await requireUser();
  const mine = await db
    .select()
    .from(invitations)
    .where(eq(invitations.userId, session.user.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Halo, {session.user.name} 👋</h1>
        <Link
          href="/invitations/new"
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Buat undangan
        </Link>
      </div>

      {mine.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500">
          Belum ada undangan. Mulai dari template gratis — kamu punya 1 undangan
          gratis (masa edit 7 hari).
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mine.map((inv) => (
            <li
              key={inv.id}
              className="rounded-lg border border-zinc-200 p-4 text-sm"
            >
              <p className="font-medium">{inv.eventTitle ?? inv.slug}</p>
              <p className="text-zinc-500">
                {inv.status} · {inv.plan}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
