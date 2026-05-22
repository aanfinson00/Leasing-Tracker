import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import {
  X,
  Crosshair,
  Building2,
  CalendarDays,
  DollarSign,
  TrendingUp,
  NotebookPen,
  Trash2,
  AlertTriangle,
  Workflow,
  UserSquare,
  Activity as ActivityIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  AcquisitionStatus,
  AcquisitionTarget,
  AcquisitionTargetContact,
  AcquisitionTargetNote,
  Contact,
  RiskLevel,
} from '../../types';
import {
  ACQ_PIPELINE_ORDER,
  AcquisitionStatusEnum,
  RiskLevelEnum,
} from '../../types';
import { CrmContactsPanel } from '../CRM/CrmContactsPanel';
import { CrmNotesLog } from '../CRM/CrmNotesLog';

interface AcquisitionTargetDrawerProps {
  target: AcquisitionTarget | null;
  onClose: () => void;
  onSave: (a: AcquisitionTarget) => void;
  onDelete: (id: string) => void;
  // CRM
  allContacts: Contact[];
  contactLinks: AcquisitionTargetContact[];
  notes: AcquisitionTargetNote[];
  onSaveContact: (c: Contact) => void;
  onLinkContact: (link: AcquisitionTargetContact) => void;
  onUnlinkContact: (linkId: string) => void;
  onSaveNote: (n: AcquisitionTargetNote) => void;
  onDeleteNote: (id: string) => void;
}

