import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  X,
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  NotebookPen,
  Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Deal, DealStatus, Priority } from '../types';
import { DealStatusEnum, PriorityEnum } from '../types';
import { StatusBadge } from './StatusBadge';

interface DealDrawerProps {
  deal: Deal | null;
  onClose: () => void;
  onSave: (deal: Deal) => void;
  onDelete: (id: string) => void;
}

type FormValues = {
  dealName: string;
  spaceId: string;
  building: string;
  dealId: string;
  minSF: string;
  maxSF: string;
  prospectTenant: string;
  brokerRep: string;
  transaction: string;
  status: DealStatus;
  lastRevalUWRent: string;
  targetRent: string;
  proposedTermMonths: string;
  freeRentMonths: string;
  tiPerSF: string;
  tiNote: string;
  probabilityPct: string;
  expectedStart: string;
  lastUpdated: string;
  priority: Priority;
  notes: string;
};

const toFormString = (v: string | number | null | undefined): string => {
  if (v === null || v === undefined) return '';
  return String(v);
};

const parseNum = (v: string): number | null => {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

const parseStr = (v: string): string | null => {
  const t = v.trim();
  return t === '' ? null : t;
};

const inputClass =
  'w-full px-3.5 py-2.5 bg-bg rounded-xl text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent transition-all shadow-soft';
const labelClass = 'block text-xs font-medium text-fg-muted mb-1.5';

interface SectionProps {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}

function Section({ icon: Icon, title, children }: SectionProps) {
  return (
    <section className="pt-7 mt-7 border-t border-border first:border-t-0 first:pt-0 first:mt-0">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent-tint text-accent">
          <Icon size={14} strokeWidth={2} />
        </div>
        <h3 className="text-base font-semibold text-fg tracking-tight">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function DealDrawer({ deal, onClose, onSave, onDelete }: DealDrawerProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>();

  useEffect(() => {
    if (deal) {
      reset({
        dealName: deal.dealName,
        spaceId: toFormString(deal.spaceId),
        building: toFormString(deal.building),
        dealId: toFormString(deal.dealId),
        minSF: toFormString(deal.minSF),
        maxSF: toFormString(deal.maxSF),
        prospectTenant: toFormString(deal.prospectTenant),
        brokerRep: toFormString(deal.brokerRep),
        transaction: toFormString(deal.transaction),
        status: deal.status,
        lastRevalUWRent: toFormString(deal.lastRevalUWRent),
        targetRent: toFormString(deal.targetRent),
        proposedTermMonths: toFormString(deal.proposedTermMonths),
        freeRentMonths: toFormString(deal.freeRentMonths),
        tiPerSF: toFormString(deal.tiPerSF),
        tiNote: toFormString(deal.tiNote),
        probabilityPct: toFormString(deal.probabilityPct),
        expectedStart: toFormString(deal.expectedStart),
        lastUpdated: toFormString(deal.lastUpdated),
        priority: deal.priority,
        notes: toFormString(deal.notes),
      });
    }
  }, [deal, reset]);

  if (!deal) return null;

  const onSubmit = (values: FormValues) => {
    const updated: Deal = {
      id: deal.id,
      dealName: values.dealName.trim(),
      spaceId: parseStr(values.spaceId),
      building: parseStr(values.building),
      dealId: parseStr(values.dealId),
      minSF: parseNum(values.minSF),
      maxSF: parseNum(values.maxSF) ?? parseNum(values.minSF),
      prospectTenant: parseStr(values.prospectTenant),
      brokerRep: parseStr(values.brokerRep),
      transaction: parseStr(values.transaction),
      status: values.status,
      lastRevalUWRent: parseNum(values.lastRevalUWRent),
      targetRent: parseNum(values.targetRent),
      proposedTermMonths: parseNum(values.proposedTermMonths),
      freeRentMonths: parseNum(values.freeRentMonths),
      tiPerSF: parseNum(values.tiPerSF),
      tiNote: parseStr(values.tiNote),
      probabilityPct: parseNum(values.probabilityPct),
      expectedStart: parseStr(values.expectedStart),
      lastUpdated: parseStr(values.lastUpdated) ?? new Date().toISOString().slice(0, 10),
      priority: values.priority,
      notes: parseStr(values.notes),
    };
    onSave(updated);
    onClose();
  };

  const handleDelete = () => {
    if (confirm(`Delete deal "${deal.dealName || 'this deal'}"?`)) {
      onDelete(deal.id);
      onClose();
    }
  };

  const currentName = watch('dealName') ?? deal.dealName;
  const currentStatus = (watch('status') ?? deal.status) as DealStatus;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="flex-1 bg-fg/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close drawer"
      />
      <div className="w-full max-w-2xl bg-bg shadow-lift overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
          <div className="sticky top-0 bg-bg/90 backdrop-blur-md border-b border-border px-7 py-5 z-10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex items-center gap-3 flex-wrap">
                <h2 className="text-xl text-fg tracking-[-0.01em] font-semibold truncate">
                  {currentName || 'New Deal'}
                </h2>
                <StatusBadge status={currentStatus} />
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

          <div className="flex-1 px-7 py-6">
            <Section icon={Building2} title="Property & Identifiers">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="col-span-2">
                  <label className={labelClass}>Deal Name *</label>
                  <input
                    {...register('dealName', { required: 'Required' })}
                    className={inputClass}
                  />
                  {errors.dealName && (
                    <p className="text-danger text-xs mt-1.5">{errors.dealName.message}</p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Deal ID</label>
                  <input {...register('dealId')} className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>Building</label>
                  <input {...register('building')} className={`${inputClass} tabular-nums`} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Space ID</label>
                  <input {...register('spaceId')} className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>Min SF</label>
                  <input
                    {...register('minSF')}
                    type="number"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Max SF</label>
                  <input
                    {...register('maxSF')}
                    type="number"
                    className={`${inputClass} tabular-nums`}
                    placeholder="Same as Min if exact"
                  />
                </div>
              </div>
            </Section>

            <Section icon={Users} title="Prospect & Pipeline">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="col-span-2">
                  <label className={labelClass}>Prospect / Tenant</label>
                  <input {...register('prospectTenant')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Broker / Rep</label>
                  <input {...register('brokerRep')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Transaction Type</label>
                  <input
                    {...register('transaction')}
                    placeholder="New Lease, Expansion, BTS…"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select {...register('status')} className={inputClass}>
                    {DealStatusEnum.options.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Priority</label>
                  <select {...register('priority')} className={inputClass}>
                    {PriorityEnum.options.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Section>

            <Section icon={DollarSign} title="Economics">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelClass}>Last Reval UW Rent ($/SF)</label>
                  <input
                    {...register('lastRevalUWRent')}
                    type="number"
                    step="0.01"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Target Rent ($/SF)</label>
                  <input
                    {...register('targetRent')}
                    type="number"
                    step="0.01"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Proposed Term (Months)</label>
                  <input
                    {...register('proposedTermMonths')}
                    type="number"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Free Rent (Months)</label>
                  <input
                    {...register('freeRentMonths')}
                    type="number"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>TI ($/SF)</label>
                  <input
                    {...register('tiPerSF')}
                    type="number"
                    step="0.01"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>TI Note</label>
                  <input
                    {...register('tiNote')}
                    placeholder='e.g. "Minimal Addt’l TI"'
                    className={inputClass}
                  />
                </div>
              </div>
            </Section>

            <Section icon={TrendingUp} title="Forecast">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelClass}>Probability of Lease (%)</label>
                  <input
                    {...register('probabilityPct')}
                    type="number"
                    min="0"
                    max="100"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Expected Start</label>
                  <input {...register('expectedStart')} type="date" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Last Updated</label>
                  <input {...register('lastUpdated')} type="date" className={inputClass} />
                </div>
              </div>
            </Section>

            <Section icon={NotebookPen} title="Notes">
              <textarea {...register('notes')} rows={5} className={inputClass} />
            </Section>
          </div>

          <div className="sticky bottom-0 bg-bg/90 backdrop-blur-md border-t border-border px-7 py-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-danger hover:bg-danger/10 rounded-lg transition-colors"
            >
              <Trash2 size={14} strokeWidth={1.75} />
              Delete
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-fg-muted hover:text-fg hover:bg-bg-hover rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-semibold bg-accent text-accent-fg rounded-xl hover:bg-accent-hover transition-colors shadow-soft"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
