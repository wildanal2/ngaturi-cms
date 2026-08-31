import Image from "next/image";
import type { SectionRenderProps } from "../types";

export function ClosingPhoto({ props }: SectionRenderProps) {
  const p = props as { message?: string; names?: string; photo?: string };
  return (
    <section className="relative px-6 py-24 text-center text-white">
      {p.photo ? (
        <Image src={p.photo} alt="" fill className="object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[var(--inv-secondary)]" />
      )}
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative mx-auto max-w-md">
        <p className="leading-relaxed">
          {p.message ?? "Terima kasih atas doa dan restunya."}
        </p>
        <p className="mt-6 font-[family-name:var(--inv-font)] text-3xl">
          {p.names ?? "Dinda & Raka"}
        </p>
      </div>
    </section>
  );
}
