interface ProgressBarProps {
  done: number;
  total: number;
  tone?: 'accent' | 'success';
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({
  done,
  total,
  tone = 'accent',
  showLabel = false,
  className = '',
}: ProgressBarProps) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const complete = total > 0 && done === total;
  const fillClass =
    complete || tone === 'success'
      ? 'bg-emerald-500 dark:bg-emerald-400'
      : 'bg-accent';
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 h-1.5 rounded-full bg-bg-subtle overflow-hidden min-w-[40px]">
        <div
          className={`h-full ${fillClass} transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-fg-muted tabular-nums whitespace-nowrap">
          {done}/{total}
        </span>
      )}
    </div>
  );
}
