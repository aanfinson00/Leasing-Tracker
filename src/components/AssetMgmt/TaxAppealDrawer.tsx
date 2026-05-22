import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  X,
  Building2,
  CalendarDays,
  DollarSign,
  Gavel,
  NotebookPen,
  Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PropertyTaxAppeal, PropertyTaxAppealStatus } from '../../types';
import { PropertyTaxAppealStatusEnum } from '../../types';

interface TaxAppealDrawerProps {
  appeal: PropertyTaxAppeal | null;
  onClose: () => void;
  onSave: (a: PropertyTaxAppeal) => void;
  onDelete: (id: string) => void;
}

type FormValues = {
  building: string;
  buildingId: string;
  parcelNumber: string;
  jurisdiction: string;
  taxYear: string;
  assessedValue: string;
  proposedValue: string;
  marketValue: string;
  status: PropertyTaxAppealStatus;
  filedDate: string;
  hearingDate: string;
  resolutionDate: string;
  initialAssessedValue: string;
  finalAssessedValue: string;
  estimatedSavings: string;
  consultantName: string;
  consultantFeePct: string;
  consultantFeeDollar: string;
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

export function TaxAppealDrawer({
  appeal,
  onClose,
  onSave,
  onDelete,
}: TaxAppealDrawerProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>();

  useEffect(() => {
    if (appeal) {
      reset({
        building: toFormString(appeal.building),
        buildingId: toFormString(appeal.buildingId),
        parcelNumber: toFormString(appeal.parcelNumber),
        jurisdiction: toFormString(appeal.jurisdiction),
        taxYear: toFormString(appeal.taxYear),
        assessedValue: toFormString(appeal.assessedValue),
        proposedValue: toFormString(appeal.proposedValue),
        marketValue: toFormString(appeal.marketValue),
        status: appeal.status,
        filedDate: toFormString(appeal.filedDate),
        hearingDate: toFormString(appeal.hearingDate),
        resolutionDate: toFormString(appeal.resolutionDate),
        initialAssessedValue: toFormString(appeal.initialAssessedValue),
        finalAssessedValue: toFormString(appeal.finalAssessedValue),
        estimatedSavings: toFormString(appeal.estimatedSavings),
        consultantName: toFormString(appeal.consultantName),
        consultantFeePct: toFormString(
          appeal.consultantFeePct != null ? appeal.consultantFeePct * 100 : null
        ),
        consultantFeeDollar: toFormString(appeal.consultantFeeDollar),
        notes: toFormString(appeal.notes),
      });
    }
  }, [appeal, reset]);

  if (!appeal) return null;

  const onSubmit = (values: FormValues) => {
    const taxYear = parseNum(values.taxYear);
    if (taxYear == null) return;
    const consultantPctPct = parseNum(values.consultantFeePct);
    const updated: PropertyTaxAppeal = {
      id: appeal.id,
      buildingId: parseStr(values.buildingId),
      building: parseStr(values.building),
      parcelNumber: parseStr(values.parcelNumber),
      jurisdiction: parseStr(values.jurisdiction),
      taxYear,
      assessedValue: parseNum(values.assessedValue),
      proposedValue: parseNum(values.proposedValue),
      marketValue: parseNum(values.marketValue),
      status: values.status,
      filedDate: parseStr(values.filedDate),
      hearingDate: parseStr(values.hearingDate),
      resolutionDate: parseStr(values.resolutionDate),
      initialAssessedValue: parseNum(values.initialAssessedValue),
      finalAssessedValue: parseNum(values.finalAssessedValue),
      estimatedSavings: parseNum(values.estimatedSavings),
      consultantName: parseStr(values.consultantName),
      // UI shows % units (30), schema stores fraction (0.30).
      consultantFeePct: consultantPctPct != null ? consultantPctPct / 100 : null,
      consultantFeeDollar: parseNum(values.consultantFeeDollar),
      notes: parseStr(values.notes),
      createdAt: appeal.createdAt,
      updatedAt: new Date().toISOString(),
    };
    onSave(updated);
    onClose();
  };

  const handleDelete = () => {
    const label = appeal.building
      ? `${appeal.building} (tax year ${appeal.taxYear})`
      : `appeal for tax year ${appeal.taxYear}`;
    if (confirm(`Delete ${label}?`)) {
      onDelete(appeal.id);
      onClose();
    }
  };

  const currentBuilding = watch('building') ?? appeal.building ?? 'New appeal';
  const currentYear = watch('taxYear') ?? toFormString(appeal.taxYear);

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
                  {currentBuilding || 'New appeal'}
                </h2>
                {currentYear && (
                  <span className="text-sm text-fg-muted tabular-nums">
                    Tax year {currentYear}
                  </span>
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
                  <label className={labelClass}>Building</label>
                  <input {...register('building')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Building ID</label>
                  <input
                    {...register('buildingId')}
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Parcel Number</label>
                  <input
                    {...register('parcelNumber')}
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Jurisdiction</label>
                  <input
                    {...register('jurisdiction')}
                    placeholder="e.g. Norfolk County, VA"
                    className={inputClass}
                  />
                </div>
              </div>
            </Section>

            <Section icon={Gavel} title="Appeal Status">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelClass}>Tax Year *</label>
                  <input
                    {...register('taxYear', {
                      required: 'Required',
                      validate: (v) => {
                        const n = Number(v);
                        return (
                          (Number.isFinite(n) && n >= 2000 && n <= 2100) ||
                          'Tax year must be between 2000 and 2100'
                        );
                      },
                    })}
                    type="number"
                    className={`${inputClass} tabular-nums`}
                  />
                  {errors.taxYear && (
                    <p className="text-danger text-xs mt-1.5">{errors.taxYear.message}</p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select {...register('status')} className={inputClass}>
                    {PropertyTaxAppealStatusEnum.options.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Section>

            <Section icon={DollarSign} title="Valuation">
              <div className="grid grid-cols-3 gap-3.5">
                <div>
                  <label className={labelClass}>Assessed Value</label>
                  <input
                    {...register('assessedValue')}
                    type="number"
                    step="any"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Our Proposed Value</label>
                  <input
                    {...register('proposedValue')}
                    type="number"
                    step="any"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Independent Market Value</label>
                  <input
                    {...register('marketValue')}
                    type="number"
                    step="any"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
              </div>
            </Section>

            <Section icon={CalendarDays} title="Key Dates">
              <div className="grid grid-cols-3 gap-3.5">
                <div>
                  <label className={labelClass}>Filed</label>
                  <input
                    {...register('filedDate')}
                    type="date"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Hearing</label>
                  <input
                    {...register('hearingDate')}
                    type="date"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Resolution</label>
                  <input
                    {...register('resolutionDate')}
                    type="date"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
              </div>
            </Section>

            <Section icon={DollarSign} title="Settlement / Outcome">
              <div className="grid grid-cols-3 gap-3.5">
                <div>
                  <label className={labelClass}>Initial Assessed</label>
                  <input
                    {...register('initialAssessedValue')}
                    type="number"
                    step="any"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Final Assessed</label>
                  <input
                    {...register('finalAssessedValue')}
                    type="number"
                    step="any"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Estimated Savings</label>
                  <input
                    {...register('estimatedSavings')}
                    type="number"
                    step="any"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
              </div>
            </Section>

            <Section icon={Gavel} title="Consultant / Counsel">
              <div className="grid grid-cols-3 gap-3.5">
                <div className="col-span-3">
                  <label className={labelClass}>Consultant Name</label>
                  <input {...register('consultantName')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Contingency %</label>
                  <input
                    {...register('consultantFeePct')}
                    type="number"
                    step="any"
                    placeholder="30"
                    className={`${inputClass} tabular-nums`}
                  />
                  <p className="text-xs text-fg-subtle mt-1">Stored as fraction (30 → 0.30).</p>
                </div>
                <div>
                  <label className={labelClass}>Flat Fee ($)</label>
                  <input
                    {...register('consultantFeeDollar')}
                    type="number"
                    step="any"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
              </div>
            </Section>

            <Section icon={NotebookPen} title="Notes">
              <textarea
                {...register('notes')}
                rows={4}
                placeholder="Comp set, jurisdiction quirks, prior-year history, anything to remember at hearing."
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
