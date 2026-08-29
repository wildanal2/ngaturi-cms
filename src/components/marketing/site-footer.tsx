import Link from "next/link";
import { Logo } from "@/components/common/logo";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line/70 bg-cream-200/50">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <Logo />
        <p>© {new Date().getFullYear()} Ngaturi. Undangan digital Indonesia.</p>
        <div className="flex gap-5">
          <Link href="/legal/privacy" className="hover:text-ink">
            Privasi
          </Link>
          <Link href="/legal/terms" className="hover:text-ink">
            Ketentuan
          </Link>
        </div>
      </div>
    </footer>
  );
}
