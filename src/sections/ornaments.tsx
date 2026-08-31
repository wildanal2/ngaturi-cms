/**
 * Original decorative SVG ornaments — hand-authored for Ngaturi, not
 * copied from any third party. They inherit `currentColor` so sections
 * tint them via `--inv-primary` / `--inv-secondary`.
 */

/** Detailed eucalyptus corner spray (place at a corner, rotate/flip to taste). */
export function CornerFloral({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 260 260" className={className} aria-hidden fill="none">
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M6 6C70 14 128 46 168 104C196 144 214 190 222 240" />
        <path d="M6 6C14 70 46 128 104 168C144 196 190 214 240 222" />
        <path d="M6 6C56 30 98 62 130 104" />
        <path d="M40 8C58 40 60 78 46 118" />
        <path d="M8 40C40 58 78 60 118 46" />
      </g>
      <g fill="currentColor">
        <g opacity="0.9">
          <ellipse cx="52" cy="34" rx="16" ry="9" transform="rotate(-24 52 34)" />
          <ellipse cx="80" cy="52" rx="17" ry="9.5" transform="rotate(-14 80 52)" />
          <ellipse cx="106" cy="76" rx="18" ry="10" transform="rotate(-4 106 76)" />
          <ellipse cx="128" cy="104" rx="18" ry="10" transform="rotate(6 128 104)" />
          <ellipse cx="146" cy="136" rx="17" ry="9.5" transform="rotate(16 146 136)" />
          <ellipse cx="160" cy="170" rx="16" ry="9" transform="rotate(26 160 170)" />
          <ellipse cx="172" cy="206" rx="14" ry="8" transform="rotate(34 172 206)" />
        </g>
        <g opacity="0.72">
          <ellipse cx="34" cy="52" rx="15" ry="8.5" transform="rotate(-64 34 52)" />
          <ellipse cx="52" cy="80" rx="16" ry="9" transform="rotate(-74 52 80)" />
          <ellipse cx="76" cy="106" rx="16" ry="9" transform="rotate(-84 76 106)" />
          <ellipse cx="104" cy="128" rx="16" ry="9" transform="rotate(-94 104 128)" />
          <ellipse cx="136" cy="146" rx="15" ry="8.5" transform="rotate(-104 136 146)" />
          <ellipse cx="170" cy="160" rx="14" ry="8" transform="rotate(-114 170 160)" />
          <ellipse cx="206" cy="172" rx="12" ry="7" transform="rotate(-122 206 172)" />
        </g>
        <circle cx="22" cy="22" r="4" />
        <circle cx="36" cy="20" r="3" />
        <circle cx="20" cy="36" r="3" />
        <circle cx="8" cy="8" r="4.5" />
      </g>
    </svg>
  );
}

/* ---- eucalyptus corner spray (parametric, layered) ---- */

type Pt = [number, number];
const bez = (p0: Pt, p1: Pt, p2: Pt, t: number): Pt => {
  const u = 1 - t;
  return [
    u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
  ];
};

/** A single leafy stem: quadratic bezier with oval leaves alternating sides. */
function LeafBranch({
  p0,
  p1,
  p2,
  leaves = 9,
  leaf = 15,
  width = 2,
}: {
  p0: Pt;
  p1: Pt;
  p2: Pt;
  leaves?: number;
  leaf?: number;
  width?: number;
}) {
  const nodes = Array.from({ length: leaves }, (_, i) => {
    const t = (i + 1) / (leaves + 1);
    const [x, y] = bez(p0, p1, p2, t);
    const [ax, ay] = bez(p0, p1, p2, t + 0.001);
    const ang = (Math.atan2(ay - y, ax - x) * 180) / Math.PI;
    const side = i % 2 === 0 ? 1 : -1;
    const scale = 1 - Math.abs(t - 0.45) * 0.7;
    return { x, y, rot: ang + side * 52, rx: leaf * scale, ry: leaf * 0.42 * scale };
  });
  return (
    <g>
      <path
        d={`M${p0[0]} ${p0[1]} Q${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]}`}
        stroke="currentColor"
        strokeWidth={width}
        strokeLinecap="round"
        fill="none"
      />
      {nodes.map((n, i) => (
        <ellipse
          key={i}
          cx={n.x}
          cy={n.y}
          rx={n.rx}
          ry={n.ry}
          fill="currentColor"
          opacity={0.85}
          transform={`rotate(${n.rot} ${n.x} ${n.y})`}
        />
      ))}
      <ellipse
        cx={p2[0]}
        cy={p2[1]}
        rx={leaf * 0.5}
        ry={leaf * 0.24}
        fill="currentColor"
        opacity={0.9}
      />
    </g>
  );
}

