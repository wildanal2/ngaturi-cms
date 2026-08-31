import Image from "next/image";
import type { SectionRenderProps } from "../types";
import { SectionShell, SectionTitle } from "../shared";
import styles from "./gallery.module.css";

/** Horizontal snap carousel. */
export function GalleryCarousel({ props }: SectionRenderProps) {
  const p = props as { images?: Array<{ url: string; caption?: string }> };
  return (
    <SectionShell muted>
      <SectionTitle>Galeri</SectionTitle>
      <div className={styles.carousel}>
        {(p.images ?? []).map((img, i) => (
          <Image
            key={i}
            src={img.url}
            alt={img.caption ?? ""}
            width={400}
            height={500}
            className="aspect-[4/5] rounded-xl object-cover"
          />
        ))}
      </div>
    </SectionShell>
  );
}
