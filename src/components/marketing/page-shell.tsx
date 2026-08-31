import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

/** Consistent marketing page frame: header + centred 6xl main + footer. */
export function MarketingPage({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-14 sm:px-8 sm:py-20">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}

/** Page title + subtitle with one shared rhythm. */
export function PageHeading({
  title,
  description,
  center,
}: {
  title: string;
  description?: string;
  center?: boolean;
}) {
  return (
    <div className={center ? "text-center" : "max-w-2xl"}>
      <h1 className="text-3xl sm:text-4xl">{title}</h1>
      {description ? (
        <p
          className={`mt-3 text-ink-soft ${center ? "mx-auto max-w-xl" : ""}`}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
