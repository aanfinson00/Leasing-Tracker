import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  X,
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  NotebookPen,
  Trash2,
  ArrowRight,
  Activity as ActivityIcon,
  ListChecks,
  Workflow,
  Mail,
  Check,
  Copy,
  FolderOpen,
  ExternalLink,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ActivityEntry, Building, Deal, DealStatus, Priority } from '../types';
import {
  PriorityEnum,
  SPACE_ID_REGEX,
  SPACE_ID_FORMAT_HINT,
} from '../types';
import { TRANSACTION_TYPES } from '../lib/enums';
import { EnumDropdown } from './EnumDropdown';
import { StatusBadge } from './StatusBadge';
import { PipelineStepper } from './PipelineStepper';
import { ActivityLog } from './ActivityLog';
import { DealPicker } from './DealPicker';
import { BuildingPicker } from './BuildingPicker';
import { SpacePicker } from './SpacePicker';
import { SplitSpaceModal } from './SplitSpaceModal';
import { NewProjectModal } from './NewProjectModal';

interface DealDrawerProps {
  deal: Deal | null;
  deals: Deal[];
  activities: ActivityEntry[];
  buildings: Building[];
  onClose: () => void;
  onSave: (deal: Deal) => void;
  onDelete: (id: string) => void;
  onPromote?: (deal: Deal) => void;
  onAddActivity: (entry: Omit<ActivityEntry, 'id' | 'createdAt'>) => void;
  onDeleteActivity: (id: string) => void;
  onStatusChange?: (deal: Deal, from: DealStatus, to: DealStatus) => void;
  onToast?: (msg: string) => void;
  onUpsertBuilding: (b: Building) => void;
  onCreateNewProject: (p: { dealId: string; dealName: string; market: string }) => Promise<Deal | null>;
}

type FormValues = {
  dealName: string;
  spaceId: string;
  buildingId: string;
  building: string;
  dealId: string;
  minSF: string;
  maxSF: string;
  prospectTenant: string;
  brokerRep: string;
  transaction: string;
  status: DealStatus;
  targetRent: string;
  proposedTermMonths: string;
  freeRentMonths: string;
  tiPerSF: string;
  tiNote: string;
  probabilityPct: string;
  expectedStart: string;
  lat: string;
  lng: string;
  lastUpdated: string;
  priority: Priority;
  currentSummary: string;
  notes: string;
  sharepointUrl: string;
};

const toFormString = (v: string | number | null | undefined): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') {
    // Strip floating-point noise (e.g., 8.486999... → 8.49 for currency-like values)
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

