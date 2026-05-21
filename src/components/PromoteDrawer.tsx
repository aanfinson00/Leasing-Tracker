import { useEffect, useMemo, useState } from 'react';
import {
  X,
  ArrowRight,
  Building2,
  Users,
  CalendarClock,
  DollarSign,
  CircleCheck,
  CirclePlus,
} from 'lucide-react';
import type { Deal, RentRollRow } from '../types';
import { previewPromote, computeLeaseEnd, computeExpiryBucket } from '../lib/promote';
import { StatusBadge } from './StatusBadge';

interface PromoteDrawerProps {
  deal: Deal | null;
  existingRow: RentRollRow | null;
  onClose: () => void;
  onConfirm: (row: RentRollRow, isNew: boolean) => void;
}

const formatSF = (n: number | null): string =>
  n === null ? '–' : `${n.toLocaleString()} SF`;
const formatRent = (n: number | null): string =>
  n === null ? '–' : `$${n.toFixed(2)}/SF`;
const formatMoney = (n: number | null): string =>
  n === null ? '–' : `$${Math.round(n).toLocaleString()}`;
const formatDate = (s: string | null): string => s ?? '–';

// Strip floating-point noise (e.g., 8.486999... → 8.49) for currency inputs.
const formatCurrencyForInput = (v: number | null | undefined): string => {
  if (v === null || v === undefined) return '';
  return v.toFixed(2);
};
const formatIntForInput = (v: number | null | undefined): string => {
  if (v === null || v === undefined) return '';
  return String(Math.round(v));
};

interface RowProps {
  label: string;
  from?: string;
  to: string;
  changed?: boolean;
}

function ChangeRow({ label, from, to, changed }: RowProps) {
  return (
    <div className="flex items-baseline gap-2 py-1.5 text-sm">
      <span className="w-36 shrink-0 text-fg-subtle text-xs uppercase tracking-[0.08em]">
        {label}
      </span>
      {from !== undefined && from !== to && (
        <>
          <span className="text-fg-subtle tabular-nums line-through">{from}</span>
          <ArrowRight size={12} strokeWidth={1.75} className="text-fg-subtle" />
        </>
      )}
      <span
        className={`tabular-nums ${changed ? 'text-fg font-medium' : 'text-fg'}`}
      >
        {to}
      </span>
    </div>
  );
}

