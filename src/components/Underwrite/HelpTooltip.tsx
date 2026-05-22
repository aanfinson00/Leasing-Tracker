// Lifted from Lease-Calculator/components/ui/help-tooltip.tsx on 2026-05-22.
// `?` icon with a hover/focus-revealed tooltip bubble.

import { CircleHelp } from 'lucide-react';

export function HelpTooltip({
  children,
  side = 'bottom',
  align = 'left',
}: {
  children: React.ReactNode;
  side?: 'bottom' | 'top';
  align?: 'left' | 'right' | 'center';
}) {
  const sideClass = side === 'top' ? 'bottom-full mb-1' : 'top-full mt-1';
  const alignClass =
    align === 'right'
      ? 'right-0'
      : align === 'center'
        ? 'left-1/2 -translate-x-1/2'
        : 'left-0';

  return (
    <span className="group/help relative inline-flex items-center">
      <button
        type="button"
        tabIndex={0}
        aria-label="More info"
        className="inline-flex size-3.5 items-center justify-center rounded-full text-fg-subtle hover:text-fg focus:outline-none focus-visible:text-fg"
      >
        <CircleHelp className="size-3.5" />
      </button>
      <span
        role="tooltip"
        className={[
          'pointer-events-none invisible absolute z-30 w-64 rounded-md border border-border bg-bg-elevated p-2 text-[11px] leading-tight text-fg shadow-lift opacity-0 transition-opacity',
          'group-hover/help:visible group-hover/help:opacity-100 group-hover/help:pointer-events-auto',
          'group-focus-within/help:visible group-focus-within/help:opacity-100 group-focus-within/help:pointer-events-auto',
          sideClass,
          alignClass,
        ].join(' ')}
      >
        {children}
      </span>
    </span>
  );
}
