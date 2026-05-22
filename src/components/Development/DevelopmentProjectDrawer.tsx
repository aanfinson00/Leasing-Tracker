import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import {
  X,
  Building2,
  HardHat,
  CalendarDays,
  DollarSign,
  Users,
  Workflow,
  NotebookPen,
  Trash2,
  AlertTriangle,
  Activity as ActivityIcon,
  UserSquare,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  Contact,
  DevelopmentProject,
  DevPhase,
  DevProjectContact,
  DevProjectNote,
  RiskLevel,
} from '../../types';
import { DevPhaseEnum, RiskLevelEnum, DEV_PHASE_ORDER } from '../../types';
import { DevContactsPanel } from './DevContactsPanel';
import { DevNotesLog } from './DevNotesLog';

interface DevelopmentProjectDrawerProps {
  project: DevelopmentProject | null;
  onClose: () => void;
  onSave: (p: DevelopmentProject) => void;
  onDelete: (id: string) => void;
  // CRM v1 — passed in from App. Empty arrays + no-op handlers are
  // safe defaults so the drawer works in isolation/tests.
  allContacts?: Contact[];
  contactLinks?: DevProjectContact[];
  notes?: DevProjectNote[];
  onSaveContact?: (c: Contact) => void;
  onLinkContact?: (link: DevProjectContact) => void;
  onUnlinkContact?: (linkId: string) => void;
  onSaveNote?: (n: DevProjectNote) => void;
  onDeleteNote?: (id: string) => void;
}

type FormValues = {
  projectName: string;
  market: string;
  address: string;
  phase: DevPhase;
  totalSF: string;
  acres: string;
  buildingCount: string;
  startDate: string;
  expectedDeliveryDate: string;
  actualDeliveryDate: string;
  totalBudget: string;
  spentToDate: string;
  pmName: string;
  gcName: string;
  gcContact: string;
  architect: string;
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

// Compact stepper showing where the project is in its lifecycle.
function PhaseStepper({
  current,
  onChange,
}: {
  current: DevPhase;
  onChange: (p: DevPhase) => void;
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {DEV_PHASE_ORDER.map((p, idx) => {
        const isCurrent = current === p;
        const currentIdx = DEV_PHASE_ORDER.indexOf(current);
        const done = currentIdx > -1 && idx < currentIdx;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={[
              'px-2.5 py-1 text-xs font-medium rounded-lg transition-colors',
              isCurrent
                ? 'bg-accent text-accent-fg'
                : done
                  ? 'bg-accent-tint text-accent'
                  : 'text-fg-muted hover:text-fg hover:bg-bg-hover',
            ].join(' ')}
          >
            {p}
          </button>
        );
      })}
    </div>
  );
}

