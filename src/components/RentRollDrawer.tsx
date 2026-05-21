import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  X,
  Building2,
  Users,
  DollarSign,
  CalendarClock,
  NotebookPen,
  Trash2,
  Activity as ActivityIcon,
  ListChecks,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ActivityEntry, RentRollRow, UWBasis } from '../types';
import { UWBasisEnum } from '../types';
import { ActivityLog } from './ActivityLog';

interface RentRollDrawerProps {
  row: RentRollRow | null;
  activities: ActivityEntry[];
  onClose: () => void;
  onSave: (row: RentRollRow) => void;
  onDelete: (id: string) => void;
  onAddActivity: (entry: Omit<ActivityEntry, 'id' | 'createdAt'>) => void;
  onDeleteActivity: (id: string) => void;
}

type FormValues = {
  dealId: string;
  dealName: string;
  buildingId: string;
  spaceId: string;
  building: string;
  market: string;
  propertyType: string;
  buildingType: string;
  tenantName: string;
  tenantRating: string;
  occupied: 'Yes' | 'No';
  uwBasis: UWBasis | '';
  leasableSF: string;
  leaseStart: string;
  leaseTermMonths: string;
  leaseEnd: string;
  freeRentMonths: string;
  annualRentBumpsPct: string;
  expiryYearBucket: string;
  tiPerSF: string;
  tiNote: string;
  uwTiPerSF: string;
  commissionStructurePct: string;
  commissionDollar: string;
  lastRevalUWRent: string;
  startingAnnualRentPSF: string;
  annualRent: string;
  currentSummary: string;
  notes: string;
};

