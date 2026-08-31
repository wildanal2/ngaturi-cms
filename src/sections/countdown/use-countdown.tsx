"use client";

import { useEffect, useState } from "react";

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

export type Countdown = ReturnType<typeof diff>;

export function useCountdown(targetIso?: string): Countdown | null {
  const target = targetIso ? new Date(targetIso).getTime() : 0;
  const [t, setT] = useState<Countdown | null>(null);
  useEffect(() => {
    const tick = () => setT(diff(target || Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return t;
}

export const UNITS = [
  ["Hari", "d"],
  ["Jam", "h"],
  ["Menit", "m"],
  ["Detik", "s"],
] as const;

export function Expired({ msg }: { msg?: string }) {
  return (
    <p className="text-center text-[var(--inv-ink)]">
      {msg ?? "Acara telah berlangsung"}
    </p>
  );
}