export function DevelopmentProjectDrawer({
  project,
  onClose,
  onSave,
  onDelete,
  allContacts = [],
  contactLinks = [],
  notes = [],
  onSaveContact,
  onLinkContact,
  onUnlinkContact,
  onSaveNote,
  onDeleteNote,
}: DevelopmentProjectDrawerProps) {
  // Pre-filter to just this project's CRM data so the panels can be
  // dumb about ownership.
  const projectLinks = useMemo(
    () => contactLinks.filter((l) => project && l.devProjectId === project.id),
    [contactLinks, project]
  );
  const projectNotes = useMemo(
    () => notes.filter((n) => project && n.devProjectId === project.id),
    [notes, project]
  );
  const crmWired =
    onSaveContact != null &&
    onLinkContact != null &&
    onUnlinkContact != null &&
    onSaveNote != null &&
    onDeleteNote != null;
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>();

  useEffect(() => {
    if (project) {
      reset({
        projectName: project.projectName,
        market: toStr(project.market),
        address: toStr(project.address),
        phase: project.phase,
        totalSF: toStr(project.totalSF),
        acres: toStr(project.acres),
        buildingCount: toStr(project.buildingCount),
        startDate: toStr(project.startDate),
        expectedDeliveryDate: toStr(project.expectedDeliveryDate),
        actualDeliveryDate: toStr(project.actualDeliveryDate),
        totalBudget: toStr(project.totalBudget),
        spentToDate: toStr(project.spentToDate),
        pmName: toStr(project.pmName),
        gcName: toStr(project.gcName),
        gcContact: toStr(project.gcContact),
        architect: toStr(project.architect),
        riskLevel: project.riskLevel,
        statusSummary: toStr(project.statusSummary),
        notes: toStr(project.notes),
      });
    }
  }, [project, reset]);

  if (!project) return null;

  const onSubmit = (v: FormValues) => {
    const updated: DevelopmentProject = {
      id: project.id,
      projectName: v.projectName.trim(),
      market: parseStr(v.market),
      address: parseStr(v.address),
      phase: v.phase,
      totalSF: parseNum(v.totalSF),
      acres: parseNum(v.acres),
      buildingCount:
        parseNum(v.buildingCount) != null
          ? Math.round(parseNum(v.buildingCount)!)
          : null,
      startDate: parseStr(v.startDate),
      expectedDeliveryDate: parseStr(v.expectedDeliveryDate),
      actualDeliveryDate: parseStr(v.actualDeliveryDate),
      totalBudget: parseNum(v.totalBudget),
      spentToDate: parseNum(v.spentToDate),
      pmName: parseStr(v.pmName),
      gcName: parseStr(v.gcName),
      gcContact: parseStr(v.gcContact),
      architect: parseStr(v.architect),
      riskLevel: v.riskLevel,
      statusSummary: parseStr(v.statusSummary),
      notes: parseStr(v.notes),
      createdAt: project.createdAt,
      updatedAt: new Date().toISOString(),
    };
    onSave(updated);
    onClose();
  };

  const handleDelete = () => {
    if (confirm(`Delete project "${project.projectName}"?`)) {
      onDelete(project.id);
      onClose();
    }
  };

  const currentName = watch('projectName') ?? project.projectName;
  const currentPhase = (watch('phase') ?? project.phase) as DevPhase;
  const currentRisk = (watch('riskLevel') ?? project.riskLevel) as RiskLevel;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-fg/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="w-full max-w-2xl bg-bg shadow-lift overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
          <div className="sticky top-0 bg-bg/90 backdrop-blur-md border-b border-border px-7 py-5 z-10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex items-center gap-3 flex-wrap">
                <h2 className="text-xl text-fg tracking-[-0.01em] font-semibold truncate">
                  {currentName || 'New project'}
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-accent-tint text-accent border border-accent/30">
                  {currentPhase}
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
                placeholder="What's happening right now — pending approvals, delays, milestones."
                className={inputClass}
              />
            </Section>

            <Section icon={Workflow} title="Phase">
              <input type="hidden" {...register('phase')} />
              <PhaseStepper
                current={currentPhase}
                onChange={(p) => setValue('phase', p, { shouldDirty: true })}
              />
              <div className="mt-3">
                <label className={labelClass}>Off-flow status</label>
                <select {...register('phase')} className={inputClass}>
                  {DevPhaseEnum.options.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-fg-subtle mt-1">
                  Use the stepper for happy-path moves; the dropdown for "On Hold" / "Cancelled".
                </p>
              </div>
            </Section>

            <Section icon={Building2} title="Property">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="col-span-2">
                  <label className={labelClass}>Project Name *</label>
                  <input
                    {...register('projectName', { required: 'Required' })}
                    className={inputClass}
                  />
                  {errors.projectName && (
                    <p className="text-danger text-xs mt-1.5">
                      {errors.projectName.message}
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
                  <label className={labelClass}>Building Count</label>
                  <input
                    {...register('buildingCount')}
                    type="number"
                    className={`${inputClass} tabular-nums`}
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

            <Section icon={CalendarDays} title="Timing">
              <div className="grid grid-cols-3 gap-3.5">
                <div>
                  <label className={labelClass}>Start</label>
                  <input
                    {...register('startDate')}
                    type="date"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Expected Delivery</label>
                  <input
                    {...register('expectedDeliveryDate')}
                    type="date"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Actual Delivery</label>
                  <input
                    {...register('actualDeliveryDate')}
                    type="date"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
              </div>
            </Section>

            <Section icon={DollarSign} title="Budget">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelClass}>Total Budget</label>
                  <input
                    {...register('totalBudget')}
                    type="number"
                    step="any"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Spent To Date</label>
                  <input
                    {...register('spentToDate')}
                    type="number"
                    step="any"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
              </div>
            </Section>

            <Section icon={Users} title="Team">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelClass}>PM (Internal)</label>
                  <input {...register('pmName')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Architect</label>
                  <input {...register('architect')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>GC</label>
                  <input {...register('gcName')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>GC Contact</label>
                  <input
                    {...register('gcContact')}
                    placeholder="Phone or email"
                    className={inputClass}
                  />
                </div>
              </div>
            </Section>

            <Section icon={HardHat} title="Notes">
              <textarea
                {...register('notes')}
                rows={4}
                placeholder="Anything not captured above — entitlement quirks, change orders, vendor issues, hand-off plan to leasing."
                className={inputClass}
              />
            </Section>

            {/* CRM v1 — contacts panel + activity log. Hidden when the
                drawer is mounted without CRM handlers wired (e.g. in
                isolated tests). */}
            {crmWired && project && (
              <>
                <Section icon={UserSquare} title="Contacts">
                  <DevContactsPanel
                    allContacts={allContacts}
                    links={projectLinks}
                    devProjectId={project.id}
                    onSaveContact={onSaveContact!}
                    onLink={onLinkContact!}
                    onUnlink={onUnlinkContact!}
                  />
                </Section>
                <Section icon={ActivityIcon} title="Activity Log">
                  <DevNotesLog
                    devProjectId={project.id}
                    notes={projectNotes}
                    onSave={onSaveNote!}
                    onDelete={onDeleteNote!}
                  />
                </Section>
              </>
            )}
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
