import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  X,
  Building2,
  Users,
  DollarSign,
  Gift,
  NotebookPen,
  Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Deal, DealStage } from '../types';
import { DealStageEnum } from '../types';
import { StageBadge } from './StageBadge';

interface DealDrawerProps {
  deal: Deal | null;
  onClose: () => void;
  onSave: (deal: Deal) => void;
  onDelete: (id: string) => void;
}

type FormValues = {
  propertyName: string;
  address: string;
  city: string;
  state: string;
  squareFeet: string;
  tenantName: string;
  stage: DealStage;
  targetCloseDate: string;
  broker: string;
  brokerCommissionPct: string;
  baseRentPSF: string;
  leaseStartDate: string;
  leaseEndDate: string;
  termMonths: string;
  rentEscalationPct: string;
  nnnPSF: string;
  tiAllowancePSF: string;
  freeRentMonths: string;
  renewalOptions: string;
  expansionRights: string;
  notes: string;
  lastModifiedBy: string;
};

const toFormString = (v: string | number | null | undefined): string => {
  if (v === null || v === undefined) return '';
  return String(v);
};

const parseNum = (v: string): number | null => {
  if (!v || v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const parseStr = (v: string): string | null => {
  const trimmed = v.trim();
  return trimmed === '' ? null : trimmed;
};

const inputClass =
  'w-full px-3.5 py-2.5 bg-bg rounded-xl text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent transition-all shadow-soft';
const labelClass = 'block text-[11px] font-medium text-fg-subtle mb-1.5 uppercase tracking-[0.1em]';

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
        propertyName: deal.propertyName,
        address: deal.address,
        city: deal.city,
        state: deal.state,
        squareFeet: toFormString(deal.squareFeet),
        tenantName: deal.tenantName,
        stage: deal.stage,
        targetCloseDate: toFormString(deal.targetCloseDate),
        broker: toFormString(deal.broker),
        brokerCommissionPct: toFormString(deal.brokerCommissionPct),
        baseRentPSF: toFormString(deal.baseRentPSF),
        leaseStartDate: toFormString(deal.leaseStartDate),
        leaseEndDate: toFormString(deal.leaseEndDate),
        termMonths: toFormString(deal.termMonths),
        rentEscalationPct: toFormString(deal.rentEscalationPct),
        nnnPSF: toFormString(deal.nnnPSF),
        tiAllowancePSF: toFormString(deal.tiAllowancePSF),
        freeRentMonths: toFormString(deal.freeRentMonths),
        renewalOptions: toFormString(deal.renewalOptions),
        expansionRights: toFormString(deal.expansionRights),
        notes: toFormString(deal.notes),
        lastModifiedBy: toFormString(deal.lastModifiedBy),
      });
    }
  }, [deal, reset]);

  if (!deal) return null;

  const onSubmit = (values: FormValues) => {
    const updated: Deal = {
      id: deal.id,
      propertyName: values.propertyName.trim(),
      address: values.address.trim(),
      city: values.city.trim(),
      state: values.state.trim(),
      squareFeet: parseNum(values.squareFeet),
      tenantName: values.tenantName.trim(),
      stage: values.stage,
      targetCloseDate: parseStr(values.targetCloseDate),
      broker: parseStr(values.broker),
      brokerCommissionPct: parseNum(values.brokerCommissionPct),
      baseRentPSF: parseNum(values.baseRentPSF),
      leaseStartDate: parseStr(values.leaseStartDate),
      leaseEndDate: parseStr(values.leaseEndDate),
      termMonths: parseNum(values.termMonths),
      rentEscalationPct: parseNum(values.rentEscalationPct),
      nnnPSF: parseNum(values.nnnPSF),
      tiAllowancePSF: parseNum(values.tiAllowancePSF),
      freeRentMonths: parseNum(values.freeRentMonths),
      renewalOptions: parseStr(values.renewalOptions),
      expansionRights: parseStr(values.expansionRights),
      notes: parseStr(values.notes),
      lastModifiedBy: parseStr(values.lastModifiedBy),
      lastModifiedAt: new Date().toISOString(),
    };
    onSave(updated);
    onClose();
  };

  const handleDelete = () => {
    if (confirm(`Delete deal for "${deal.propertyName || 'this property'}"?`)) {
      onDelete(deal.id);
      onClose();
    }
  };

  const currentName = watch('propertyName') ?? deal.propertyName;
  const currentStage = (watch('stage') ?? deal.stage) as DealStage;

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
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-fg-subtle mb-1.5">
                  {deal.propertyName ? 'Edit Deal' : 'New Deal'}
                </p>
                <h2 className="text-xl text-fg tracking-[-0.01em] font-semibold truncate">
                  {currentName || 'Untitled Property'}
                </h2>
                <div className="mt-2">
                  <StageBadge stage={currentStage} />
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

          <div className="flex-1 px-7 py-6">
            <Section icon={Building2} title="Property">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="col-span-2">
                  <label className={labelClass}>Property Name *</label>
                  <input
                    {...register('propertyName', { required: 'Required' })}
                    className={inputClass}
                  />
                  {errors.propertyName && (
                    <p className="text-danger text-xs mt-1.5">{errors.propertyName.message}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Address</label>
                  <input {...register('address')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>City</label>
                  <input {...register('city')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <input {...register('state')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Square Feet</label>
                  <input
                    {...register('squareFeet')}
                    type="number"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
              </div>
            </Section>

            <Section icon={Users} title="Tenant & Pipeline">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="col-span-2">
                  <label className={labelClass}>Tenant Name *</label>
                  <input
                    {...register('tenantName', { required: 'Required' })}
                    className={inputClass}
                  />
                  {errors.tenantName && (
                    <p className="text-danger text-xs mt-1.5">{errors.tenantName.message}</p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Stage</label>
                  <select {...register('stage')} className={inputClass}>
                    {DealStageEnum.options.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Target Close Date</label>
                  <input {...register('targetCloseDate')} type="date" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Broker</label>
                  <input {...register('broker')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Broker Commission %</label>
                  <input
                    {...register('brokerCommissionPct')}
                    type="number"
                    step="0.01"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
              </div>
            </Section>

            <Section icon={DollarSign} title="Economics">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelClass}>Base Rent $/SF</label>
                  <input
                    {...register('baseRentPSF')}
                    type="number"
                    step="0.01"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>NNN $/SF</label>
                  <input
                    {...register('nnnPSF')}
                    type="number"
                    step="0.01"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Lease Start</label>
                  <input {...register('leaseStartDate')} type="date" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Lease End</label>
                  <input {...register('leaseEndDate')} type="date" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Term (Months)</label>
                  <input
                    {...register('termMonths')}
                    type="number"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Annual Escalation %</label>
                  <input
                    {...register('rentEscalationPct')}
                    type="number"
                    step="0.01"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
              </div>
            </Section>

            <Section icon={Gift} title="Concessions & Options">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelClass}>TI Allowance $/SF</label>
                  <input
                    {...register('tiAllowancePSF')}
                    type="number"
                    step="0.01"
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
                <div className="col-span-2">
                  <label className={labelClass}>Renewal Options</label>
                  <input {...register('renewalOptions')} className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Expansion Rights</label>
                  <input {...register('expansionRights')} className={inputClass} />
                </div>
              </div>
            </Section>

            <Section icon={NotebookPen} title="Notes">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="col-span-2">
                  <label className={labelClass}>Notes</label>
                  <textarea {...register('notes')} rows={4} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Last Modified By</label>
                  <input {...register('lastModifiedBy')} className={inputClass} />
                </div>
              </div>
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
