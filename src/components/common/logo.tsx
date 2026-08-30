import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";

export function Logo({
  className,
  href = "/",
  variant = "full",
}: {
  className?: string;
  href?: string;
  variant?: "full" | "icon";
}) {
  return (
    <Link
      href={href}
      aria-label="Ngaturi"
      className={cn("inline-flex items-center gap-2", className)}
    >
      <Image
        src="/logo/logo-icon.png"
        alt=""
        width={28}
        height={30}
        className="h-7 w-auto"
        priority
      />
      {variant === "full" ? (
        <span className="font-display text-xl text-ink">Ngaturi</span>
      ) : null}
    </Link>
  );
}
