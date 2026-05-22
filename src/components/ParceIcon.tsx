// ───────────────────────────────────────────────────────────────────
// Lifted from ParceCRM/components/ui/ParceIcon.tsx on 2026-05-22.
// Per Parce Brand Playbook Sections 01-02 — 3x3 parcel-grid mark.
//
//   - 3x3 CSS Grid: columns 1.4fr / 1fr / 0.8fr, rows 1fr / 1.2fr / 0.8fr
//   - 4° clockwise tilt (the icon should never be at 0°)
//   - Primary cell (top-left) full opacity; secondary/tertiary/ghost
//     follow a playbook hierarchy
//   - 5 size variants (xs/sm/md/lg/xl), 4 color variants
//     (on-dark / on-light / inverted / mono-white)
// ───────────────────────────────────────────────────────────────────

const sizeMap = {
  xs: { width: 24, height: 24, gap: 2 },
  sm: { width: 36, height: 36, gap: 3 },
  md: { width: 44, height: 44, gap: 3 },
  lg: { width: 54, height: 54, gap: 4 },
  xl: { width: 64, height: 64, gap: 4 },
};

const variantColors = {
  'on-dark': {
    primary: '#d4895a',
    ghost: 'rgba(212,137,90,0.12)',
  },
  'on-light': {
    primary: '#b87040',
    ghost: 'rgba(184,112,64,0.08)',
  },
  inverted: {
    primary: 'rgba(0,0,0,0.65)',
    ghost: 'rgba(0,0,0,0.08)',
  },
  'mono-white': {
    primary: 'rgba(255,255,255,0.9)',
    ghost: 'rgba(255,255,255,0.08)',
  },
};

export interface ParceIconProps {
  size?: keyof typeof sizeMap;
  variant?: keyof typeof variantColors;
}

export function ParceIcon({ size = 'md', variant = 'on-dark' }: ParceIconProps) {
  const { width, height, gap } = sizeMap[size];
  const { primary, ghost } = variantColors[variant];

  // Playbook opacity hierarchy:
  //   1 (top-left)   PRIMARY  — full opacity
  //   2 (top-mid)    tertiary — 0.35
  //   3 (top-right)  ghost
  //   4 (mid-left)   SECONDARY — 0.55
  //   5 (mid-mid)    ghost-ish — 0.25
  //   6-9            ghost
  const cells = [
    { bg: primary, opacity: 1 },
    { bg: primary, opacity: 0.35 },
    { bg: ghost, opacity: 1 },
    { bg: primary, opacity: 0.55 },
    { bg: primary, opacity: 0.25 },
    { bg: ghost, opacity: 1 },
    { bg: ghost, opacity: 1 },
    { bg: ghost, opacity: 1 },
    { bg: ghost, opacity: 1 },
  ];

  return (
    <div
      aria-hidden="true"
      style={{
        display: 'grid',
        gridTemplateColumns: 'var(--icon-grid, 1.4fr 1fr 0.8fr)',
        gridTemplateRows: 'var(--icon-rows, 1fr 1.2fr 0.8fr)',
        width,
        height,
        gap,
        transform: 'var(--icon-tilt, rotate(4deg) translateY(3px))',
        flexShrink: 0,
      }}
    >
      {cells.map((cell, i) => (
        <span
          key={i}
          style={{
            borderRadius: 2,
            background: cell.bg,
            opacity: cell.opacity,
          }}
        />
      ))}
    </div>
  );
}
