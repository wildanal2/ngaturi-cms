"use client";

import { useEffect, useState } from "react";
import type { SectionRenderProps } from "./types";
import { SectionShell, SectionTitle } from "./shared";

function diff(target: number) {
  const ms = Math.max(0, target - Date.now());
  return {
    d: Math.floor(ms / 86_400_000),
    h: Math.floor((ms / 3_600_000) % 24),
    m: Math.floor((ms / 60_000) % 60),
    s: Math.floor((ms / 1000) % 60),
    done: ms === 0,
  };
}

export function CountdownMinimal({ props }: SectionRenderProps) {
  const p = props as { target_date?: string; message_expired?: string };
  const target = p.target_date ? new Date(p.target_date).getTime() : 0;
  const [t, setT] = useState<ReturnType<typeof diff> | null>(null);

  useEffect(() => {
    const tick = () => setT(diff(target || Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!t) {
    return (
      <SectionShell>
        <SectionTitle>Menghitung Hari</SectionTitle>
        <div className="h-24" />
      </SectionShell>
    );
  }

  return (
    <SectionShell>
      <SectionTitle>Menghitung Hari</SectionTitle>
      {t.done ? (
        <p className="text-center text-[var(--inv-ink)]">
          {p.message_expired ?? "Acara telah berlangsung"}
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-3 text-center">
          {(
            [
              ["Hari", t.d],
              ["Jam", t.h],
              ["Menit", t.m],
              ["Detik", t.s],
            ] as const
          ).map(([label, val]) => (
            <div
              key={label}
              className="rounded-xl border border-[color-mix(in_srgb,var(--inv-primary)_20%,transparent)] bg-[var(--inv-bg)] py-4"
            >
              <div className="font-[family-name:var(--inv-font)] text-3xl text-[var(--inv-primary)]">
                {String(val).padStart(2, "0")}
              </div>
              <div className="text-xs tracking-wide text-[var(--inv-ink)] uppercase">
                {label}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
}