type FormValues = {
  targetName: string;
  market: string;
  address: string;
  propertyType: string;
  status: AcquisitionStatus;
  acres: string;
  buildingCount: string;
  totalSF: string;
  askingPrice: string;
  ourOffer: string;
  earnestMoney: string;
  closingCostsEstimate: string;
  rehabBudget: string;
  underwrittenIRR: string;     // % units
  underwrittenEquityMultiple: string;
  firstContactedDate: string;
  loiDate: string;
  psaDate: string;
  expectedClosingDate: string;
  actualClosingDate: string;
  riskLevel: RiskLevel;
  statusSummary: string;
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

// Stepper for the happy-path 6 acquisition statuses. On Hold / Lost
// are off-flow and live in the dropdown below.
function StatusStepper({
  current,
  onChange,
}: {
  current: AcquisitionStatus;
  onChange: (s: AcquisitionStatus) => void;
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {ACQ_PIPELINE_ORDER.map((s, idx) => {
        const isCurrent = current === s;
        const currentIdx = ACQ_PIPELINE_ORDER.indexOf(current);
        const done = currentIdx > -1 && idx < currentIdx;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={[
              'px-2.5 py-1 text-xs font-medium rounded-lg transition-colors',
              isCurrent
                ? 'bg-accent text-accent-fg'
                : done
                  ? 'bg-accent-tint text-accent'
                  : 'text-fg-muted hover:text-fg hover:bg-bg-hover',
            ].join(' ')}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}

export function AcquisitionTargetDrawer({
  target,
  onClose,
  onSave,
  onDelete,
  allContacts,
  contactLinks,
  notes,
  onSaveContact,
  onLinkContact,
  onUnlinkContact,
  onSaveNote,
  onDeleteNote,
}: AcquisitionTargetDrawerProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>();

  useEffect(() => {
    if (target) {
      reset({
        targetName: target.targetName,
        market: toStr(target.market),
        address: toStr(target.address),
        propertyType: toStr(target.propertyType),
        status: target.status,
        acres: toStr(target.acres),
        buildingCount: toStr(target.buildingCount),
        totalSF: toStr(target.totalSF),
        askingPrice: toStr(target.askingPrice),
        ourOffer: toStr(target.ourOffer),
        earnestMoney: toStr(target.earnestMoney),
        closingCostsEstimate: toStr(target.closingCostsEstimate),
        rehabBudget: toStr(target.rehabBudget),
        underwrittenIRR: toStr(
          target.underwrittenIRR != null ? target.underwrittenIRR * 100 : null
        ),
        underwrittenEquityMultiple: toStr(target.underwrittenEquityMultiple),
        firstContactedDate: toStr(target.firstContactedDate),
        loiDate: toStr(target.loiDate),
        psaDate: toStr(target.psaDate),
        expectedClosingDate: toStr(target.expectedClosingDate),
        actualClosingDate: toStr(target.actualClosingDate),
        riskLevel: target.riskLevel,
        statusSummary: toStr(target.statusSummary),
        notes: toStr(target.notes),
      });
    }
  }, [target, reset]);

  const projectLinks = useMemo(
    () =>
      contactLinks.filter((l) => target && l.acquisitionTargetId === target.id),
    [contactLinks, target]
  );
  const projectNotes = useMemo(
    () => notes.filter((n) => target && n.acquisitionTargetId === target.id),
    [notes, target]
  );

  if (!target) return null;

  const onSubmit = (v: FormValues) => {
    const irrPct = parseNum(v.underwrittenIRR);
    const updated: AcquisitionTarget = {
      id: target.id,
      targetName: v.targetName.trim(),
      market: parseStr(v.market),
      address: parseStr(v.address),
      propertyType: parseStr(v.propertyType),
      status: v.status,
      acres: parseNum(v.acres),
      buildingCount:
        parseNum(v.buildingCount) != null
          ? Math.round(parseNum(v.buildingCount)!)
          : null,
      totalSF: parseNum(v.totalSF),
      askingPrice: parseNum(v.askingPrice),
      ourOffer: parseNum(v.ourOffer),
      earnestMoney: parseNum(v.earnestMoney),
      closingCostsEstimate: parseNum(v.closingCostsEstimate),
      rehabBudget: parseNum(v.rehabBudget),
      underwrittenIRR: irrPct != null ? irrPct / 100 : null,
      underwrittenEquityMultiple: parseNum(v.underwrittenEquityMultiple),
      firstContactedDate: parseStr(v.firstContactedDate),
      loiDate: parseStr(v.loiDate),
      psaDate: parseStr(v.psaDate),
      expectedClosingDate: parseStr(v.expectedClosingDate),
      actualClosingDate: parseStr(v.actualClosingDate),
      diligenceStatus: target.diligenceStatus,
      riskLevel: v.riskLevel,
      statusSummary: parseStr(v.statusSummary),
      notes: parseStr(v.notes),
      createdAt: target.createdAt,
      updatedAt: new Date().toISOString(),
    };
    onSave(updated);
    onClose();
  };

  const handleDelete = () => {
    if (confirm(`Delete acquisition target "${target.targetName}"?`)) {
      onDelete(target.id);
      onClose();
    }
  };

  const currentName = watch('targetName') ?? target.targetName;
  const currentStatus = (watch('status') ?? target.status) as AcquisitionStatus;
  const currentRisk = (watch('riskLevel') ?? target.riskLevel) as RiskLevel;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-fg/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="w-full max-w-2xl bg-bg shadow-lift overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
          <div className="sticky top-0 bg-bg/90 backdrop-blur-md border-b border-border px-7 py-5 z-10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex items-center gap-3 flex-wrap">
                <h2 className="text-xl text-fg tracking-[-0.01em] font-semibold truncate">
                  {currentName || 'New acquisition target'}
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-accent-tint text-accent border border-accent/30">
                  {currentStatus}
                </span>
                {currentRisk === 'High' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-danger">
                    <AlertTriangle size={12} strokeWidth={1.75} /> High risk
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
            <Section icon={NotebookPen} title="Status">
              <textarea
                {...register('statusSummary')}
                rows={3}
                placeholder="Where we are right now — bids out, IC date, exclusivity ending, etc."
                className={inputClass}
              />
            </Section>

            <Section icon={Workflow} title="Pipeline">
              <input type="hidden" {...register('status')} />
              <StatusStepper
                current={currentStatus}
                onChange={(s) => setValue('status', s, { shouldDirty: true })}
              />
              <div className="mt-3">
                <label className={labelClass}>Off-flow status</label>
                <select {...register('status')} className={inputClass}>
                  {AcquisitionStatusEnum.options.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-fg-subtle mt-1">
                  Use the stepper for the happy path; the dropdown for "On Hold" / "Lost".
                </p>
              </div>
            </Section>

            <Section icon={Crosshair} title="Target">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="col-span-2">
                  <label className={labelClass}>Name *</label>
                  <input
                    {...register('targetName', { required: 'Required' })}
                    className={inputClass}
                  />
                  {errors.targetName && (
                    <p className="text-danger text-xs mt-1.5">
                      {errors.targetName.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Market</label>
                  <input {...register('market')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Address</label>
                  <input {...register('address')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Property Type</label>
                  <input
                    {...register('propertyType')}
                    placeholder="Industrial / Land / Portfolio"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Risk</label>
                  <select {...register('riskLevel')} className={inputClass}>
                    {RiskLevelEnum.options.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Section>

            <Section icon={Building2} title="Scale">
              <div className="grid grid-cols-3 gap-3.5">
                <div>
                  <label className={labelClass}>Acres</label>
                  <input
                    {...register('acres')}
                    type="number"
                    step="any"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Total SF</label>
                  <input
                    {...register('totalSF')}
                    type="number"
                    step="any"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Buildings</label>
                  <input
                    {...register('buildingCount')}
                    type="number"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
              </div>
            </Section>

            <Section icon={DollarSign} title="Economics">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelClass}>Asking Price</label>
                  <input
                    {...register('askingPrice')}
                    type="number"
                    step="any"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Our Offer</label>
                  <input
                    {...register('ourOffer')}
                    type="number"
                    step="any"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Earnest Money</label>
                  <input
                    {...register('earnestMoney')}
                    type="number"
                    step="any"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Closing Costs (est.)</label>
                  <input
                    {...register('closingCostsEstimate')}
                    type="number"
                    step="any"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Rehab Budget</label>
                  <input
                    {...register('rehabBudget')}
                    type="number"
                    step="any"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
              </div>
            </Section>

            <Section icon={TrendingUp} title="Underwriting">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelClass}>UW IRR</label>
                  <input
                    {...register('underwrittenIRR')}
                    type="number"
                    step="any"
                    placeholder="15"
                    className={`${inputClass} tabular-nums`}
                  />
                  <p className="text-xs text-fg-subtle mt-1">
                    Whole percent (15 = 15% IRR).
                  </p>
                </div>
                <div>
                  <label className={labelClass}>Equity Multiple</label>
                  <input
                    {...register('underwrittenEquityMultiple')}
                    type="number"
                    step="any"
                    placeholder="2.1"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
              </div>
            </Section>

            <Section icon={CalendarDays} title="Timing">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelClass}>First Contacted</label>
                  <input {...register('firstContactedDate')} type="date" className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>LOI Signed</label>
                  <input {...register('loiDate')} type="date" className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>PSA Signed</label>
                  <input {...register('psaDate')} type="date" className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>Expected Close</label>
                  <input {...register('expectedClosingDate')} type="date" className={`${inputClass} tabular-nums`} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Actual Close</label>
                  <input {...register('actualClosingDate')} type="date" className={`${inputClass} tabular-nums`} />
                </div>
              </div>
            </Section>

            <Section icon={NotebookPen} title="Notes">
              <textarea
                {...register('notes')}
                rows={4}
                placeholder="Diligence gotchas, seller motivation, structure ideas."
                className={inputClass}
              />
            </Section>

            <Section icon={UserSquare} title="Contacts">
              <CrmContactsPanel
                allContacts={allContacts}
                links={projectLinks}
                onSaveContact={onSaveContact}
                onUnlink={onUnlinkContact}
                onLink={(contactId, isPrimary) => {
                  const now = new Date().toISOString();
                  onLinkContact({
                    id: crypto.randomUUID(),
                    acquisitionTargetId: target.id,
                    contactId,
                    roleOverride: null,
                    isPrimary,
                    linkNotes: null,
                    createdAt: now,
                    updatedAt: now,
                  });
                }}
              />
            </Section>

            <Section icon={ActivityIcon} title="Activity Log">
              <CrmNotesLog
                notes={projectNotes}
                onDelete={onDeleteNote}
                onCreate={(draft) => {
                  const now = new Date().toISOString();
                  onSaveNote({
                    id: crypto.randomUUID(),
                    acquisitionTargetId: target.id,
                    noteType: draft.noteType,
                    eventDate: draft.eventDate,
                    content: draft.content,
                    author: draft.author,
                    link: null,
                    createdAt: now,
                    updatedAt: now,
                  });
                }}
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
