import type { DealStatus, Priority } from '../types';

const STATUS_STYLES: Record<DealStatus, string> = {
  // Sourcing — stone
  'New Prospect':
    'bg-stone-100 text-stone-700 dark:bg-stone-800/60 dark:text-stone-300',
  // Pre-proposal — amber
  'RFP Requested':
    'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  'Drafting Unsolicited':
    'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  // Proposal — blue / indigo
  'Proposal Pending Approval':
    'bg-blue-50 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300',
  'Proposal Sent':
    'bg-indigo-50 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300',
  // Negotiation — violet
  'LOI Negotiations':
    'bg-violet-50 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300',
  'Lease Negotiations':
    'bg-violet-100 text-violet-900 dark:bg-violet-500/20 dark:text-violet-200',
  // Closed-positive — emerald
  Executed:
    'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  // Side-states
  'On Hold':
    'bg-zinc-100 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-400',
  Lost:
    'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
};

const STATUSES: DealStatus[] = [
  'New Prospect',
  'RFP Requested',
  'Drafting Unsolicited',
  'Proposal Pending Approval',
  'Proposal Sent',
  'LOI Negotiations',
  'Lease Negotiations',
  'Executed',
  'On Hold',
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

export { STATUSES, STATUS_STYLES };
