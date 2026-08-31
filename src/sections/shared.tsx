import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import {
  Divider,
  DividerImage,
  Floating17Ornaments,
  FloatingLeaves,
  FloatingLeavesImage,
} from "./ornaments";

/** Common theme-decoration props that any section can accept via its props bag. */
export type ThemeDecor = {
  background_image?: string;
  ornament_tr_images?: string[];
  ornament_bl_images?: string[];
  ornament_variant?: "floating17";
  divider_image?: string;
  section_icon?: string;
  save_the_date_image?: string;
};

/** Extract ThemeDecor fields from an arbitrary props record. */
export function pickDecor(props: Record<string, unknown>): ThemeDecor {
  return {
    background_image: props.background_image as string | undefined,
    ornament_tr_images: props.ornament_tr_images as string[] | undefined,
    ornament_bl_images: props.ornament_bl_images as string[] | undefined,
    ornament_variant: props.ornament_variant as "floating17" | undefined,
    divider_image: props.divider_image as string | undefined,
    section_icon: props.section_icon as string | undefined,
    save_the_date_image: props.save_the_date_image as string | undefined,
  };
}

/** Background and body typography from a decor bag. */
export function decorBgStyle(d: ThemeDecor): React.CSSProperties | undefined {
  if (!d.background_image && d.ornament_variant !== "floating17") return undefined;
  return {
    ...(d.background_image
      ? {
          backgroundImage: `url('${d.background_image}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : {}),
    ...(d.ornament_variant === "floating17"
      ? { fontFamily: "var(--font-philosopher), Georgia, serif" }
      : {}),
  };
}

/** Render the right ornament component: image layers when supplied, SVG otherwise. */
export function DecorOrnaments({ d }: { d: ThemeDecor }) {
  const hasImages = d.ornament_tr_images?.length && d.ornament_bl_images?.length;
  if (hasImages && d.ornament_variant === "floating17") {
    return (
      <Floating17Ornaments
        trImages={d.ornament_tr_images!}
        blImages={d.ornament_bl_images!}
      />
    );
  }
  if (hasImages)
    return (
      <FloatingLeavesImage
        trImages={d.ornament_tr_images!}
        blImages={d.ornament_bl_images!}
      />
    );
  return <FloatingLeaves />;
}

/** Render divider: image when supplied, SVG otherwise. */
export function DecorDivider({
  d,
  className,
}: {
  d: ThemeDecor;
  className?: string;
}) {
  if (d.divider_image)
    return (
      <DividerImage
        src={d.divider_image}
        className={className ?? "mx-auto mt-3 h-4 w-16 object-contain opacity-70"}
      />
    );
  return (
    <Divider
      className={
        className ??
        "mx-auto mt-3 h-4 w-32 text-[var(--inv-secondary)] opacity-70"
      }
    />
  );
}

export function DecoratedSectionShell({
  children,
  d,
  className,
  muted,
}: {
  children: ReactNode;
  d: ThemeDecor;
  className?: string;
  muted?: boolean;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden px-6 py-16",
        muted && !d.background_image
          ? "bg-[color-mix(in_srgb,var(--inv-primary)_6%,transparent)]"
          : "",
        className,
      )}
      style={decorBgStyle(d)}
    >
      <DecorOrnaments d={d} />
      <div className="relative mx-auto max-w-xl">{children}</div>
    </section>
  );
}

export function SectionShell({
  children,
  className,
  muted,
}: {
  children: ReactNode;
  className?: string;
  muted?: boolean;
}) {
  return (
    <section
      className={cn(
        "px-6 py-16",
        muted ? "bg-[color-mix(in_srgb,var(--inv-primary)_6%,transparent)]" : "",
        className,
      )}
    >
      <div className="mx-auto max-w-xl">{children}</div>
    </section>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col items-center gap-2">
      <h2 className="text-center font-[family-name:var(--inv-font)] text-2xl text-[var(--inv-primary)]">
        {children}
      </h2>
      <Divider className="inv-ornament inv-ornament--drift h-4 w-40 text-[var(--inv-secondary)] opacity-70" />
    </div>
  );
}

/** Eyebrow (small uppercase) + serif title + leaf divider. */
export function SectionHeader({
  eyebrow,
  title,
}: {
  eyebrow?: string;
  title?: string;
}) {
  if (!eyebrow && !title) return null;
  return (
    <div className="mb-8 flex flex-col items-center gap-2 text-center">
      {eyebrow ? (
        <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--inv-secondary)]">
          {eyebrow}
        </p>
      ) : null}
      {title ? (
        <h2 className="font-[family-name:var(--inv-font)] text-2xl text-[var(--inv-primary)]">
          {title}
        </h2>
      ) : null}
      <Divider className="inv-ornament inv-ornament--drift h-4 w-40 text-[var(--inv-secondary)] opacity-70" />
    </div>
  );
}

export function formatEventDate(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatTimeRange(start?: string, end?: string): string {
  if (!start) return "";
  return end ? `${start} – ${end} WIB` : `${start} WIB`;
}
