/**
 * Original decorative SVG ornaments (hand-authored, not copied). Colour
 * follows `currentColor` so sections can tint them via `--inv-primary`.
 */

export function LeafSprig({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M10 20h100" />
      {[22, 38, 54, 70, 86].map((x, i) => (
        <g key={x}>
          <path d={`M${x} 20c6-8 14-9 18-3-6 6-14 6-18 3z`} opacity={0.9 - i * 0.05} />
          <path d={`M${x} 20c6 8 14 9 18 3-6-6-14-6-18-3z`} opacity={0.9 - i * 0.05} />
        </g>
      ))}
      <circle cx="110" cy="20" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CornerFloral({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 90 90"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M4 4c18 2 34 12 44 30" />
      <path d="M4 4c2 18 12 34 30 44" />
      {[
        [26, 14],
        [40, 24],
        [52, 38],
        [14, 26],
        [24, 40],
        [38, 52],
      ].map(([cx, cy], i) => (
        <path
          key={i}
          d={`M${cx} ${cy}c4-5 9-5 12 0-3 5-9 5-12 0z`}
          transform={`rotate(${i * 18} ${cx} ${cy})`}
        />
      ))}
      <circle cx="10" cy="10" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Divider({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M20 10h60M120 10h60" />
      <path d="M100 3c5 3 5 11 0 14-5-3-5-11 0-14z" />
      <circle cx="86" cy="10" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="114" cy="10" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
