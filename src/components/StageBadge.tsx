import type { DealStage } from '../types';

const STAGE_STYLES: Record<DealStage, string> = {
  Prospect:
    'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 ring-zinc-200 dark:ring-zinc-700',
  LOI:
    'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 ring-blue-200 dark:ring-blue-500/30',
  Negotiation:
    'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300 ring-indigo-200 dark:ring-indigo-500/30',
  Executed:
    'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300 ring-violet-200 dark:ring-violet-500/30',
  Active:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-500/30',
  Expired:
    'bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-500 ring-zinc-200 dark:ring-zinc-800',
  Lost:
    'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300 ring-red-200 dark:ring-red-500/30',
};

interface StageBadgeProps {
  stage: DealStage;
  size?: 'sm' | 'md';
}

export function StageBadge({ stage, size = 'sm' }: StageBadgeProps) {
  const sizing = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';
  return (
    <span
      className={`inline-flex items-center font-medium rounded-md ring-1 ring-inset ${sizing} ${STAGE_STYLES[stage]}`}
    >
      {stage}
    </span>
  );
}

interface StageChipProps {
  stage: DealStage;
  selected: boolean;
  onClick: () => void;
}

export function StageChip({ stage, selected, onClick }: StageChipProps) {
  const base =
    'inline-flex items-center px-3 py-1 text-xs font-medium rounded-full transition-colors cursor-pointer select-none ring-1 ring-inset';
  const selectedCls = STAGE_STYLES[stage];
  const unselectedCls =
    'bg-bg-elevated text-fg-muted ring-border hover:text-fg hover:bg-bg-hover';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} ${selected ? selectedCls : unselectedCls}`}
      aria-pressed={selected}
    >
      {stage}
    </button>
  );
}
