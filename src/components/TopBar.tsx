import { FileSpreadsheet, CircleAlert } from 'lucide-react';

interface TopBarProps {
  filename: string;
  dealCount: number;
}

export function TopBar({ filename, dealCount }: TopBarProps) {
  return (
    <header className="sticky top-0 z-10 bg-bg-elevated/85 backdrop-blur border-b border-border">
      <div className="flex items-center gap-4 px-6 h-14">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-base font-semibold tracking-tight text-fg whitespace-nowrap">
            Industrial Leasing Tracker
          </h1>
        </div>

        <span className="text-fg-subtle">·</span>

        <div className="flex items-center gap-2 min-w-0 text-sm text-fg-muted">
          {filename ? (
            <>
              <FileSpreadsheet size={14} strokeWidth={2} className="shrink-0" />
              <span className="truncate font-medium text-fg">{filename}</span>
              <span className="text-fg-subtle tabular-nums whitespace-nowrap">
                · {dealCount} {dealCount === 1 ? 'deal' : 'deals'}
              </span>
            </>
          ) : (
            <>
              <CircleAlert size={14} strokeWidth={2} className="shrink-0" />
              <span className="whitespace-nowrap">No file loaded</span>
            </>
          )}
        </div>

        <div className="ml-auto" />
      </div>
    </header>
  );
}
