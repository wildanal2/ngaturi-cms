import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, type Session } from "./config";

/** Ambil sesi saat ini (atau null) di Server Component / Route Handler. */
export async function getSession(): Promise<Session | null> {
  return auth.api.getSession({ headers: await headers() });
}

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
