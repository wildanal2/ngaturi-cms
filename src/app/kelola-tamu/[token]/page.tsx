import type { Metadata } from "next";
import { DelegateManager } from "@/components/delegate/delegate-manager";
import { fetchDelegateView } from "@/lib/invitation/delegation-actions";
import { DELEGATE_FAILURE_COPY } from "@/lib/invitation/delegation-format";

// Bearer-token URL: never cached, indexed or leaked through Referer.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Kelola Tamu",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function DelegatePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await fetchDelegateView(token);
  if (!result.ok) {
    const copy = DELEGATE_FAILURE_COPY[result.reason];
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 px-4 py-10 text-center">
        <h1 className="text-2xl">{copy.title}</h1>
        <p role="alert" className="text-sm text-ink-soft">
          {copy.body}
        </p>
      </main>
    );
  }
  return <DelegateManager initial={result.view} />;
}
