import Link from "next/link";
import { requireUser } from "@/lib/auth/helpers";
import { Logo } from "@/components/common/logo";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

const NAV = [
  { href: "/dashboard", label: "Ringkasan" },
  { href: "/invitations", label: "Undangan" },
  { href: "/invitations/new", label: "Buat baru" },
  { href: "/media", label: "Media" },
  { href: "/settings", label: "Pengaturan" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireUser();

  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-paper/60 p-5 md:flex">
        <Logo href="/dashboard" />
        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm text-ink-soft transition-colors hover:bg-cream-200 hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
          {(session.user as { role?: string }).role === "admin" ? (
            <Link
              href="/admin"
              className="rounded-lg px-3 py-2 text-sm text-wine hover:bg-cream-200"
            >
              Admin
            </Link>
          ) : null}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line px-6 py-3">
          <span className="truncate text-sm text-muted">
            {session.user.name}
            <span className="mx-2 text-line">·</span>
            {session.user.email}
          </span>
          <SignOutButton />
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 p-6 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
