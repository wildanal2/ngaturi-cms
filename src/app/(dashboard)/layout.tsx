import { requireUser } from "@/lib/auth/helpers";
import { Logo } from "@/components/common/logo";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireUser();
  const isAdmin = (session.user as { role?: string }).role === "admin";

  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-paper/60 p-5 md:flex">
        <Logo href="/invitations" />
        <DashboardNav isAdmin={isAdmin} variant="sidebar" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-6">
          <Logo href="/invitations" className="md:hidden" />
          <span className="hidden truncate text-sm text-muted sm:inline">
            {session.user.name}
            <span className="mx-2 text-line">·</span>
            {session.user.email}
          </span>
          <SignOutButton />
        </header>

        {/* mobile nav lives under the header */}
        <DashboardNav isAdmin={isAdmin} variant="bar" />

        <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
