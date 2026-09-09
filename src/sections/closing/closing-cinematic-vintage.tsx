import type { SectionRenderProps } from "../types";
import { HeritageFrame, Portrait, SceneBody } from "../cinematic/primitives";
import styles from "../cinematic/cinematic.module.css";

/** Kamera kembali ke portrait pasangan dan mundur ke bingkai akhir. */
export function ClosingCinematicVintage({ props }: SectionRenderProps) {
  const p = props as { names?: string; message?: string; photo?: string };
  return (
    <SceneBody className={styles.closingScene}>
      <HeritageFrame className={styles.closingFrame}>
        <Portrait src={p.photo} />
        <p className={styles.eyebrow}>Dengan segenap cinta</p>
        <h2>{p.names ?? "Nama Mempelai"}</h2>
        <p className="mt-4">
          {p.message ?? "Terima kasih atas doa dan restu Anda."}
        </p>
      </HeritageFrame>
    </SceneBody>
  );
}
