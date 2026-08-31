import Image from "next/image";
import type { SectionRenderProps } from "../types";
import { SectionShell, SectionTitle } from "../shared";
import styles from "./gallery.module.css";

/** Masonry via CSS columns — variable photo heights. */
export function GalleryMasonry({ props }: SectionRenderProps) {
  const p = props as {
    images?: Array<{ url: string; caption?: string }>;
    columns?: number;
  };
  return (
    <SectionShell>
      <SectionTitle>Galeri</SectionTitle>
      <div className={styles.masonry} style={{ columnCount: p.columns ?? 3 }}>
        {(p.images ?? []).map((img, i) => (
          <Image
            key={i}
            src={img.url}
            alt={img.caption ?? ""}
            width={400}
            height={0}
            style={{ height: "auto" }}
            className="w-full rounded-lg object-cover"
          />
        ))}
      </div>
    </SectionShell>
  );
}
