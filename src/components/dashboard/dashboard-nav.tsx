"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Images, Mail, Settings, ShieldCheck } from "lucide-react";
import type { ComponentType } from "react";

const NAV: { href: string; label: string; icon: ComponentType<{ size?: number }> }[] = [
  { href: "/invitations", label: "Undangan", icon: Mail },
  { href: "/media", label: "Media", icon: Images },
  { href: "/settings", label: "Pengaturan", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

/** `sidebar` = desktop vertical list, `bar` = mobile horizontal scroll bar. */
export function DashboardNav({
  isAdmin,
  variant,
}: {
  isAdmin: boolean;
  variant: "sidebar" | "bar";
}) {
  const pathname = usePathname();
  const items = isAdmin
    ? [...NAV, { href: "/admin", label: "Admin", icon: ShieldCheck }]
    : NAV;

  if (variant === "bar") {
    return (
      <nav className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2 md:hidden">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${
                active ? "bg-forest text-cream" : "text-ink-soft hover:bg-cream-200"
              }`}
            >
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="mt-8 flex flex-col gap-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-forest/10 font-medium text-forest"
                : "text-ink-soft hover:bg-cream-200 hover:text-ink"
            }`}
          >
            <Icon size={16} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
