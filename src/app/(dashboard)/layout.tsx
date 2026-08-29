import Link from "next/link";
import { requireUser } from "@/lib/auth/helpers";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

const NAV = [
  { href: "/dashboard", label: "Ringkasan" },
  { href: "/invitations", label: "Undangan" },
  { href: "/media", label: "Media" },
  { href: "/billing", label: "Tagihan" },
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
      <aside className="hidden w-56 shrink-0 flex-col border-r border-zinc-200 p-4 md:flex">
        <span className="px-2 text-lg font-semibold">Ngaturi</span>
        <nav className="mt-6 flex flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-2 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-3">
          <span className="text-sm text-zinc-500">
            {session.user.name} · {session.user.email}
          </span>
          <SignOutButton />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