export function PromoteDrawer({
  deal,
  existingRow,
  onClose,
  onConfirm,
}: PromoteDrawerProps) {
  const initialPreview = useMemo(
    () => (deal ? previewPromote(deal, existingRow) : null),
    [deal, existingRow]
  );

  // Editable fields the user can tweak before confirming
  const [leaseStart, setLeaseStart] = useState('');
  const [leaseTermMonths, setLeaseTermMonths] = useState('');
  const [startingRent, setStartingRent] = useState('');
  const [freeRent, setFreeRent] = useState('');
  const [tiPerSF, setTiPerSF] = useState('');

  useEffect(() => {
    if (initialPreview) {
      setLeaseStart(initialPreview.leaseStart ?? '');
      setLeaseTermMonths(formatIntForInput(initialPreview.leaseTermMonths));
      setStartingRent(formatCurrencyForInput(initialPreview.startingAnnualRentPSF));
      setFreeRent(formatIntForInput(initialPreview.freeRentMonths));
      setTiPerSF(formatCurrencyForInput(initialPreview.tiPerSF));
    }
  }, [initialPreview]);

  if (!deal || !initialPreview) return null;

  const parseN = (v: string): number | null => {
    const t = v.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };
  const parseS = (v: string): string | null => (v.trim() === '' ? null : v.trim());

  const previewedStart = parseS(leaseStart);
  const previewedTerm = parseN(leaseTermMonths);
  const previewedRent = parseN(startingRent);
  const previewedLeaseEnd = computeLeaseEnd(previewedStart, previewedTerm);
  const previewedExpiry = computeExpiryBucket(previewedLeaseEnd);
  const previewedFreeRent = parseN(freeRent);
  const previewedTI = parseN(tiPerSF);
  const previewedAnnualRent =
    initialPreview.leasableSF !== null && previewedRent !== null
      ? Math.round(initialPreview.leasableSF * previewedRent)
      : null;

  const isNew = !existingRow;

  const handleConfirm = () => {
    const finalRow: RentRollRow = {
      ...initialPreview,
      leaseStart: previewedStart,
      leaseTermMonths: previewedTerm,
      leaseEnd: previewedLeaseEnd,
      startingAnnualRentPSF: previewedRent,
      freeRentMonths: previewedFreeRent,
      tiPerSF: previewedTI,
    };
    onConfirm(finalRow, isNew);
  };

  const inputClass =
    'w-full px-3.5 py-2.5 bg-bg rounded-xl text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent transition-all shadow-soft';
  const labelClass = 'block text-xs font-medium text-fg-muted mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="flex-1 bg-fg/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="w-full max-w-2xl bg-bg shadow-lift overflow-y-auto">
        <div className="flex flex-col h-full">
          <div className="sticky top-0 bg-bg/90 backdrop-blur-md border-b border-border px-7 py-5 z-10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-fg-subtle mb-1.5">
                  Promote {isNew ? 'to new Rent Roll row' : 'to existing space'}
                </p>
                <h2 className="text-xl text-fg tracking-[-0.01em] font-semibold truncate">
                  {deal.dealName} · {deal.prospectTenant ?? 'New tenant'}
                </h2>
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge status={deal.status} />
                  {isNew ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-accent-soft text-accent">
                      <CirclePlus size={11} strokeWidth={2} />
                      New row
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
                      <CircleCheck size={11} strokeWidth={2} />
                      Matched · {existingRow!.spaceId}
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
            {/* Read-only summary of identifiers + what changes */}
            <section>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent-tint text-accent">
                  <Building2 size={14} strokeWidth={2} />
                </div>
                <h3 className="text-base font-semibold text-fg tracking-tight">
                  Identifiers & Space
                </h3>
              </div>
              <div className="divide-y divide-border bg-bg-elevated rounded-xl px-4 py-2 shadow-soft">
                <ChangeRow label="Deal Name" to={initialPreview.dealName ?? '–'} />
                <ChangeRow label="Space ID" to={initialPreview.spaceId ?? '–'} />
                <ChangeRow
                  label="Building"
                  to={initialPreview.building ?? '–'}
                />
                <ChangeRow
                  label="Leasable SF"
                  to={formatSF(initialPreview.leasableSF)}
                />
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent-tint text-accent">
                  <Users size={14} strokeWidth={2} />
                </div>
                <h3 className="text-base font-semibold text-fg tracking-tight">
                  Tenant
                </h3>
              </div>
              <div className="divide-y divide-border bg-bg-elevated rounded-xl px-4 py-2 shadow-soft">
                <ChangeRow
                  label="Tenant"
                  from={existingRow?.tenantName ?? undefined}
                  to={initialPreview.tenantName ?? '–'}
                  changed
                />
                <ChangeRow
                  label="Occupied"
                  from={existingRow?.occupied ? 'Yes' : 'No'}
                  to="Yes"
                  changed={!existingRow?.occupied}
                />
                <ChangeRow
                  label="Basis"
                  from={existingRow?.uwBasis ?? undefined}
                  to="Actual"
                  changed={existingRow?.uwBasis !== 'Actual'}
                />
              </div>
            </section>

            {/* Editable: lease terms + rent */}
            <section>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent-tint text-accent">
                  <CalendarClock size={14} strokeWidth={2} />
                </div>
                <h3 className="text-base font-semibold text-fg tracking-tight">
                  Lease Terms <span className="text-xs font-normal text-fg-subtle">— editable</span>
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelClass}>Lease Start</label>
                  <input
                    type="date"
                    value={leaseStart}
                    onChange={(e) => setLeaseStart(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Term (Months)</label>
                  <input
                    type="number"
                    value={leaseTermMonths}
                    onChange={(e) => setLeaseTermMonths(e.target.value)}
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Free Rent (Months)</label>
                  <input
                    type="number"
                    value={freeRent}
                    onChange={(e) => setFreeRent(e.target.value)}
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Computed Lease End</label>
                  <div className="px-3.5 py-2.5 text-sm text-fg-muted tabular-nums bg-bg-subtle rounded-xl">
                    {formatDate(previewedLeaseEnd)}
                    {previewedExpiry && (
                      <span className="text-fg-subtle"> · {previewedExpiry}</span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent-tint text-accent">
                  <DollarSign size={14} strokeWidth={2} />
                </div>
                <h3 className="text-base font-semibold text-fg tracking-tight">
                  Rent & TI <span className="text-xs font-normal text-fg-subtle">— editable</span>
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelClass}>Starting Rent ($/SF)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={startingRent}
                    onChange={(e) => setStartingRent(e.target.value)}
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>TI ($/SF)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tiPerSF}
                    onChange={(e) => setTiPerSF(e.target.value)}
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Computed Annual Rent</label>
                  <div className="px-3.5 py-2.5 text-sm text-fg-muted tabular-nums bg-bg-subtle rounded-xl">
                    {formatMoney(previewedAnnualRent)}
                    {initialPreview.leasableSF !== null && previewedRent !== null && (
                      <span className="text-fg-subtle">
                        {' '}
                        ({formatSF(initialPreview.leasableSF)} × {formatRent(previewedRent)})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="text-xs text-fg-subtle bg-bg-subtle rounded-xl px-4 py-3 leading-relaxed">
              On confirm: the rent roll row will be{' '}
              {isNew ? <strong>created</strong> : <strong>updated</strong>} with the
              values above, and <strong>{deal.dealName}</strong> will be removed
              from Prospects (the executed deal lives in the rent roll from here
              on).
            </section>
          </div>

          <div className="sticky bottom-0 bg-bg/90 backdrop-blur-md border-t border-border px-7 py-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-fg-muted hover:text-fg hover:bg-bg-hover rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-accent text-accent-fg rounded-xl hover:bg-accent-hover transition-colors shadow-soft"
            >
              {isNew ? (
                <>
                  <CirclePlus size={14} strokeWidth={2} />
                  Create Rent Roll Row
                </>
              ) : (
                <>
                  <ArrowRight size={14} strokeWidth={2} />
                  Promote {existingRow?.spaceId}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

