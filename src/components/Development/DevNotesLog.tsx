import { useState } from 'react';
import { Plus, X, Trash2, Phone, NotebookPen } from 'lucide-react';
import type { DevProjectNote, DevNoteType } from '../../types';
import { DevNoteTypeEnum } from '../../types';

interface DevNotesLogProps {
  devProjectId: string;
  notes: DevProjectNote[];
  onSave: (n: DevProjectNote) => void;
  onDelete: (id: string) => void;
}

function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function noteTypeIconClass(noteType: DevNoteType): string {
  switch (noteType) {
    case 'Call Log':
      return 'bg-accent-tint text-accent';
    case 'Meeting':
      return 'bg-success/15 text-success';
    case 'Site Visit':
      return 'bg-warning/15 text-warning';
    case 'Research':
      return 'bg-fg-subtle/15 text-fg-muted';
    case 'Feasibility':
      return 'bg-accent-tint text-accent';
    default:
      return 'bg-bg-hover text-fg-muted';
  }
}

const fieldClass =
  'w-full px-2.5 py-1.5 text-sm rounded-lg bg-bg-elevated border border-border text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent transition-colors';

export function DevNotesLog({
  devProjectId,
  notes,
  onSave,
  onDelete,
}: DevNotesLogProps) {
  const [adding, setAdding] = useState(false);
  const [draftType, setDraftType] = useState<DevNoteType>('General');
  const [draftContent, setDraftContent] = useState('');
  const [draftDate, setDraftDate] = useState(todayIso());
  const [draftAuthor, setDraftAuthor] = useState('');

  const reset = () => {
    setDraftType('General');
    setDraftContent('');
    setDraftDate(todayIso());
    setDraftAuthor('');
    setAdding(false);
  };

  const handleSave = () => {
    if (draftContent.trim() === '') return;
    const now = new Date().toISOString();
    onSave({
      id: crypto.randomUUID(),
      devProjectId,
      noteType: draftType,
      eventDate: draftDate || null,
      content: draftContent.trim(),
      author: draftAuthor.trim() || null,
      link: null,
      createdAt: now,
      updatedAt: now,
    });
    reset();
  };

  // Newest first.
  const sorted = [...notes].sort((a, b) => {
    const ad = (a.eventDate || a.createdAt).slice(0, 10);
    const bd = (b.eventDate || b.createdAt).slice(0, 10);
    if (ad === bd) return b.createdAt.localeCompare(a.createdAt);
    return bd.localeCompare(ad);
  });

  return (
    <div className="flex flex-col gap-2">
      {!adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 self-start px-3 py-1.5 text-xs font-medium text-fg-muted hover:text-fg hover:bg-bg-hover rounded-lg transition-colors"
        >
          <Plus size={13} strokeWidth={2} />
          Add note
        </button>
      )}

      {adding && (
        <div className="rounded-lg bg-bg shadow-soft p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-xs font-medium text-fg-muted">New activity</p>
            <button
              type="button"
              onClick={reset}
              className="text-fg-subtle hover:text-fg p-1 rounded"
              aria-label="Cancel"
            >
              <X size={13} strokeWidth={1.75} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <select
              value={draftType}
              onChange={(e) => setDraftType(e.target.value as DevNoteType)}
              className={fieldClass}
            >
              {DevNoteTypeEnum.options.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
              className={`${fieldClass} tabular-nums`}
            />
            <input
              value={draftAuthor}
              onChange={(e) => setDraftAuthor(e.target.value)}
              placeholder="Author (optional)"
              className={fieldClass}
            />
          </div>
          <textarea
            value={draftContent}
            onChange={(e) => setDraftContent(e.target.value)}
            rows={3}
            placeholder="What happened? Who was on the call? What's next?"
            className={fieldClass}
          />
          <div className="flex items-center justify-end gap-2 mt-2.5">
            <button
              type="button"
              onClick={reset}
              className="px-2.5 py-1 text-xs font-medium text-fg-muted hover:text-fg rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={draftContent.trim() === ''}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-accent-fg bg-accent rounded-lg hover:bg-accent-hover transition-colors shadow-soft disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <NotebookPen size={11} strokeWidth={2} />
              Log it
            </button>
          </div>
        </div>
      )}

      {sorted.length === 0 && !adding ? (
        <p className="text-xs text-fg-subtle italic">
          No activity logged yet. Calls, meetings, site visits, feasibility notes — they all go here.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((n) => (
            <li
              key={n.id}
              className="rounded-lg bg-bg shadow-soft p-3 flex gap-3"
            >
              <div
                className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-lg ${noteTypeIconClass(n.noteType)}`}
              >
                {n.noteType === 'Call Log' ? (
                  <Phone size={13} strokeWidth={2} />
                ) : (
                  <NotebookPen size={13} strokeWidth={2} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-medium text-fg-muted uppercase tracking-wider">
                    {n.noteType}
                  </span>
                  <span className="text-[11px] text-fg-subtle tabular-nums">
                    {n.eventDate ?? n.createdAt.slice(0, 10)}
                  </span>
                  {n.author && (
                    <span className="text-[11px] text-fg-subtle">· {n.author}</span>
                  )}
                </div>
                <p className="text-sm text-fg mt-1 whitespace-pre-wrap break-words">
                  {n.content}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Delete this note?')) onDelete(n.id);
                }}
                className="shrink-0 p-1 rounded text-fg-subtle hover:text-danger transition-colors self-start"
                aria-label="Delete note"
              >
                <Trash2 size={12} strokeWidth={1.75} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
