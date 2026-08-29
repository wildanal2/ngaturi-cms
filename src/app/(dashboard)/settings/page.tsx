import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";

async function saveProfile(formData: FormData) {
  "use server";
  const session = await requireUser();
  const phone = String(formData.get("phone") ?? "").slice(0, 50);
  await db
    .insert(userProfiles)
    .values({ userId: session.user.id, phone })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: { phone, updatedAt: new Date() },
    });
  revalidatePath("/settings");
}

export default async function SettingsPage() {
  const session = await requireUser();
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, session.user.id))
    .limit(1);

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl">Pengaturan</h1>

      <div className="rounded-xl border border-line bg-paper p-5">
        <p className="text-sm text-ink-soft">Masuk sebagai</p>
        <p className="font-medium">{session.user.name}</p>
        <p className="text-sm text-muted">{session.user.email}</p>
      </div>

      <form
        action={saveProfile}
        className="space-y-3 rounded-xl border border-line bg-paper p-5"
      >
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Nomor WhatsApp</span>
          <input
            name="phone"
            defaultValue={profile?.phone ?? ""}
            placeholder="0812xxxxxxxx"
            className="w-full rounded-lg border border-line px-3 py-2 text-sm"
          />
        </label>
        <button className="rounded-full bg-forest px-4 py-2 text-sm font-medium text-cream">
          Simpan
        </button>
      </form>
    </div>
  );
}
