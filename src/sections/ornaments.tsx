/**
 * Original decorative SVG ornaments — hand-authored for Ngaturi, not
 * copied from any third party. They inherit `currentColor` so sections
 * tint them via `--inv-primary` / `--inv-secondary`.
 */

/** Lush corner spray: stems, leaves, a few small blooms. */
export function CornerFloral({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 140 140"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    >
      {/* main stems */}
      <path d="M6 6c30 4 55 18 72 44M6 6c4 30 18 55 44 72M6 6c22 10 40 26 52 48" />
      {/* leaves along the stems */}
      {[
        [34, 22, -20],
        [52, 34, -8],
        [66, 50, 6],
        [22, 34, -70],
        [34, 52, -84],
        [50, 66, -96],
        [40, 40, -45],
      ].map(([x, y, r], i) => (
        <path
          key={i}
          d={`M${x} ${y}c7-9 16-9 20 0-4 9-13 12-20 0z`}
          transform={`rotate(${r} ${x} ${y})`}
          fill="currentColor"
          fillOpacity="0.14"
        />
      ))}
      {/* small blooms */}
      {[
        [78, 46],
        [46, 78],
        [64, 64],
      ].map(([cx, cy], i) => (
        <g key={i}>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse
              key={a}
              cx={cx}
              cy={cy - 6}
              rx="3.2"
              ry="6"
              transform={`rotate(${a} ${cx} ${cy})`}
              fill="currentColor"
              fillOpacity="0.9"
              stroke="none"
            />
          ))}
          <circle cx={cx} cy={cy} r="2.4" fill="#fff" stroke="none" />
        </g>
      ))}
      <circle cx="8" cy="8" r="2.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Horizontal leafy sprig — good beside a name or title. */
export function LeafSprig({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 34"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    >
      <path d="M8 17h144" />
      {[24, 44, 64, 84, 104, 124].map((x, i) => {
        const o = 0.9 - i * 0.06;
        return (
          <g key={x}>
            <path d={`M${x} 17c7-9 16-10 21-4-6 7-15 8-21 4z`} fill="currentColor" fillOpacity={o * 0.16} />
            <path d={`M${x} 17c7 9 16 10 21 4-6-7-15-8-21-4z`} fill="currentColor" fillOpacity={o * 0.16} />
          </g>
        );
      })}
      <circle cx="150" cy="17" r="2.4" fill="currentColor" stroke="none" />
      <circle cx="8" cy="17" r="2.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Centre divider with a leaf/diamond motif. */
export function Divider({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 22"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    >
      <path d="M16 11h74M130 11h74" />
      <path d="M110 3c6 3 6 13 0 16-6-3-6-13 0-16z" fill="currentColor" fillOpacity="0.18" />
      <path d="M96 11c4-3 4-3 8 0-4 3-4 3-8 0z" fill="currentColor" stroke="none" />
      <path d="M116 11c4-3 4-3 8 0-4 3-4 3-8 0z" fill="currentColor" stroke="none" />
    </svg>
  );
}
