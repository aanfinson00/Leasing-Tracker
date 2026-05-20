import { useRef } from 'react';
import { FolderOpen, Download, Plus, FileSpreadsheet } from 'lucide-react';

interface TopBarProps {
  filename: string;
  dealCount: number;
  hasDeals: boolean;
  onOpenFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveFile: () => void;
  onNewDeal: () => void;
}

export function TopBar({
  filename,
  dealCount,
  hasDeals,
  onOpenFile,
  onSaveFile,
  onNewDeal,
}: TopBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="sticky top-0 z-10 bg-bg/85 backdrop-blur-md">
      <div className="px-6 sm:px-10 pt-8 pb-6 max-w-7xl mx-auto">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-fg-subtle mb-1.5">
              Industrial Portfolio
            </p>
            <h1 className="font-serif text-[34px] sm:text-[40px] leading-[1.05] tracking-tight text-fg font-semibold">
              Leasing Tracker
            </h1>
            <div className="mt-3 flex items-center gap-2 text-sm text-fg-muted">
              {filename ? (
                <>
                  <FileSpreadsheet size={14} strokeWidth={1.75} className="shrink-0 text-fg-subtle" />
                  <span className="font-medium text-fg">{filename}</span>
                  <span className="text-fg-subtle">·</span>
                  <span className="tabular-nums">
                    {dealCount} {dealCount === 1 ? 'deal' : 'deals'}
                  </span>
                </>
              ) : (
                <span className="italic text-fg-subtle">No file loaded yet</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-fg bg-bg-elevated rounded-xl hover:bg-bg-hover transition-colors shadow-soft"
            >
              <FolderOpen size={15} strokeWidth={1.75} />
              Open
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={onOpenFile}
              className="hidden"
            />

            <button
              onClick={onSaveFile}
              disabled={!hasDeals}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-fg bg-bg-elevated rounded-xl hover:bg-bg-hover transition-colors shadow-soft disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-bg-elevated"
            >
              <Download size={15} strokeWidth={1.75} />
              Save
            </button>

            <button
              onClick={onNewDeal}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-accent-fg bg-accent rounded-xl hover:bg-accent-hover transition-colors shadow-soft"
            >
              <Plus size={15} strokeWidth={2.25} />
              New Deal
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
