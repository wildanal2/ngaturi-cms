import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { setUserRole, setUserStatus } from "@/lib/admin/actions";

export default async function AdminUsers() {
  const rows = await db
    .select()
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(200);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl">Pengguna</h1>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-cream-200 text-left text-ink-soft">
            <tr>
              <th className="px-3 py-2">Nama</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-line">
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2 text-ink-soft">{u.email}</td>
                <td className="px-3 py-2">
                  <form
                    action={setUserRole.bind(
                      null,
                      u.id,
                      u.role === "admin" ? "user" : "admin",
                    )}
                  >
                    <button className="rounded-full border border-line px-2.5 py-1 text-xs">
                      {u.role} ↔
                    </button>
                  </form>
                </td>
                <td className="px-3 py-2">
                  <form
                    action={setUserStatus.bind(
                      null,
                      u.id,
                      u.status === "active" ? "suspended" : "active",
                    )}
                  >
                    <button className="rounded-full border border-line px-2.5 py-1 text-xs">
                      {u.status} ↔
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
