import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  X,
  Building2,
  Users,
  DollarSign,
  CalendarDays,
  Link2,
  NotebookPen,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { LeaseComp, CompConfidence, TransactionType, RentType } from '../../types';
import {
  CompConfidenceEnum,
  TransactionTypeEnum,
  RentTypeEnum,
} from '../../types';

interface CompDrawerProps {
  comp: LeaseComp | null;
  onClose: () => void;
  onSave: (c: LeaseComp) => void;
  onDelete: (id: string) => void;
}

type FormValues = {
  propertyName: string;
  buildingAddress: string;
  market: string;
  propertyType: string;
  buildingType: string;
  tenantName: string;
  tenantIndustry: string;
  transactionType: TransactionType | '';
  signedDate: string;
  deliveryDate: string;
  leaseSF: string;
  buildingSF: string;
  baseRentPSF: string;
  effectiveRentPSF: string;
  rentType: RentType | '';
  termMonths: string;
  freeRentMonths: string;
  tiPSF: string;
  escalationPct: string;
  options: string;
  source: string;
  sourceUrl: string;
  confidence: CompConfidence;
  confidential: boolean;
  notes: string;
};

const toStr = (v: string | number | null | undefined): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return String(v);
    return parseFloat(v.toFixed(6)).toString();
  }
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

