import { useRef } from 'react';
import { Download, Upload } from 'lucide-react';

interface ExcelToolbarProps {
  onExport: () => void | Promise<void>;
  onImport: (file: File) => void;
  itemCount: number;
  className?: string;
}

export function ExcelToolbar({ onExport, onImport, itemCount, className = '' }: ExcelToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={onExport}
        disabled={itemCount === 0}
        title="Export to Excel"
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-fg-muted hover:text-fg hover:bg-bg-elevated transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Download size={15} strokeWidth={1.75} />
      </button>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        title="Import from Excel"
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-fg-muted hover:text-fg hover:bg-bg-elevated transition-colors"
      >
        <Upload size={15} strokeWidth={1.75} />
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImport(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