/**
 * Layered eucalyptus corner spray — three overlapping stems fanning out
 * from the top-left of a 200×200 box, plus a few berries. Anchored at a
 * corner; rotate/flip via the wrapper. Original art.
 */
export function EucalyptusCorner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden fill="none">
      {/* back layer — long, faint */}
      <g opacity="0.4">
        <LeafBranch p0={[4, 4]} p1={[150, 20]} p2={[196, 150]} leaves={11} leaf={16} />
      </g>
      {/* mid layer along the left edge */}
      <g opacity="0.7">
        <LeafBranch p0={[4, 4]} p1={[24, 150]} p2={[150, 196]} leaves={11} leaf={15} />
      </g>
      {/* front layer — short diagonal */}
      <g opacity="0.95">
        <LeafBranch p0={[2, 2]} p1={[70, 40]} p2={[120, 118]} leaves={8} leaf={14} width={2.4} />
      </g>
      {/* berries near the corner */}
      <g fill="currentColor">
        <circle cx="14" cy="16" r="4" />
        <circle cx="26" cy="12" r="3.2" />
        <circle cx="12" cy="30" r="3.2" />
        <circle cx="30" cy="26" r="2.6" opacity="0.7" />
        <circle cx="6" cy="6" r="4.5" />
      </g>
    </svg>
  );
}

/**
 * "Floating" botanical corners — an eucalyptus spray top-right and
 * bottom-left that gently sway. Drop inside a `relative overflow-hidden`
 * container. Original SVG art, no third-party assets.
 */
export function FloatingLeaves({ tone }: { tone?: string }) {
  const c = tone ?? "text-[var(--inv-secondary)]";
  // wrapper handles the static corner flip; the inner <svg> does the sway
  return (
    <>
      <span
        className={`pointer-events-none absolute -top-8 -right-8 block h-52 w-52 -scale-x-100 ${c} opacity-80`}
      >
        <EucalyptusCorner className="inv-ornament inv-ornament--slow h-full w-full" />
      </span>
      <span
        className={`pointer-events-none absolute -bottom-8 -left-8 block h-52 w-52 -scale-y-100 ${c} opacity-80`}
      >
        <EucalyptusCorner className="inv-ornament inv-ornament--drift h-full w-full" />
      </span>
    </>
  );
}

/** Horizontal leafy sprig — good beside a name or under a title. */
export function LeafSprig({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 40"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <path d="M10 20h180" />
      {[30, 54, 78, 102, 126, 150, 170].map((x, i) => {
        const o = 0.92 - i * 0.05;
        return (
          <g key={x}>
            <path
              d={`M${x} 20c8-11 19-12 25-5-7 8-18 9-25 5z`}
              fill="currentColor"
              fillOpacity={o * 0.9}
              stroke="none"
            />
            <path
              d={`M${x} 20c8 11 19 12 25 5-7-8-18-9-25-5z`}
              fill="currentColor"
              fillOpacity={o * 0.9}
              stroke="none"
            />
          </g>
        );
      })}
      <circle cx="190" cy="20" r="3" fill="currentColor" stroke="none" />
      <circle cx="10" cy="20" r="3" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Centre divider with a leaf motif. */
export function Divider({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 24"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    >
      <path d="M20 12h78M142 12h78" />
      <path
        d="M120 3c7 3.5 7 14 0 18-7-4-7-14 0-18z"
        fill="currentColor"
        fillOpacity="0.2"
      />
      <path d="M104 12c5-4 5-4 10 0-5 4-5 4-10 0z" fill="currentColor" stroke="none" />
      <path d="M126 12c5-4 5-4 10 0-5 4-5 4-10 0z" fill="currentColor" stroke="none" />
      <circle cx="98" cy="12" r="2" fill="currentColor" stroke="none" />
      <circle cx="142" cy="12" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Full-width top garland (arches across the page). */
export function TopGarland({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 90"
      className={className}
      aria-hidden
      fill="none"
      preserveAspectRatio="none"
    >
      <path
        d="M0 4C90 46 150 60 200 60C250 60 310 46 400 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <g fill="currentColor">
        {Array.from({ length: 13 }, (_, i) => {
          const tx = 30 + i * 28;
          const arc = Math.sin((i / 12) * Math.PI);
          const ty = 8 + arc * 46;
          const rot = -60 + (i / 12) * 120;
          return (
            <ellipse
              key={i}
              cx={tx}
              cy={ty}
              rx="12"
              ry="6.5"
              transform={`rotate(${rot} ${tx} ${ty})`}
              opacity={0.55 + arc * 0.4}
            />
          );
        })}
      </g>
    </svg>
  );
}
