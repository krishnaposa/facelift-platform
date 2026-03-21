/**
 * Inline SVG — always loads (no external request). Use when URLs fail or are missing.
 */
export const IMAGE_PLACEHOLDER_DATA_URL =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500" role="img" aria-label="No image">
  <rect fill="#f1f5f9" width="800" height="500"/>
  <g fill="none" stroke="#94a3b8" stroke-width="2">
    <rect x="280" y="160" width="240" height="180" rx="8"/>
    <circle cx="360" cy="220" r="24"/>
    <path d="M320 300 L380 250 L440 300 L480 260 L520 320" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <text x="400" y="400" text-anchor="middle" fill="#64748b" font-family="system-ui,Segoe UI,sans-serif" font-size="18">No preview</text>
</svg>`
  );
