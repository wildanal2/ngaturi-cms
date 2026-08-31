import Image from "next/image";
import styles from "./couple.module.css";

export type Person = {
  name?: string;
  full_name?: string;
  bio?: string;
  photo?: string;
  parents?: string;
  child_order?: string;
  residence?: string;
  instagram?: string;
};

const SHAPE_CLASS: Record<string, string> = {
  circle: "rounded-full",
  rounded: "rounded-2xl",
  arch: "rounded-[50%_50%_1rem_1rem/60%_60%_1rem_1rem]",
};

export function PersonCard({
  person,
  shape = "circle",
}: {
  person: Person;
  shape?: string;
}) {
  const sc = SHAPE_CLASS[shape] ?? SHAPE_CLASS.circle;
  return (
    <div className="text-center">
      {person.photo ? (
        <Image
          src={person.photo}
          alt={person.name ?? ""}
          width={180}
          height={180}
          className={`mx-auto h-44 w-44 object-cover ${sc}`}
        />
      ) : (
        <div
          className={`mx-auto h-44 w-44 bg-[color-mix(in_srgb,var(--inv-primary)_12%,transparent)] ${sc}`}
        />
      )}
      <h3 className="mt-4 font-[family-name:var(--inv-font)] text-2xl text-[var(--inv-primary)]">
        {person.full_name || person.name}
      </h3>
      {person.child_order ? (
        <p className="mt-1 text-sm text-[var(--inv-ink)]">{person.child_order}</p>
      ) : null}
      {person.parents ? (
        <p className="mt-1 text-sm text-[var(--inv-ink)]">
          Putra/Putri dari {person.parents}
        </p>
      ) : null}
    </div>
  );
}

export function PolaroidCard({
  person,
  tilt,
}: {
  person: Person;
  tilt: "L" | "R";
}) {
  return (
    <div className={`${styles.polaroid} ${tilt === "L" ? styles.tiltL : styles.tiltR}`}>
      {person.photo ? (
        <Image
          src={person.photo}
          alt={person.name ?? ""}
          width={220}
          height={220}
          className="h-52 w-52 object-cover"
        />
      ) : (
        <div className="h-52 w-52 bg-[color-mix(in_srgb,var(--inv-primary)_12%,transparent)]" />
      )}
      <p className="mt-3 text-center font-[family-name:var(--inv-font)] text-xl text-[var(--inv-primary)]">
        {person.full_name || person.name}
      </p>
    </div>
  );
}
