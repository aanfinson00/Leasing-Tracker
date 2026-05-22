// Subtle animated copper grid behind the app surface. Ported from
// ParceCRM's marketing root (app/page.tsx) — quieter than the
// login screen's variant (no wave-sweep), just the drift + pulse.
//
// Fixed positioned at z-index 0 so it sits behind the sidebar and
// every view but above the body background color. pointer-events-
// none so it never intercepts clicks.

export function GridBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div
        className="absolute lt-animate-grid-move"
        style={{ inset: '-80px' }}
      >
        <div
          className="absolute inset-0 lt-animate-grid-pulse will-change-[transform,opacity]"
          style={{ transformOrigin: 'center' }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(212, 137, 90, 0.08) 1px, transparent 1px),
                linear-gradient(90deg, rgba(212, 137, 90, 0.08) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
            }}
          />
        </div>
      </div>
    </div>
  );
}
