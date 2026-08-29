import { Logo } from "@/components/common/logo";
import { ButtonLink } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="border-b border-line/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm text-ink-soft sm:flex">
          <a href="/templates" className="hover:text-ink">
            Template
          </a>
          <a href="/pricing" className="hover:text-ink">
            Harga
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <ButtonLink href="/login" variant="ghost" size="sm">
            Masuk
          </ButtonLink>
          <ButtonLink href="/login" size="sm">
            Buat undangan
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
