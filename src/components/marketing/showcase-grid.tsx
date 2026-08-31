import Image from "next/image";
import Link from "next/link";
import type { ShowcaseItem } from "@/lib/invitation/showcase";

const EVENT_LABEL: Record<string, string> = {
  wedding: "Pernikahan",
  khitan: "Khitan",
  tahlil: "Tahlil",
  aqiqah: "Aqiqah",
  engagement: "Lamaran",
  birthday: "Ulang tahun",
  generic: "Acara",
};

export function ShowcaseGrid({ items }: { items: ShowcaseItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((r) => (
        <Link
          key={r.slug}
          href={`/${r.slug}`}
          className="group overflow-hidden rounded-2xl border border-line bg-paper"
        >
          <div className="relative aspect-[1200/630] w-full bg-cream-200">
            <Image
              src={r.image}
              alt={r.title}
              fill
              unoptimized
              className="object-contain transition-transform group-hover:scale-[1.03]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          </div>
          <div className="p-4">
            <p className="truncate text-sm font-medium">{r.title}</p>
            <p className="mt-0.5 text-xs text-muted">
              {EVENT_LABEL[r.eventType] ?? "Acara"}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
