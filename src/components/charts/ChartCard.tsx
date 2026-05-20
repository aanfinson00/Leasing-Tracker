import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ChartCard({ title, subtitle, actions, children, className = '' }: ChartCardProps) {
  return (
    <div className={`bg-bg-elevated rounded-2xl shadow-soft p-5 sm:p-6 flex flex-col min-w-0 ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-fg tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-fg-subtle mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
