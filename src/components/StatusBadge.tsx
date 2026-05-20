import type { DealStatus, Priority } from '../types';

const STATUS_STYLES: Record<DealStatus, string> = {
  Prospect:
    'bg-stone-100 text-stone-700 dark:bg-stone-800/60 dark:text-stone-300',
  'RFP Out':
    'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  'RFP for Approval':
    'bg-blue-50 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300',
  'On Hold':
    'bg-zinc-100 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-400',
  Executed:
    'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  Lost:
    'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
};

const STATUSES: DealStatus[] = [
  'Prospect',
  'RFP Out',
  'RFP for Approval',
  'On Hold',
  'Executed',
  'Lost',
];

interface StatusBadgeProps {
  status: DealStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const sizing = size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full whitespace-nowrap ${sizing} ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

interface StatusChipProps {
  status: DealStatus;
  selected: boolean;
  onClick: () => void;
}

export function StatusChip({ status, selected, onClick }: StatusChipProps) {
  const base =
    'inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer select-none whitespace-nowrap';
  const selectedCls = STATUS_STYLES[status];
  const unselectedCls =
    'bg-bg-elevated text-fg-muted hover:text-fg hover:bg-bg-hover shadow-soft';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} ${selected ? selectedCls : unselectedCls}`}
      aria-pressed={selected}
    >
      {status}
    </button>
  );
}

const PRIORITY_STYLES: Record<Priority, string> = {
  High: 'text-danger',
  Medium: 'text-warning',
  Low: 'text-fg-subtle',
};

interface PriorityLabelProps {
  priority: Priority;
}

export function PriorityLabel({ priority }: PriorityLabelProps) {
  const dot =
    priority === 'High'
      ? 'bg-danger'
      : priority === 'Medium'
        ? 'bg-warning'
        : 'bg-fg-subtle';
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${PRIORITY_STYLES[priority]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} aria-hidden />
      {priority}
    </span>
  );
}

export { STATUSES };