export function DealDrawer({
  deal,
  deals,
  activities,
  buildings,
  onClose,
  onSave,
  onDelete,
  onPromote,
  onAddActivity,
  onDeleteActivity,
  onStatusChange,
  onToast,
  onUpsertBuilding,
  onCreateNewProject,
}: DealDrawerProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>();

  // Cascading picker live values
  const currentDealId = watch('dealId') ?? deal?.dealId ?? '';
  const currentBuildingId = watch('buildingId') ?? '';
  const currentSpaceId = watch('spaceId') ?? deal?.spaceId ?? '';

  // Split-space modal state
  const [splitModal, setSplitModal] = useState<{
    open: boolean;
    building: Building | null;
    parentSpaceId: string;
  }>({ open: false, building: null, parentSpaceId: '' });

  // New-project modal state
  const [newProjectOpen, setNewProjectOpen] = useState(false);

  const existingDealIds = useMemo(
    () => deals.map((d) => d.dealId).filter((id): id is string => !!id && id !== ''),
    [deals]
  );

  const handleSplitRequest = (parentSpaceId: string) => {
    const b = buildings.find((bldg) => bldg.id === currentBuildingId);
    if (!b) return;
    setSplitModal({ open: true, building: b, parentSpaceId });
  };

  const handleSplitConfirm = (updated: Building) => {
    onUpsertBuilding(updated);
    setSplitModal({ open: false, building: null, parentSpaceId: '' });
  };

  const handleCreateNewProject = async (p: {
    dealId: string;
    dealName: string;
    market: string;
  }) => {
    const newDeal = await onCreateNewProject(p);
    if (newDeal && newDeal.dealId) {
      setValue('dealId', newDeal.dealId, { shouldDirty: true });
      setValue('buildingId', '', { shouldDirty: true });
      setValue('building', '', { shouldDirty: true });
      setValue('spaceId', '', { shouldDirty: true });
    }
    setNewProjectOpen(false);
  };

  // "Get status update" — copies the slash command + deal context to the
  // clipboard so the user can paste into Claude (terminal or iMessage).
  // The skill itself lives in .claude/skills/get-status-update.
  const [statusCopied, setStatusCopied] = useState(false);
  const handleGetStatusUpdate = async () => {
    if (!deal) return;
    const handle = deal.dealName || deal.prospectTenant || deal.id;
    const prompt = `/get-status-update ${handle}`;
    try {
      await navigator.clipboard.writeText(prompt);
      setStatusCopied(true);
      setTimeout(() => setStatusCopied(false), 2500);
      onToast?.(`Copied: ${prompt} — paste into Claude`);
    } catch {
      onToast?.(`Run in Claude: ${prompt}`);
    }
  };

  useEffect(() => {
    if (deal) {
      // Resolve current buildingId from the deal's current space + buildings list
      const resolvedBuildingId =
        buildings.find((b) =>
          b.baySpaceIds.includes(deal.spaceId ?? '') ||
          (b.spaceSubdivisions ?? []).some((s) =>
            s.childSpaceIds.includes(deal.spaceId ?? '')
          )
        )?.id ?? '';
      reset({
        dealName: deal.dealName,
        spaceId: toFormString(deal.spaceId),
        buildingId: resolvedBuildingId,
        building: toFormString(deal.building),
        dealId: toFormString(deal.dealId),
        minSF: toFormString(deal.minSF),
        maxSF: toFormString(deal.maxSF),
        prospectTenant: toFormString(deal.prospectTenant),
        brokerRep: toFormString(deal.brokerRep),
        transaction: toFormString(deal.transaction),
        status: deal.status,
        targetRent: toFormString(deal.targetRent),
        proposedTermMonths: toFormString(deal.proposedTermMonths),
        freeRentMonths: toFormString(deal.freeRentMonths),
        tiPerSF: toFormString(deal.tiPerSF),
        tiNote: toFormString(deal.tiNote),
        probabilityPct: toFormString(deal.probabilityPct),
        expectedStart: toFormString(deal.expectedStart),
        lat: toFormString(deal.lat),
        lng: toFormString(deal.lng),
        lastUpdated: toFormString(deal.lastUpdated),
        priority: deal.priority,
        currentSummary: toFormString(deal.currentSummary),
        notes: toFormString(deal.notes),
        sharepointUrl: toFormString(deal.sharepointUrl),
      });
    }
  }, [deal, reset, buildings]);

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
      lastRevalUWRent: deal.lastRevalUWRent,
      targetRent: parseNum(values.targetRent),
      proposedTermMonths: parseNum(values.proposedTermMonths),
      freeRentMonths: parseNum(values.freeRentMonths),
      tiPerSF: parseNum(values.tiPerSF),
      tiNote: parseStr(values.tiNote),
      probabilityPct: parseNum(values.probabilityPct),
      expectedStart: parseStr(values.expectedStart),
      lat: parseNum(values.lat),
      lng: parseNum(values.lng),
      lastUpdated: parseStr(values.lastUpdated) ?? new Date().toISOString().slice(0, 10),
      priority: values.priority,
      currentSummary: parseStr(values.currentSummary),
      notes: parseStr(values.notes),
      sharepointUrl: parseStr(values.sharepointUrl),
    };
    onSave(updated);
    onClose();
  };

  const handleStepperChange = (next: DealStatus) => {
    if (!deal) return;
    const from = (watch('status') ?? deal.status) as DealStatus;
    setValue('status', next, { shouldDirty: true });
    if (from !== next && onStatusChange) {
      onStatusChange(deal, from, next);
    }
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
              <div className="flex items-center gap-1 shrink-0">
                {/* Get Status Update — copies the /get-status-update skill
                    invocation to the clipboard. Skill itself reads Gmail
                    via MCP and drafts an activity entry. */}
                <button
                  type="button"
                  onClick={handleGetStatusUpdate}
                  title="Copy /get-status-update command to clipboard"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-fg-muted hover:text-fg hover:bg-bg-hover rounded-lg transition-colors"
                >
                  {statusCopied ? (
                    <>
                      <Check size={13} strokeWidth={2} className="text-success" />
                      <span className="text-success">Copied</span>
                    </>
                  ) : (
                    <>
                      <Mail size={13} strokeWidth={1.75} />
                      <span>Get update</span>
                      <Copy size={11} strokeWidth={1.75} className="opacity-60" />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-lg text-fg-muted hover:text-fg hover:bg-bg-hover transition-colors"
                  aria-label="Close"
                >
                  <X size={18} strokeWidth={1.75} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 px-7 py-6">
            <Section icon={ListChecks} title="Current Summary">
              <textarea
                {...register('currentSummary')}
                rows={3}
                placeholder="Where things stand right now — counter-proposal pending, awaiting reply on TI ask, etc."
                className={inputClass}
              />
            </Section>

            <Section icon={Workflow} title="Pipeline Stage">
              <input type="hidden" {...register('status')} />
              <PipelineStepper status={currentStatus} onChange={handleStepperChange} />
            </Section>

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
                <div className="col-span-2">
                  <label className={labelClass}>Project (Deal ID)</label>
                  <DealPicker
                    deals={deals}
                    value={currentDealId}
                    onChange={(d) => {
                      setValue('dealId', d?.dealId ?? '', { shouldDirty: true });
                      // Changing the project clears building + space
                      setValue('buildingId', '', { shouldDirty: true });
                      setValue('building', '', { shouldDirty: true });
                      setValue('spaceId', '', { shouldDirty: true });
                    }}
                    onRequestNew={() => setNewProjectOpen(true)}
                  />
                  <input type="hidden" {...register('dealId')} />
                </div>
                <div>
                  <label className={labelClass}>Building</label>
                  <BuildingPicker
                    buildings={buildings}
                    dealId={currentDealId}
                    value={currentBuildingId}
                    onChange={(b) => {
                      setValue('buildingId', b?.id ?? '', { shouldDirty: true });
                      setValue('building', b?.name ?? '', { shouldDirty: true });
                      // Changing building clears space
                      setValue('spaceId', '', { shouldDirty: true });
                    }}
                  />
                  <input type="hidden" {...register('buildingId')} />
                  <input type="hidden" {...register('building')} />
                </div>
                <div>
                  <label className={labelClass}>Space ID</label>
                  <SpacePicker
                    buildings={buildings}
                    buildingId={currentBuildingId}
                    value={currentSpaceId}
                    onChange={(opt) => {
                      setValue('spaceId', opt?.spaceId ?? '', { shouldDirty: true });
                    }}
                    onRequestSplit={handleSplitRequest}
                  />
                  <input
                    type="hidden"
                    {...register('spaceId', {
                      validate: (v) =>
                        !v || SPACE_ID_REGEX.test(v.trim()) || SPACE_ID_FORMAT_HINT,
                    })}
                  />
                  {errors.spaceId && (
                    <p className="text-danger text-xs mt-1.5">{errors.spaceId.message}</p>
                  )}
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
                <div>
                  <label className={labelClass}>Latitude</label>
                  <input
                    {...register('lat')}
                    type="number"
                    step="0.000001"
                    placeholder="e.g. 41.8781"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Longitude</label>
                  <input
                    {...register('lng')}
                    type="number"
                    step="0.000001"
                    placeholder="e.g. -87.6298"
                    className={`${inputClass} tabular-nums`}
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
                  <EnumDropdown
                    options={TRANSACTION_TYPES}
                    value={watch('transaction') ?? ''}
                    onChange={(v) =>
                      setValue('transaction', v, { shouldDirty: true })
                    }
                    placeholder="New Lease, Expansion, BTS…"
                    className={inputClass}
                  />
                </div>
                <div className="col-span-2">
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

            <Section icon={FolderOpen} title="Shared Folder">
              <div className="space-y-1.5">
                <label className={labelClass}>SharePoint URL</label>
                <div className="flex items-stretch gap-2">
                  <input
                    {...register('sharepointUrl')}
                    type="url"
                    placeholder="https://contoso.sharepoint.com/sites/.../Deal Folder"
                    className={`${inputClass} flex-1`}
                  />
                  {watch('sharepointUrl')?.trim() && (
                    <a
                      href={watch('sharepointUrl')}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open in new tab"
                      className="inline-flex items-center gap-1 px-3 rounded-lg text-xs font-medium border border-border bg-bg-elevated hover:bg-bg-hover text-fg whitespace-nowrap"
                    >
                      Open <ExternalLink size={12} />
                    </a>
                  )}
                </div>
                <p className="text-[11px] text-fg-muted">Paste the SharePoint folder link for any team member to access docs.</p>
              </div>
            </Section>

            <Section icon={NotebookPen} title="Notes">
              <textarea {...register('notes')} rows={5} className={inputClass} />
            </Section>

            <Section icon={ActivityIcon} title="Activity">
              <ActivityLog
                parentType="deal"
                parentId={deal.id}
                entries={activities}
                onAdd={onAddActivity}
                onDelete={onDeleteActivity}
              />
            </Section>
          </div>

          <div className="sticky bottom-0 bg-bg/90 backdrop-blur-md border-t border-border px-7 py-4 flex items-center justify-between gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-danger hover:bg-danger/10 rounded-lg transition-colors"
            >
              <Trash2 size={14} strokeWidth={1.75} />
              Delete
            </button>
            <div className="flex gap-2 flex-wrap">
              {currentStatus === 'Executed' && onPromote && (
                <button
                  type="button"
                  onClick={() => {
                    // Save current edits before promoting so the latest values flow through
                    handleSubmit((values) => {
                      const updatedDeal: Deal = {
                        ...deal,
                        ...{
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
                          lastRevalUWRent: deal.lastRevalUWRent,
                          targetRent: parseNum(values.targetRent),
                          proposedTermMonths: parseNum(values.proposedTermMonths),
                          freeRentMonths: parseNum(values.freeRentMonths),
                          tiPerSF: parseNum(values.tiPerSF),
                          tiNote: parseStr(values.tiNote),
                          probabilityPct: parseNum(values.probabilityPct),
                          expectedStart: parseStr(values.expectedStart),
                          lastUpdated: parseStr(values.lastUpdated) ?? new Date().toISOString().slice(0, 10),
                          priority: values.priority,
                          currentSummary: parseStr(values.currentSummary),
                          notes: parseStr(values.notes),
                          sharepointUrl: parseStr(values.sharepointUrl),
                        },
                      };
                      onSave(updatedDeal);
                      onPromote(updatedDeal);
                      onClose();
                    })();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-accent border border-accent rounded-xl hover:bg-accent-soft transition-colors"
                >
                  <ArrowRight size={14} strokeWidth={2} />
                  Promote to Rent Roll
                </button>
              )}
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

      <SplitSpaceModal
        open={splitModal.open}
        building={splitModal.building}
        parentSpaceId={splitModal.parentSpaceId}
        onClose={() => setSplitModal({ open: false, building: null, parentSpaceId: '' })}
        onConfirm={handleSplitConfirm}
      />

      <NewProjectModal
        open={newProjectOpen}
        existingDealIds={existingDealIds}
        onClose={() => setNewProjectOpen(false)}
        onConfirm={handleCreateNewProject}
      />
    </div>
  );
}
