import { cache } from "react";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { auth, type Session } from "./config";

/**
 * Ambil sesi saat ini (atau null). `cache()` men-dedup panggilan dalam satu
 * request — layout + page + komponen lain hanya memverifikasi cookie sekali.
 */
export const getSession = cache(
  async function getSession(): Promise<Session | null> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return null;

    // Better Auth may serve a short-lived signed cookie cache. Re-read the
    // account state so suspension, soft deletion, or a deleted row takes effect
    // immediately for every authoritative server operation.
    const [account] = await getDb()
      .select({ status: users.status })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    return account?.status === "active" ? session : null;
  },
);

/** Wajib login — redirect ke /login kalau belum. */
export async function requireUser(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Wajib admin — redirect ke /invitations kalau bukan admin. */
export async function requireAdmin(): Promise<Session> {
  const session = await requireUser();
  const role = (session.user as { role?: string }).role;
  if (role !== "admin") redirect("/invitations");
  return session;
}
