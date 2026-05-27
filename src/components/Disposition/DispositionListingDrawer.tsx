import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import {
  X,
  HandCoins,
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
  Contact,
  DispositionListing,
  DispositionListingContact,
  DispositionListingNote,
  DispositionStatus,
  RiskLevel,
} from '../../types';
import {
  DISPO_PIPELINE_ORDER,
  DispositionStatusEnum,
  RiskLevelEnum,
} from '../../types';
import { CrmContactsPanel } from '../CRM/CrmContactsPanel';
import { CrmNotesLog } from '../CRM/CrmNotesLog';

interface DispositionListingDrawerProps {
  listing: DispositionListing | null;
  onClose: () => void;
  onSave: (d: DispositionListing) => void;
  onDelete: (id: string) => void;
  allContacts: Contact[];
  contactLinks: DispositionListingContact[];
  notes: DispositionListingNote[];
  onSaveContact: (c: Contact) => void;
  onLinkContact: (link: DispositionListingContact) => void;
  onUnlinkContact: (linkId: string) => void;
  onSaveNote: (n: DispositionListingNote) => void;
  onDeleteNote: (id: string) => void;
}

type FormValues = {
  assetName: string;
  market: string;
  address: string;
  propertyType: string;
  status: DispositionStatus;
  totalSF: string;
  acres: string;
  occupancyPct: string;       // % units
  trailingNOI: string;
  forwardNOI: string;
  listPrice: string;
  listCapPct: string;         // % units
  achievedPrice: string;
  achievedCapPct: string;
  netProceeds: string;
  brokerCommissionPct: string;
  listDate: string;
  bidsDueDate: string;
  loiExecutedDate: string;
  psaExecutedDate: string;
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

function StatusStepper({
  current,
  onChange,
}: {
  current: DispositionStatus;
  onChange: (s: DispositionStatus) => void;
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {DISPO_PIPELINE_ORDER.map((s, idx) => {
        const isCurrent = current === s;
        const currentIdx = DISPO_PIPELINE_ORDER.indexOf(current);
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

export function DispositionListingDrawer({
  listing,
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
}: DispositionListingDrawerProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>();

  useEffect(() => {
    if (listing) {
      reset({
        assetName: listing.assetName,
        market: toStr(listing.market),
        address: toStr(listing.address),
        propertyType: toStr(listing.propertyType),
        status: listing.status,
        totalSF: toStr(listing.totalSF),
        acres: toStr(listing.acres),
        occupancyPct: toStr(
          listing.occupancyPct != null ? listing.occupancyPct * 100 : null
        ),
        trailingNOI: toStr(listing.trailingNOI),
        forwardNOI: toStr(listing.forwardNOI),
        listPrice: toStr(listing.listPrice),
        listCapPct: toStr(
          listing.listCapPct != null ? listing.listCapPct * 100 : null
        ),
        achievedPrice: toStr(listing.achievedPrice),
        achievedCapPct: toStr(
          listing.achievedCapPct != null ? listing.achievedCapPct * 100 : null
        ),
        netProceeds: toStr(listing.netProceeds),
        brokerCommissionPct: toStr(
          listing.brokerCommissionPct != null ? listing.brokerCommissionPct * 100 : null
        ),
        listDate: toStr(listing.listDate),
        bidsDueDate: toStr(listing.bidsDueDate),
        loiExecutedDate: toStr(listing.loiExecutedDate),
        psaExecutedDate: toStr(listing.psaExecutedDate),
        expectedClosingDate: toStr(listing.expectedClosingDate),
        actualClosingDate: toStr(listing.actualClosingDate),
        riskLevel: listing.riskLevel,
        statusSummary: toStr(listing.statusSummary),
        notes: toStr(listing.notes),
      });
    }
  }, [listing, reset]);

  const listingLinks = useMemo(
    () => contactLinks.filter((l) => listing && l.dispositionListingId === listing.id),
    [contactLinks, listing]
  );
  const listingNotes = useMemo(
    () => notes.filter((n) => listing && n.dispositionListingId === listing.id),
    [notes, listing]
  );

  if (!listing) return null;

  // Helper to convert a percent input (15) to fraction (0.15) on save.
  const pctToFraction = (v: string): number | null => {
    const n = parseNum(v);
    return n != null ? n / 100 : null;
  };

  const onSubmit = (v: FormValues) => {
    const updated: DispositionListing = {
      id: listing.id,
      assetName: v.assetName.trim(),
      buildingId: listing.buildingId,
      market: parseStr(v.market),
      // submarket / county / city auto-derived at App-level save (applyGeoTags).
      submarket: listing.submarket ?? null,
      county: listing.county ?? null,
      city: listing.city ?? null,
      address: parseStr(v.address),
      propertyType: parseStr(v.propertyType),
      status: v.status,
      totalSF: parseNum(v.totalSF),
      acres: parseNum(v.acres),
      occupancyPct: pctToFraction(v.occupancyPct),
      trailingNOI: parseNum(v.trailingNOI),
      forwardNOI: parseNum(v.forwardNOI),
      listPrice: parseNum(v.listPrice),
      listCapPct: pctToFraction(v.listCapPct),
      achievedPrice: parseNum(v.achievedPrice),
      achievedCapPct: pctToFraction(v.achievedCapPct),
      netProceeds: parseNum(v.netProceeds),
      brokerCommissionPct: pctToFraction(v.brokerCommissionPct),
      listDate: parseStr(v.listDate),
      bidsDueDate: parseStr(v.bidsDueDate),
      loiExecutedDate: parseStr(v.loiExecutedDate),
      psaExecutedDate: parseStr(v.psaExecutedDate),
      expectedClosingDate: parseStr(v.expectedClosingDate),
      actualClosingDate: parseStr(v.actualClosingDate),
      riskLevel: v.riskLevel,
      statusSummary: parseStr(v.statusSummary),
      lat: listing.lat ?? null,
      lng: listing.lng ?? null,
      notes: parseStr(v.notes),
      createdAt: listing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    onSave(updated);
    onClose();
  };

  const handleDelete = () => {
    if (confirm(`Delete disposition listing "${listing.assetName}"?`)) {
      onDelete(listing.id);
      onClose();
    }
  };

  const currentName = watch('assetName') ?? listing.assetName;
  const currentStatus = (watch('status') ?? listing.status) as DispositionStatus;
  const currentRisk = (watch('riskLevel') ?? listing.riskLevel) as RiskLevel;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-fg/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="w-full max-w-2xl bg-bg shadow-lift overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
          <div className="sticky top-0 bg-bg/90 backdrop-blur-md border-b border-border px-7 py-5 z-10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex items-center gap-3 flex-wrap">
                <h2 className="text-xl text-fg tracking-[-0.01em] font-semibold truncate">
                  {currentName || 'New disposition listing'}
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
                placeholder="Best & finals due Tuesday, three bids in range, broker recommending Buyer X."
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
                  {DispositionStatusEnum.options.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-fg-subtle mt-1">
                  Use the stepper for the happy path; the dropdown for "Pulled" / "On Hold".
                </p>
              </div>
            </Section>

            <Section icon={HandCoins} title="Asset">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="col-span-2">
                  <label className={labelClass}>Asset Name *</label>
                  <input
                    {...register('assetName', { required: 'Required' })}
                    className={inputClass}
                  />
                  {errors.assetName && (
                    <p className="text-danger text-xs mt-1.5">{errors.assetName.message}</p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Market</label>
                  <input {...register('market')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Property Type</label>
                  <input {...register('propertyType')} className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Address</label>
                  <input {...register('address')} className={inputClass} />
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
                  <label className={labelClass}>Total SF</label>
                  <input
                    {...register('totalSF')}
                    type="number"
                    step="any"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
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
                  <label className={labelClass}>Occupancy %</label>
                  <input
                    {...register('occupancyPct')}
                    type="number"
                    step="any"
                    placeholder="93"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
              </div>
            </Section>

            <Section icon={DollarSign} title="Economics">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelClass}>Trailing NOI</label>
                  <input
                    {...register('trailingNOI')}
                    type="number"
                    step="any"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Forward NOI</label>
                  <input
                    {...register('forwardNOI')}
                    type="number"
                    step="any"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>List Price</label>
                  <input
                    {...register('listPrice')}
                    type="number"
                    step="any"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>List Cap %</label>
                  <input
                    {...register('listCapPct')}
                    type="number"
                    step="any"
                    placeholder="6.25"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Achieved Price</label>
                  <input
                    {...register('achievedPrice')}
                    type="number"
                    step="any"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Achieved Cap %</label>
                  <input
                    {...register('achievedCapPct')}
                    type="number"
                    step="any"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Net Proceeds</label>
                  <input
                    {...register('netProceeds')}
                    type="number"
                    step="any"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Broker Commission %</label>
                  <input
                    {...register('brokerCommissionPct')}
                    type="number"
                    step="any"
                    placeholder="2"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
              </div>
            </Section>

            <Section icon={CalendarDays} title="Timing">
              <div className="grid grid-cols-3 gap-3.5">
                <div>
                  <label className={labelClass}>List Date</label>
                  <input {...register('listDate')} type="date" className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>Bids Due</label>
                  <input {...register('bidsDueDate')} type="date" className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>LOI Executed</label>
                  <input {...register('loiExecutedDate')} type="date" className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>PSA Executed</label>
                  <input {...register('psaExecutedDate')} type="date" className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>Expected Close</label>
                  <input {...register('expectedClosingDate')} type="date" className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>Actual Close</label>
                  <input {...register('actualClosingDate')} type="date" className={`${inputClass} tabular-nums`} />
                </div>
              </div>
            </Section>

            <Section icon={TrendingUp} title="Notes">
              <textarea
                {...register('notes')}
                rows={4}
                placeholder="Why selling, tax implications, 1031 ID, buyer financing status."
                className={inputClass}
              />
            </Section>

            <Section icon={UserSquare} title="Contacts">
              <CrmContactsPanel
                allContacts={allContacts}
                links={listingLinks}
                onSaveContact={onSaveContact}
                onUnlink={onUnlinkContact}
                onLink={(contactId, isPrimary) => {
                  const now = new Date().toISOString();
                  onLinkContact({
                    id: crypto.randomUUID(),
                    dispositionListingId: listing.id,
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
                notes={listingNotes}
                onDelete={onDeleteNote}
                onCreate={(draft) => {
                  const now = new Date().toISOString();
                  onSaveNote({
                    id: crypto.randomUUID(),
                    dispositionListingId: listing.id,
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
