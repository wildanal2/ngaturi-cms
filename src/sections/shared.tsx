import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function SectionShell({
  children,
  className,
  muted,
}: {
  children: ReactNode;
  className?: string;
  muted?: boolean;
}) {
  return (
    <section
      className={cn(
        "px-6 py-16",
        muted ? "bg-[color-mix(in_srgb,var(--inv-primary)_6%,transparent)]" : "",
        className,
      )}
    >
      <div className="mx-auto max-w-xl">{children}</div>
    </section>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-8 text-center font-[family-name:var(--inv-font)] text-2xl text-[var(--inv-primary)]">
      {children}
    </h2>
  );
}

export function formatEventDate(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatTimeRange(start?: string, end?: string): string {
  if (!start) return "";
  return end ? `${start} – ${end} WIB` : `${start} WIB`;
}
