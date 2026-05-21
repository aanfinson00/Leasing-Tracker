import { useMemo } from 'react';
import { CheckCircle2, ClipboardList } from 'lucide-react';
import type { OnboardingChecklist, RentRollRow } from '../../types';
import { computeProgress, ONBOARDING_DEPTS } from '../../lib/onboarding';
import { ProgressBar } from './ProgressBar';

interface OnboardingTableProps {
  onboardings: OnboardingChecklist[];
  rentRoll: RentRollRow[];
  onSelect: (id: string) => void;
}

export function OnboardingTable({ onboardings, rentRoll, onSelect }: OnboardingTableProps) {
  const rrById = useMemo(() => new Map(rentRoll.map((r) => [r.id, r])), [rentRoll]);

  // Sort: in-progress first, then by lease start ascending (oldest leases
  // first — the ones most likely to be overdue).
  const sorted = useMemo(() => {
    const withProgress = onboardings.map((c) => ({
      checklist: c,
      progress: computeProgress(c),
      rr: rrById.get(c.rentRollId) ?? null,
    }));
    return withProgress.sort((a, b) => {
      if (a.progress.isComplete !== b.progress.isComplete) {
        return a.progress.isComplete ? 1 : -1;
      }
      const aStart = a.rr?.leaseStart ?? '';
      const bStart = b.rr?.leaseStart ?? '';
      return aStart.localeCompare(bStart);
    });
  }, [onboardings, rrById]);

  return (
    <div className="overflow-hidden rounded-2xl bg-bg-elevated shadow-soft">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-bg-elevated">
            <tr className="border-b border-border">
              <Th>Tenant</Th>
              <Th>Building</Th>
              <Th>Lease Start</Th>
              <Th>Progress</Th>
              {ONBOARDING_DEPTS.map((d) => (
                <Th key={d}>{d}</Th>
              ))}
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ checklist, progress, rr }) => (
              <tr
                key={checklist.id}
                onClick={() => onSelect(checklist.id)}
                className="border-b border-border last:border-b-0 hover:bg-bg-subtle/50 cursor-pointer transition-colors"
              >
                <Td>
                  <span className="font-medium text-fg">
                    {rr?.tenantName ?? rr?.dealName ?? '—'}
                  </span>
                </Td>
                <Td>
                  <span className="text-fg-muted">
                    {rr?.building ?? rr?.spaceId ?? '—'}
                  </span>
                </Td>
                <Td>
                  <span className="tabular-nums text-fg-muted whitespace-nowrap">
                    {rr?.leaseStart ?? '—'}
                  </span>
                </Td>
                <Td className="min-w-[140px]">
                  <div className="flex items-center gap-2">
                    <ProgressBar done={progress.done} total={progress.total} />
                    <span className="text-xs text-fg-muted tabular-nums whitespace-nowrap">
                      {progress.done}/{progress.total}
                    </span>
                  </div>
                </Td>
                {ONBOARDING_DEPTS.map((d) => {
                  const p = progress.byDept[d];
                  return (
                    <Td key={d} className="min-w-[100px]">
                      <div className="flex items-center gap-2">
                        <ProgressBar done={p.done} total={p.total} />
                        <span className="text-xs text-fg-subtle tabular-nums whitespace-nowrap">
                          {p.done}/{p.total}
                        </span>
                      </div>
                    </Td>
                  );
                })}
                <Td>
                  {progress.isComplete ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 size={11} strokeWidth={2.5} />
                      Completed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-accent/10 text-accent">
                      <ClipboardList size={11} strokeWidth={2.25} />
                      In progress
                    </span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.1em] text-fg-subtle whitespace-nowrap">
      {children}
    </th>
  );
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-sm align-middle ${className}`}>{children}</td>;
}
