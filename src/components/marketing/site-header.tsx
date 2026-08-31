import Link from "next/link";
import { Logo } from "@/components/common/logo";
import { HeaderAuth } from "./header-auth";

export function SiteHeader() {
  return (
    <header className="border-b border-line/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm text-ink-soft sm:flex">
          <Link href="/templates" className="hover:text-ink">
            Template
          </Link>
          <Link href="/pricing" className="hover:text-ink">
            Harga
          </Link>
          <Link href="/undangan-terbaru" className="hover:text-ink">
            Pengguna mencoba
          </Link>
        </nav>
        <HeaderAuth />
      </div>
    </header>
  );
}
