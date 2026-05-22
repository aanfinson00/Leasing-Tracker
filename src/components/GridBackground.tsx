// Static copper graph-paper grid behind the app surface. Small 24px
// cells, very low opacity — just enough to read as "drafting paper"
// without competing for attention. No animation.
//
// Fixed positioned at z-index 0 so it sits behind the sidebar and
// every view but above the body background color. pointer-events-
// none so it never intercepts clicks.

export function GridBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden
      style={{
        backgroundImage: `
          linear-gradient(rgba(184, 112, 64, 0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(184, 112, 64, 0.06) 1px, transparent 1px)
        `,
        backgroundSize: '24px 24px',
      }}
    />
  );
}
