import { useMemo, useState } from 'react';
import {
  Plus,
  Mail,
  MailOpen,
  Phone,
  Calendar,
  NotebookPen,
  ArrowRight,
  Link2,
  Trash2,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ActivityEntry, ActivityParentType, ActivityType } from '../types';
import { detectMailProvider, getActivitiesFor, shortDomain } from '../lib/activity';

interface ActivityLogProps {
  parentType: ActivityParentType;
  parentId: string;
  entries: ActivityEntry[];
  onAdd: (entry: Omit<ActivityEntry, 'id' | 'createdAt'>) => void;
  onDelete: (id: string) => void;
}

const TYPE_META: Record<ActivityType, { label: string; icon: LucideIcon; colorCls: string }> = {
  note: { label: 'Note', icon: NotebookPen, colorCls: 'text-fg-muted bg-bg-elevated' },
  'email-out': { label: 'Email Out', icon: Mail, colorCls: 'text-accent bg-accent-tint' },
  'email-in': { label: 'Email In', icon: MailOpen, colorCls: 'text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/15' },
  call: { label: 'Call', icon: Phone, colorCls: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15' },
  meeting: { label: 'Meeting', icon: Calendar, colorCls: 'text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-500/15' },
  'status-change': { label: 'Status', icon: ArrowRight, colorCls: 'text-fg-subtle bg-bg-elevated' },
};

const ADDABLE_TYPES: ActivityType[] = ['note', 'email-out', 'email-in', 'call', 'meeting'];

const todayIso = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

const inputClass =
  'w-full px-3 py-2 bg-bg rounded-lg text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent transition-all shadow-soft';
const labelClass = 'block text-[11px] font-medium text-fg-muted mb-1';

export function ActivityLog({
  parentType,
  parentId,
  entries,
  onAdd,
  onDelete,
}: ActivityLogProps) {
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<ActivityType>('note');
  const [date, setDate] = useState(todayIso());
  const [summary, setSummary] = useState('');
  const [link, setLink] = useState('');

  const filtered = useMemo(() => getActivitiesFor(entries, parentType, parentId), [
    entries,
    parentType,
    parentId,
  ]);

  const reset = () => {
    setAdding(false);
    setType('note');
    setDate(todayIso());
    setSummary('');
    setLink('');
  };

  const handleSubmit = () => {
    const text = summary.trim();
    if (!text) return;
    onAdd({
      parentType,
      parentId,
      date,
      type,
      summary: text,
      link: link.trim() === '' ? null : link.trim(),
      author: null,
    });
    reset();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-fg-muted">
          {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
        </span>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-accent border border-accent/40 rounded-lg hover:bg-accent-tint transition-colors"
          >
            <Plus size={12} strokeWidth={2.25} />
            Add entry
          </button>
        )}
      </div>

      {adding && (
        <div className="p-3.5 bg-bg-elevated rounded-xl space-y-3 shadow-soft">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ActivityType)}
                className={inputClass}
              >
                {ADDABLE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_META[t].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Summary</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              placeholder="What happened?"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Link (optional)</label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://mail.google.com/…"
              className={inputClass}
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={reset}
              className="px-3 py-1.5 text-xs font-medium text-fg-muted hover:text-fg hover:bg-bg-hover rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={summary.trim() === ''}
              className="px-3.5 py-1.5 text-xs font-semibold bg-accent text-accent-fg rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Save entry
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 && !adding ? (
        <div className="text-center py-8 px-4 bg-bg-elevated rounded-xl border border-dashed border-border">
          <p className="text-sm text-fg-muted">No activity yet</p>
          <p className="text-xs text-fg-subtle mt-1">
            Log emails, calls, meetings, and notes to track this {parentType === 'deal' ? 'deal' : 'space'}.
          </p>
        </div>
      ) : (
        <ol className="space-y-2">
          {filtered.map((e) => (
            <ActivityRow key={e.id} entry={e} onDelete={() => onDelete(e.id)} />
          ))}
        </ol>
      )}
    </div>
  );
}

function ActivityRow({ entry, onDelete }: { entry: ActivityEntry; onDelete: () => void }) {
  const meta = TYPE_META[entry.type];
  const Icon = meta.icon;
  const isStatusChange = entry.type === 'status-change';
  const provider = detectMailProvider(entry.link);
  const domain = shortDomain(entry.link);

  return (
    <li
      className={`flex gap-3 p-3 rounded-xl border ${
        isStatusChange
          ? 'bg-transparent border-dashed border-border'
          : 'bg-bg-elevated border-transparent shadow-soft'
      }`}
    >
      <div
        className={`flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${meta.colorCls}`}
      >
        <Icon size={13} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-xs font-semibold text-fg">{meta.label}</span>
          <span className="text-[11px] text-fg-subtle tabular-nums">{entry.date}</span>
        </div>
        <p
          className={`mt-0.5 text-sm ${
            isStatusChange ? 'text-fg-muted italic' : 'text-fg'
          } whitespace-pre-wrap break-words`}
        >
          {entry.summary}
        </p>
        {entry.link && (
          <a
            href={entry.link}
            target="_blank"
            rel="noreferrer"
            className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
          >
            {provider === 'gmail' || provider === 'outlook' || provider === 'apple' ? (
              <Mail size={11} strokeWidth={2} />
            ) : (
              <Link2 size={11} strokeWidth={2} />
            )}
            {domain ?? entry.link}
          </a>
        )}
      </div>
      {!isStatusChange && (
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 text-fg-subtle hover:text-danger hover:bg-danger/10 rounded-md transition-colors shrink-0 self-start"
          aria-label="Delete entry"
          title="Delete"
        >
          <Trash2 size={12} strokeWidth={1.75} />
        </button>
      )}
    </li>
  );
}

// Re-export a tiny X so consumers don't pull from lucide-react themselves.
export { X as ActivityCloseIcon };
