import type { SectionRenderProps } from "../types";

export function ClosingSimple({ props }: SectionRenderProps) {
  const p = props as { message?: string; names?: string };
  return (
    <section className="bg-[var(--inv-primary)] px-6 py-20 text-center text-white">
      <p className="mx-auto max-w-md leading-relaxed">
        {p.message ??
          "Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu."}
      </p>
      <p className="mt-8 text-sm tracking-widest uppercase opacity-80">
        Kami yang berbahagia
      </p>
      <p className="mt-2 font-[family-name:var(--inv-font)] text-2xl">
        {p.names ?? "Dinda & Raka"}
      </p>
    </section>
  );
}
