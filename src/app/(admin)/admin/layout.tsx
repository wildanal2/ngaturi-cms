import Link from "next/link";
import { requireAdmin } from "@/lib/auth/helpers";
import { Logo } from "@/components/common/logo";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

const NAV = [
  { href: "/admin", label: "Ringkasan" },
  { href: "/admin/templates", label: "Template" },
  { href: "/admin/users", label: "Pengguna" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-line bg-paper/60 p-5 md:flex">
        <Logo href="/admin" />
        <span className="mt-1 text-xs text-wine">Admin</span>
        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-cream-200 hover:text-ink"
            >
              {n.label}
            </Link>
          ))}
          <Link
            href="/dashboard"
            className="mt-4 rounded-lg px-3 py-2 text-sm text-muted hover:bg-cream-200"
          >
            ← Kembali ke dashboard
          </Link>
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-end border-b border-line px-6 py-3">
          <SignOutButton />
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 p-6 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
