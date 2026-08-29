import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export function Logo({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 font-display text-xl text-ink",
        className,
      )}
    >
      <span className="grid h-7 w-7 place-items-center rounded-full bg-forest text-cream text-sm">
        N
      </span>
      Ngaturi
    </Link>
  );
}
