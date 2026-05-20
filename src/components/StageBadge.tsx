import type { DealStage } from '../types';

const STAGE_STYLES: Record<DealStage, string> = {
  Prospect:
    'bg-stone-100 text-stone-700 dark:bg-stone-800/60 dark:text-stone-300',
  LOI:
    'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  Negotiation:
    'bg-blue-50 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300',
  Executed:
    'bg-violet-50 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300',
  Active:
    'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  Expired:
    'bg-stone-50 text-stone-500 dark:bg-stone-900/60 dark:text-stone-500',
  Lost:
    'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
};

interface StageBadgeProps {
  stage: DealStage;
  size?: 'sm' | 'md';
}

export function StageBadge({ stage, size = 'sm' }: StageBadgeProps) {
  const sizing = size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${sizing} ${STAGE_STYLES[stage]}`}
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
    'inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer select-none';
  const selectedCls = STAGE_STYLES[stage];
  const unselectedCls =
    'bg-bg-elevated text-fg-muted hover:text-fg hover:bg-bg-hover shadow-soft';
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