const toFormString = (v: string | number | null | undefined): string => {
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

export function RentRollDrawer({
  row,
  activities,
  onClose,
  onSave,
  onDelete,
  onAddActivity,
  onDeleteActivity,
}: RentRollDrawerProps) {
  const { register, handleSubmit, reset, watch } = useForm<FormValues>();

  useEffect(() => {
    if (row) {
      reset({
        dealId: toFormString(row.dealId),
        dealName: toFormString(row.dealName),
        buildingId: toFormString(row.buildingId),
        spaceId: toFormString(row.spaceId),
        building: toFormString(row.building),
        market: toFormString(row.market),
        propertyType: toFormString(row.propertyType),
        buildingType: toFormString(row.buildingType),
        tenantName: toFormString(row.tenantName),
        tenantRating: toFormString(row.tenantRating),
        occupied: row.occupied ? 'Yes' : 'No',
        uwBasis: row.uwBasis ?? '',
        leasableSF: toFormString(row.leasableSF),
        leaseStart: toFormString(row.leaseStart),
        leaseTermMonths: toFormString(row.leaseTermMonths),
        leaseEnd: toFormString(row.leaseEnd),
        freeRentMonths: toFormString(row.freeRentMonths),
        annualRentBumpsPct: toFormString(row.annualRentBumpsPct),
        expiryYearBucket: toFormString(row.expiryYearBucket),
        tiPerSF: toFormString(row.tiPerSF),
        tiNote: toFormString(row.tiNote),
        uwTiPerSF: toFormString(row.uwTiPerSF),
        commissionStructurePct: toFormString(row.commissionStructurePct),
        commissionDollar: toFormString(row.commissionDollar),
        lastRevalUWRent: toFormString(row.lastRevalUWRent),
        startingAnnualRentPSF: toFormString(row.startingAnnualRentPSF),
        annualRent: toFormString(row.annualRent),
        currentSummary: toFormString(row.currentSummary),
        notes: toFormString(row.notes),
      });
    }
  }, [row, reset]);

  if (!row) return null;

  const onSubmit = (v: FormValues) => {
    const updated: RentRollRow = {
      id: row.id,
      dealId: parseStr(v.dealId),
      dealName: parseStr(v.dealName),
      buildingId: parseStr(v.buildingId),
      spaceId: parseStr(v.spaceId),
      building: parseStr(v.building),
      market: parseStr(v.market),
      propertyType: parseStr(v.propertyType),
      buildingType: parseStr(v.buildingType),
      tenantName: parseStr(v.tenantName),
      tenantRating: parseNum(v.tenantRating),
      occupied: v.occupied === 'Yes',
      uwBasis: v.uwBasis === '' ? null : v.uwBasis,
      leasableSF: parseNum(v.leasableSF),
      leaseStart: parseStr(v.leaseStart),
      leaseTermMonths: parseNum(v.leaseTermMonths),
      leaseEnd: parseStr(v.leaseEnd),
      freeRentMonths: parseNum(v.freeRentMonths),
      annualRentBumpsPct: parseNum(v.annualRentBumpsPct),
      expiryYearBucket: parseStr(v.expiryYearBucket),
      tiPerSF: parseNum(v.tiPerSF),
      tiNote: parseStr(v.tiNote),
      uwTiPerSF: parseNum(v.uwTiPerSF),
      specOffice: row.specOffice,
      commissionStructurePct: parseNum(v.commissionStructurePct),
      commissionDollar: parseNum(v.commissionDollar),
      lastRevalUWRent: parseNum(v.lastRevalUWRent),
      startingAnnualRentPSF: parseNum(v.startingAnnualRentPSF),
      inPlaceRent: row.inPlaceRent,
      annualRent: parseNum(v.annualRent),
      currentSummary: parseStr(v.currentSummary),
      notes: parseStr(v.notes),
    };
    onSave(updated);
    onClose();
  };

  const handleDelete = () => {
    if (confirm('Delete this rent roll row?')) {
      onDelete(row.id);
      onClose();
    }
  };

  const currentDeal = watch('dealName') ?? row.dealName ?? '';
  const currentSpace = watch('spaceId') ?? row.spaceId ?? '';
  const occupied = (watch('occupied') ?? (row.occupied ? 'Yes' : 'No')) === 'Yes';

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-fg/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="w-full max-w-2xl bg-bg shadow-lift overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
          <div className="sticky top-0 bg-bg/90 backdrop-blur-md border-b border-border px-7 py-5 z-10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex items-center gap-3 flex-wrap">
                <h2 className="text-xl text-fg tracking-[-0.01em] font-semibold truncate">
                  {currentDeal || 'Rent Roll'}
                  {currentSpace && (
                    <span className="text-fg-subtle text-base font-normal tabular-nums ml-2">
                      · {currentSpace}
                    </span>
                  )}
                </h2>
                <span
                  className={[
                    'inline-flex items-center px-2.5 py-0.5 text-[11px] font-medium rounded-full',
                    occupied
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
                  ].join(' ')}
                >
                  {occupied ? 'Occupied' : 'Vacant'}
                </span>
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
            <Section icon={ListChecks} title="Current Summary">
              <textarea
                {...register('currentSummary')}
                rows={3}
                placeholder="Current tenant state — renewal posture, expansion request, defaults, etc."
                className={inputClass}
              />
            </Section>

            <Section icon={Building2} title="Property">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="col-span-2">
                  <label className={labelClass}>Deal Name</label>
                  <input {...register('dealName')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Market</label>
                  <input {...register('market')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Property Type</label>
                  <input {...register('propertyType')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Deal ID</label>
                  <input {...register('dealId')} className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>Building ID</label>
                  <input {...register('buildingId')} className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>Space ID</label>
                  <input {...register('spaceId')} className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>Building</label>
                  <input {...register('building')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Building Type</label>
                  <input {...register('buildingType')} placeholder="Rear Load, Front Load, Cross Dock" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Leasable SF</label>
                  <input {...register('leasableSF')} type="number" className={`${inputClass} tabular-nums`} />
                </div>
              </div>
            </Section>

            <Section icon={Users} title="Tenant">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="col-span-2">
                  <label className={labelClass}>Tenant Name</label>
                  <input {...register('tenantName')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Rating (1-5)</label>
                  <input {...register('tenantRating')} type="number" min="0" max="5" className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>Occupied</label>
                  <select {...register('occupied')} className={inputClass}>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Basis</label>
                  <select {...register('uwBasis')} className={inputClass}>
                    <option value="">—</option>
                    {UWBasisEnum.options.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Section>

            <Section icon={CalendarClock} title="Lease Terms">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelClass}>Lease Start</label>
                  <input {...register('leaseStart')} type="date" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Lease End</label>
                  <input {...register('leaseEnd')} type="date" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Term (Months)</label>
                  <input {...register('leaseTermMonths')} type="number" className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>Free Rent (Months)</label>
                  <input {...register('freeRentMonths')} type="number" className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>Annual Rent Bumps (%)</label>
                  <input {...register('annualRentBumpsPct')} type="number" step="0.01" className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>Expiry Year Bucket</label>
                  <input {...register('expiryYearBucket')} placeholder="2030, 2032+, …" className={inputClass} />
                </div>
              </div>
            </Section>

            <Section icon={DollarSign} title="Rent & Costs">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelClass}>Starting Rent ($/SF)</label>
                  <input {...register('startingAnnualRentPSF')} type="number" step="0.01" className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>Last Reval UW Rent ($/SF)</label>
                  <input {...register('lastRevalUWRent')} type="number" step="0.01" className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>Annual Rent ($)</label>
                  <input {...register('annualRent')} type="number" className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>TI ($/SF)</label>
                  <input {...register('tiPerSF')} type="number" step="0.01" className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>UW TI ($/SF)</label>
                  <input
                    {...register('uwTiPerSF')}
                    type="number"
                    step="0.01"
                    placeholder="Underwritten"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>TI Note</label>
                  <input {...register('tiNote')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Commission Structure (%)</label>
                  <input {...register('commissionStructurePct')} type="number" step="0.01" className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>Commission ($)</label>
                  <input {...register('commissionDollar')} type="number" className={`${inputClass} tabular-nums`} />
                </div>
              </div>
            </Section>

            <Section icon={NotebookPen} title="Notes">
              <textarea {...register('notes')} rows={4} className={inputClass} />
            </Section>

            <Section icon={ActivityIcon} title="Activity">
              <ActivityLog
                parentType="rentroll"
                parentId={row.id}
                entries={activities}
                onAdd={onAddActivity}
                onDelete={onDeleteActivity}
              />
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
