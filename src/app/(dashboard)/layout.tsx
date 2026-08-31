import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import { accountTier } from "@/lib/invitation/entitlement";
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

  const invs = await db
    .select({
      plan: invitations.plan,
      isPaid: invitations.isPaid,
      editExpiresAt: invitations.editExpiresAt,
      isEditLocked: invitations.isEditLocked,
    })
    .from(invitations)
    .where(eq(invitations.userId, session.user.id));
  const { tier, trialDaysLeft } = accountTier(invs);

  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-paper/60 p-5 md:flex">
        <Logo href="/invitations" />
        <DashboardNav isAdmin={isAdmin} variant="sidebar" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Logo href="/invitations" className="md:hidden" />
            <span className="hidden truncate text-sm text-muted sm:inline">
              {session.user.name}
              <span className="mx-2 text-line">·</span>
              {session.user.email}
            </span>
            <TierBadge tier={tier} daysLeft={trialDaysLeft} />
          </div>
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

function TierBadge({
  tier,
  daysLeft,
}: {
  tier: "premium" | "trial" | "free";
  daysLeft: number | null;
}) {
  if (tier === "free") return null;
  if (tier === "premium") {
    return (
      <span className="shrink-0 rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-semibold text-gold">
        ✦ Premium
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-forest/10 px-2.5 py-0.5 text-xs font-semibold text-forest">
      Pro · masa coba
      {daysLeft != null
        ? ` · ${daysLeft === 0 ? "hari terakhir" : `sisa ${daysLeft} hari`}`
        : ""}
    </span>
  );
}