export function CompDrawer({ comp, onClose, onSave, onDelete }: CompDrawerProps) {
  const { register, handleSubmit, reset, watch } = useForm<FormValues>();

  useEffect(() => {
    if (comp) {
      reset({
        propertyName: toStr(comp.propertyName),
        buildingAddress: toStr(comp.buildingAddress),
        market: toStr(comp.market),
        propertyType: toStr(comp.propertyType),
        buildingType: toStr(comp.buildingType),
        tenantName: toStr(comp.tenantName),
        tenantIndustry: toStr(comp.tenantIndustry),
        transactionType: comp.transactionType ?? '',
        signedDate: toStr(comp.signedDate),
        deliveryDate: toStr(comp.deliveryDate),
        leaseSF: toStr(comp.leaseSF),
        buildingSF: toStr(comp.buildingSF),
        baseRentPSF: toStr(comp.baseRentPSF),
        effectiveRentPSF: toStr(comp.effectiveRentPSF),
        rentType: comp.rentType ?? '',
        termMonths: toStr(comp.termMonths),
        freeRentMonths: toStr(comp.freeRentMonths),
        tiPSF: toStr(comp.tiPSF),
        // % UI; fraction stored.
        escalationPct: toStr(comp.escalationPct != null ? comp.escalationPct * 100 : null),
        options: toStr(comp.options),
        source: toStr(comp.source),
        sourceUrl: toStr(comp.sourceUrl),
        confidence: comp.confidence,
        confidential: comp.confidential,
        notes: toStr(comp.notes),
      });
    }
  }, [comp, reset]);

  if (!comp) return null;

  const onSubmit = (v: FormValues) => {
    const escalationPctPct = parseNum(v.escalationPct);
    const updated: LeaseComp = {
      id: comp.id,
      propertyName: parseStr(v.propertyName),
      buildingAddress: parseStr(v.buildingAddress),
      market: parseStr(v.market),
      propertyType: parseStr(v.propertyType),
      buildingType: parseStr(v.buildingType),
      tenantName: parseStr(v.tenantName),
      tenantIndustry: parseStr(v.tenantIndustry),
      transactionType: v.transactionType === '' ? null : v.transactionType,
      signedDate: parseStr(v.signedDate),
      deliveryDate: parseStr(v.deliveryDate),
      leaseSF: parseNum(v.leaseSF),
      buildingSF: parseNum(v.buildingSF),
      baseRentPSF: parseNum(v.baseRentPSF),
      effectiveRentPSF: parseNum(v.effectiveRentPSF),
      rentType: v.rentType === '' ? null : v.rentType,
      termMonths: parseNum(v.termMonths) != null ? Math.round(parseNum(v.termMonths)!) : null,
      freeRentMonths: parseNum(v.freeRentMonths),
      tiPSF: parseNum(v.tiPSF),
      escalationPct: escalationPctPct != null ? escalationPctPct / 100 : null,
      options: parseStr(v.options),
      source: parseStr(v.source),
      sourceUrl: parseStr(v.sourceUrl),
      confidence: v.confidence,
      confidential: !!v.confidential,
      notes: parseStr(v.notes),
      createdAt: comp.createdAt,
      updatedAt: new Date().toISOString(),
    };
    onSave(updated);
    onClose();
  };

  const handleDelete = () => {
    const label = comp.propertyName || comp.tenantName || 'this comp';
    if (confirm(`Delete ${label}?`)) {
      onDelete(comp.id);
      onClose();
    }
  };

  const currentTitle = watch('propertyName') ?? comp.propertyName ?? 'New comp';
  const currentTenant = watch('tenantName') ?? comp.tenantName ?? '';

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-fg/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="w-full max-w-2xl bg-bg shadow-lift overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
          <div className="sticky top-0 bg-bg/90 backdrop-blur-md border-b border-border px-7 py-5 z-10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl text-fg tracking-[-0.01em] font-semibold truncate">
                  {currentTitle || 'New comp'}
                </h2>
                {currentTenant && (
                  <p className="text-sm text-fg-muted mt-0.5">{currentTenant}</p>
                )}
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
                  <label className={labelClass}>Property Name</label>
                  <input {...register('propertyName')} className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Address</label>
                  <input {...register('buildingAddress')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Market</label>
                  <input {...register('market')} placeholder="e.g. Atlanta South" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Property Type</label>
                  <input {...register('propertyType')} placeholder="Industrial / Flex / Office" className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Building Type</label>
                  <input {...register('buildingType')} placeholder="Rear Load, Front Load, Cross Dock" className={inputClass} />
                </div>
              </div>
            </Section>

            <Section icon={Users} title="Tenant & Transaction">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelClass}>Tenant Name</label>
                  <input {...register('tenantName')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Tenant Industry</label>
                  <input {...register('tenantIndustry')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Transaction Type</label>
                  <select {...register('transactionType')} className={inputClass}>
                    <option value="">—</option>
                    {TransactionTypeEnum.options.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Rent Type</label>
                  <select {...register('rentType')} className={inputClass}>
                    <option value="">—</option>
                    {RentTypeEnum.options.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Section>

            <Section icon={CalendarDays} title="Dates">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelClass}>Signed Date</label>
                  <input {...register('signedDate')} type="date" className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>Delivery Date</label>
                  <input {...register('deliveryDate')} type="date" className={`${inputClass} tabular-nums`} />
                </div>
              </div>
            </Section>

            <Section icon={DollarSign} title="Economics">
              <div className="grid grid-cols-3 gap-3.5">
                <div>
                  <label className={labelClass}>Lease SF</label>
                  <input {...register('leaseSF')} type="number" step="any" className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>Building SF</label>
                  <input {...register('buildingSF')} type="number" step="any" className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>Term (months)</label>
                  <input {...register('termMonths')} type="number" className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>Base Rent $/SF</label>
                  <input {...register('baseRentPSF')} type="number" step="any" className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>Effective Rent $/SF</label>
                  <input {...register('effectiveRentPSF')} type="number" step="any" className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>Escalation %</label>
                  <input {...register('escalationPct')} type="number" step="any" placeholder="3" className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>Free Rent (months)</label>
                  <input {...register('freeRentMonths')} type="number" step="any" className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>TI $/SF</label>
                  <input {...register('tiPSF')} type="number" step="any" className={`${inputClass} tabular-nums`} />
                </div>
                <div className="col-span-3">
                  <label className={labelClass}>Options</label>
                  <input {...register('options')} placeholder="2 x 5 yrs at FMV" className={inputClass} />
                </div>
              </div>
            </Section>

            <Section icon={Link2} title="Source">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="col-span-2">
                  <label className={labelClass}>Source</label>
                  <input {...register('source')} placeholder="JLL Q4 2025 Industrial Report" className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Source URL</label>
                  <input {...register('sourceUrl')} type="url" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Confidence</label>
                  <select {...register('confidence')} className={inputClass}>
                    {CompConfidenceEnum.options.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="inline-flex items-center gap-2 text-sm text-fg-muted cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('confidential')}
                      className="rounded border-border accent-accent"
                    />
                    <ShieldCheck size={14} strokeWidth={1.75} className="text-fg-muted" />
                    <span>Confidential / off-the-record</span>
                  </label>
                </div>
              </div>
            </Section>

            <Section icon={NotebookPen} title="Notes">
              <textarea
                {...register('notes')}
                rows={4}
                placeholder="Concessions, structure quirks, broker color, anything that contextualizes the headline numbers."
                className={inputClass}
              />
            </Section>
          </div>

          <div className="sticky bottom-0 bg-bg/90 backdrop-blur-md border-t border-border px-7 py-4 flex items-center justify-between">
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-danger hover:bg-danger/10 rounded-xl transition-colors"
            >
              <Trash2 size={15} strokeWidth={1.75} />
              Delete
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-fg-muted hover:text-fg hover:bg-bg-hover rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-sm font-semibold text-accent-fg bg-accent rounded-xl hover:bg-accent-hover transition-colors shadow-soft"
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
