import type { z } from "zod";
import type { CoupleIntroProps } from "../schema";
import type { SectionRenderProps } from "../types";
import { Portrait, SceneBody } from "../cinematic/primitives";
import styles from "../cinematic/cinematic.module.css";

/** Dua portrait berlapis dengan detail mempelai dari Inspector. */
export function CoupleCinematicVintage({ props }: SectionRenderProps) {
  const p = props as Partial<z.infer<typeof CoupleIntroProps>>;
  return (
    <SceneBody className={styles.coupleScene}>
      <p className={styles.eyebrow}>Dua hati, satu perjalanan</p>
      <h2>{p.title ?? "Mempelai"}</h2>
      <div className={styles.coupleGrid}>
        {[p.bride, p.groom].map((person, i) => (
          <div key={i} data-couple-person={i}>
            <Portrait
              src={person?.photo}
              alt={person?.full_name ?? person?.name ?? ""}
            />
            <h3>{person?.full_name ?? person?.name ?? "Nama Mempelai"}</h3>
            <p>{person?.child_order}</p>
            <p>{person?.parents}</p>
            <p>{person?.residence}</p>
            {person?.instagram ? (
              <a
                className="inline-block p-2 underline"
                href={`https://www.instagram.com/${encodeURIComponent(person.instagram.replace(/^@/, ""))}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                @{person.instagram}
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </SceneBody>
  );
}
