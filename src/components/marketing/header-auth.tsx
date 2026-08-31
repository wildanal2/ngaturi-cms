"use client";

import { ButtonLink } from "@/components/ui/button";
import { useSession } from "@/lib/auth/client";

/**
 * Auth-aware CTA cluster for the marketing header. Kept as a client island
 * so the surrounding pages stay static / ISR.
 */
export function HeaderAuth() {
  const { data, isPending } = useSession();

  if (!isPending && data?.user) {
    return (
      <div className="flex items-center gap-2">
        <ButtonLink href="/invitations" variant="ghost" size="sm">
          Undangan saya
        </ButtonLink>
        <ButtonLink href="/invitations/new" size="sm">
          Buat undangan
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <ButtonLink href="/login" variant="ghost" size="sm">
        Masuk
      </ButtonLink>
      <ButtonLink href="/login" size="sm">
        Buat undangan
      </ButtonLink>
    </div>
  );
}
