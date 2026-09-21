/** Lightweight DOM ornament; all invitation text remains outside the Canvas. */
export function JasmineOrnament({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 240 44"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 25C46 25 72 10 110 23M130 23C168 10 194 25 228 25"
        stroke="currentColor"
        strokeWidth=".8"
      />
      {[48, 76, 164, 192].map((x) => (
        <path
          key={x}
          d={`M${x} 21q-12-17-18-10 4 13 18 10m0 0q5 13 14 9-2-12-14-9`}
          fill="currentColor"
          opacity=".5"
        />
      ))}
      {[0, 72, 144, 216, 288].map((angle) => (
        <ellipse
          key={angle}
          cx="120"
          cy="15"
          rx="4"
          ry="8"
          transform={`rotate(${angle} 120 22)`}
          fill="currentColor"
          opacity=".85"
        />
      ))}
      <circle cx="120" cy="22" r="2.5" fill="currentColor" />
    </svg>
  );
}
