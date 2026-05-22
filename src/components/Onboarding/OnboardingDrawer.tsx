import { useMemo, useState } from 'react';
import { X, Trash2, ChevronDown, ChevronRight, Link as LinkIcon, NotebookPen, ExternalLink } from 'lucide-react';
import type { OnboardingChecklist, OnboardingItem, RentRollRow } from '../../types';
import {
  ONBOARDING_TEMPLATE,
  ONBOARDING_DEPTS,
  DEPT_LABEL,
  computeProgress,
  type OnboardingDept,
  type OnboardingTemplateItem,
} from '../../lib/onboarding';
import { ProgressBar } from './ProgressBar';

interface OnboardingDrawerProps {
  checklist: OnboardingChecklist | null;
  rentRoll: RentRollRow | null;
  onClose: () => void;
  onUpdateItem: (checklistId: string, itemId: string, patch: Partial<OnboardingItem>) => void;
  onDelete: (id: string) => void;
}

const inputClass =
  'w-full px-3 py-2 bg-bg rounded-lg text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent transition-all shadow-soft';

export function OnboardingDrawer({
  checklist,
  rentRoll,
  onClose,
  onUpdateItem,
  onDelete,
}: OnboardingDrawerProps) {
  // Hooks must run unconditionally — guard the no-checklist render below.
  const [openDepts, setOpenDepts] = useState<Set<OnboardingDept>>(new Set(['D&C']));
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const progress = useMemo(
    () => (checklist ? computeProgress(checklist) : null),
    [checklist]
  );

  const itemsByItemId = useMemo(() => {
    if (!checklist) return new Map<string, OnboardingItem>();
    return new Map(checklist.items.map((i) => [i.itemId, i]));
  }, [checklist]);

  if (!checklist || !progress) return null;

  const tenantLabel = rentRoll?.tenantName ?? rentRoll?.dealName ?? 'Onboarding';
  const subtitle = [rentRoll?.building, rentRoll?.spaceId].filter(Boolean).join(' · ');

  const toggleDept = (d: OnboardingDept) => {
    setOpenDepts((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  };

  const handleCheck = (itemId: string, checked: boolean) => {
    onUpdateItem(checklist.id, itemId, {
      checked,
      completedAt: checked ? new Date().toISOString() : null,
    });
  };

  const handleDeleteChecklist = () => {
    if (confirm('Delete this onboarding record? Checked items and notes will be lost.')) {
      onDelete(checklist.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-fg/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="w-full max-w-2xl bg-bg shadow-lift overflow-y-auto">
        <div className="flex flex-col h-full">
          <div className="sticky top-0 bg-bg/90 backdrop-blur-md border-b border-border px-7 py-5 z-10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl text-fg tracking-[-0.01em] font-semibold truncate">
                  {tenantLabel}
                </h2>
                {subtitle && (
                  <p className="text-sm text-fg-muted mt-0.5">{subtitle}</p>
                )}
                <div className="mt-4 flex items-center gap-3">
                  <ProgressBar done={progress.done} total={progress.total} className="flex-1 max-w-[260px]" />
                  <span className="text-sm tabular-nums text-fg-muted">
                    {progress.done} / {progress.total}
                  </span>
                  <span className="text-xs text-fg-subtle tabular-nums">({progress.pct}%)</span>
                  {progress.isComplete && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                      Completed
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-fg-muted hover:text-fg hover:bg-bg-hover transition-colors shrink-0"
                aria-label="Close"
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>
          </div>

          <div className="flex-1 px-7 py-6 space-y-6">
            {ONBOARDING_DEPTS.map((dept) => {
              const isOpen = openDepts.has(dept);
              const deptProgress = progress.byDept[dept];
              const templateItems = ONBOARDING_TEMPLATE.filter((t) => t.department === dept);
              const grouped = groupBy(templateItems, (t) => t.group);
              return (
                <section key={dept} className="rounded-xl border border-border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleDept(dept)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-bg-subtle/50 hover:bg-bg-subtle transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isOpen ? (
                        <ChevronDown size={15} strokeWidth={2} className="text-fg-muted shrink-0" />
                      ) : (
                        <ChevronRight size={15} strokeWidth={2} className="text-fg-muted shrink-0" />
                      )}
                      <h3 className="text-sm font-semibold text-fg tracking-tight">
                        {DEPT_LABEL[dept]}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <ProgressBar
                        done={deptProgress.done}
                        total={deptProgress.total}
                        className="w-24"
                      />
                      <span className="text-xs text-fg-muted tabular-nums whitespace-nowrap">
                        {deptProgress.done}/{deptProgress.total}
                      </span>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-4 py-3 space-y-4 bg-bg-elevated">
                      {Object.entries(grouped).map(([groupName, items]) => (
                        <div key={groupName}>
                          <h4 className="text-[11px] font-medium uppercase tracking-[0.08em] text-fg-subtle mb-2">
                            {groupName}
                          </h4>
                          <ul className="space-y-1">
                            {items.map((t) => {
                              const state = itemsByItemId.get(t.id);
                              if (!state) return null;
                              const expanded = expandedItem === t.id;
                              return (
                                <ItemRow
                                  key={t.id}
                                  template={t}
                                  state={state}
                                  expanded={expanded}
                                  onCheck={(checked) => handleCheck(t.id, checked)}
                                  onToggleExpand={() =>
                                    setExpandedItem(expanded ? null : t.id)
                                  }
                                  onNotesChange={(notes) =>
                                    onUpdateItem(checklist.id, t.id, { notes })
                                  }
                                  onLinkChange={(link) =>
                                    onUpdateItem(checklist.id, t.id, { link })
                                  }
                                />
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          <div className="sticky bottom-0 bg-bg/90 backdrop-blur-md border-t border-border px-7 py-4 flex items-center justify-between">
            <button
              type="button"
              onClick={handleDeleteChecklist}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-danger rounded-lg hover:bg-danger/10 transition-colors"
            >
              <Trash2 size={14} strokeWidth={1.75} />
              Delete onboarding
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-fg bg-bg-elevated rounded-lg hover:bg-bg-hover transition-colors shadow-soft"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ItemRowProps {
  template: OnboardingTemplateItem;
  state: OnboardingItem;
  expanded: boolean;
  onCheck: (checked: boolean) => void;
  onToggleExpand: () => void;
  onNotesChange: (notes: string | null) => void;
  onLinkChange: (link: string | null) => void;
}

function ItemRow({
  template,
  state,
  expanded,
  onCheck,
  onToggleExpand,
  onNotesChange,
  onLinkChange,
}: ItemRowProps) {
  const hasExtras = !!(state.notes || state.link);
  return (
    <li className="rounded-lg hover:bg-bg-subtle/40 transition-colors">
      <div className="flex items-start gap-3 px-2 py-1.5">
        <input
          type="checkbox"
          checked={state.checked}
          onChange={(e) => onCheck(e.target.checked)}
          className="mt-0.5 size-4 rounded border-border accent-accent cursor-pointer shrink-0"
          aria-label={template.label}
        />
        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={onToggleExpand}
            className="text-left w-full"
          >
            <span
              className={`text-sm leading-snug ${state.checked ? 'text-fg-muted line-through' : 'text-fg'}`}
            >
              {template.label}
            </span>
            {template.hint && (
              <span className="block text-xs text-fg-subtle mt-0.5">
                {template.hint}
              </span>
            )}
            {hasExtras && !expanded && state.notes && (
              <span className="inline-flex items-center gap-1 text-[11px] text-fg-muted mt-1">
                <NotebookPen size={10} strokeWidth={2} />
                {state.notes.length > 40 ? state.notes.slice(0, 40) + '…' : state.notes}
              </span>
            )}
          </button>
          {/* Link chip sits OUTSIDE the expand-toggle button so it can
              be a real clickable <a> — clicking the chip opens the file
              URL in a new tab without toggling the row's expanded state. */}
          {state.link && !expanded && (
            <a
              href={state.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline mt-1"
              title={state.link}
            >
              <LinkIcon size={10} strokeWidth={2} />
              {shortDomain(state.link)}
              <ExternalLink size={9} strokeWidth={2} />
            </a>
          )}
          {expanded && (
            <div className="mt-2 space-y-2 pb-2">
              <input
                type="text"
                placeholder="Notes (e.g. signed 5/22, awaiting tenant signature)"
                defaultValue={state.notes ?? ''}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  onNotesChange(v === '' ? null : v);
                }}
                className={inputClass}
              />
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  placeholder="File URL (SharePoint, OneDrive, Drive, email thread…)"
                  defaultValue={state.link ?? ''}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    onLinkChange(v === '' ? null : v);
                  }}
                  className={inputClass}
                />
                {state.link && (
                  <a
                    href={state.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-accent bg-accent-tint hover:bg-accent-soft rounded-md transition-colors shrink-0"
                    title="Open file in new tab"
                  >
                    <ExternalLink size={12} strokeWidth={2} />
                    Open
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function groupBy<T, K extends string>(arr: ReadonlyArray<T>, key: (t: T) => K): Record<K, T[]> {
  const out: Partial<Record<K, T[]>> = {};
  for (const item of arr) {
    const k = key(item);
    if (!out[k]) out[k] = [];
    out[k]!.push(item);
  }
  return out as Record<K, T[]>;
}

function shortDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
