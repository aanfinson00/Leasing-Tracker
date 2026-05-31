import { useEffect, useMemo, useState } from 'react';
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
  FolderOpen,
  ExternalLink,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ActivityEntry, Building, Deal, Project, RentRollRow, Space, TenantRating } from '../types';
import {
  SPACE_ID_REGEX,
  SPACE_ID_FORMAT_HINT,
} from '../types';
import { MARKETS, PROPERTY_TYPES, BUILDING_TYPES } from '../lib/enums';
import { EnumDropdown } from './EnumDropdown';
import { ActivityLog } from './ActivityLog';
import { ProjectPicker } from './ProjectPicker';
import { BuildingPicker } from './BuildingPicker';
import { SpacePicker } from './SpacePicker';
import { SpaceEditPopover } from './SpaceEditPopover';
import { SplitSpaceModal } from './SplitSpaceModal';
import { NewProjectModal } from './NewProjectModal';

interface RentRollDrawerProps {
  row: RentRollRow | null;
  deals: Deal[];
  activities: ActivityEntry[];
  buildings: Building[];
  /** Projects loaded from the new projects table — used to resolve projectUuid on save. */
  projects: Project[];
  /** Spaces loaded from the new spaces table — used by the SpaceEditPopover. */
  spaces: Space[];
  /** Persist a Space row (used by SpaceEditPopover). */
  onUpsertSpace: (s: Space) => void;
  onClose: () => void;
  onSave: (row: RentRollRow) => void;
  onDelete: (id: string) => void;
  onAddActivity: (entry: Omit<ActivityEntry, 'id' | 'createdAt'>) => void;
  onDeleteActivity: (id: string) => void;
  onUpsertBuilding: (b: Building) => void;
  onCreateNewProject: (p: { dealId: string; dealName: string; market: string }) => Promise<Deal | null>;
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
  tenantRating: '' | '1' | '2' | '3' | '4' | '5';
  occupied: 'Yes' | 'No';
  leasableSF: string;
  leaseStart: string;
  leaseTermMonths: string;
  leaseEnd: string;
  freeRentMonths: string;
  annualRentBumpsPct: string;
  tiPerSF: string;
  tiNote: string;
  specOffice: boolean;
  specTIPerSF: string;
  commissionStructurePct: string;
  commissionDollar: string;
  startingAnnualRentPSF: string;
  currentSummary: string;
  notes: string;
  sharepointUrl: string;
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
  deals,
  activities,
  buildings,
  projects,
  spaces,
  onUpsertSpace,
  onClose,
  onSave,
  onDelete,
  onAddActivity,
  onDeleteActivity,
  onUpsertBuilding,
  onCreateNewProject,
}: RentRollDrawerProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>();

  const currentDealId = watch('dealId') ?? row?.dealId ?? '';
  const currentBuildingId = watch('buildingId') ?? row?.buildingId ?? '';
  const currentSpaceIdLive = watch('spaceId') ?? row?.spaceId ?? '';

  // Modals
  const [splitModal, setSplitModal] = useState<{
    open: boolean;
    building: Building | null;
    parentSpaceId: string;
  }>({ open: false, building: null, parentSpaceId: '' });
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
      setValue('dealName', newDeal.dealName, { shouldDirty: true });
      setValue('buildingId', '', { shouldDirty: true });
      setValue('building', '', { shouldDirty: true });
      setValue('spaceId', '', { shouldDirty: true });
    }
    setNewProjectOpen(false);
  };

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
        tenantRating: row.tenantRating == null ? '' : (String(row.tenantRating) as FormValues['tenantRating']),
        occupied: row.occupied ? 'Yes' : 'No',
        leasableSF: toFormString(row.leasableSF),
        leaseStart: toFormString(row.leaseStart),
        leaseTermMonths: toFormString(row.leaseTermMonths),
        leaseEnd: toFormString(row.leaseEnd),
        freeRentMonths: toFormString(row.freeRentMonths),
        annualRentBumpsPct: toFormString(row.annualRentBumpsPct),
        tiPerSF: toFormString(row.tiPerSF),
        tiNote: toFormString(row.tiNote),
        specOffice: row.specOffice,
        specTIPerSF: toFormString(row.specTIPerSF),
        commissionStructurePct: toFormString(row.commissionStructurePct),
        commissionDollar: toFormString(row.commissionDollar),
        startingAnnualRentPSF: toFormString(row.startingAnnualRentPSF),
        currentSummary: toFormString(row.currentSummary),
        notes: toFormString(row.notes),
        sharepointUrl: toFormString(row.sharepointUrl),
      });
    }
  }, [row, reset]);

  if (!row) return null;

  const onSubmit = (v: FormValues) => {
    // Resolve projectUuid by looking up the picked dealId text in the projects
    // table. Falls back to the existing value if no match.
    const pickedDealId = parseStr(v.dealId);
    const resolvedProjectUuid =
      (pickedDealId && projects.find((p) => p.projectCode === pickedDealId)?.id) ||
      row.projectUuid ||
      null;
    const updated: RentRollRow = {
      id: row.id,
      dealId: pickedDealId,
      dealName: parseStr(v.dealName),
      buildingId: parseStr(v.buildingId),
      spaceId: parseStr(v.spaceId),
      building: parseStr(v.building),
      projectUuid: resolvedProjectUuid,
      // spaceUuid resolution requires the spaces table backfill; preserve for now.
      spaceUuid: row.spaceUuid ?? null,
      market: parseStr(v.market),
      propertyType: parseStr(v.propertyType),
      buildingType: parseStr(v.buildingType),
      tenantName: parseStr(v.tenantName),
      tenantRating: v.tenantRating === '' ? null : (Number(v.tenantRating) as TenantRating),
      occupied: v.occupied === 'Yes',
      uwBasis: row.uwBasis,
      leasableSF: parseNum(v.leasableSF),
      leaseStart: parseStr(v.leaseStart),
      leaseTermMonths: parseNum(v.leaseTermMonths),
      leaseEnd: parseStr(v.leaseEnd),
      freeRentMonths: parseNum(v.freeRentMonths),
      annualRentBumpsPct: parseNum(v.annualRentBumpsPct),
      tiPerSF: parseNum(v.tiPerSF),
      tiNote: parseStr(v.tiNote),
      uwTiPerSF: row.uwTiPerSF,
      specOffice: !!v.specOffice,
      specTIPerSF: parseNum(v.specTIPerSF),
      commissionStructurePct: parseNum(v.commissionStructurePct),
      commissionDollar: parseNum(v.commissionDollar),
      lastRevalUWRent: row.lastRevalUWRent,
      startingAnnualRentPSF: parseNum(v.startingAnnualRentPSF),
      inPlaceRent: row.inPlaceRent,
      currentSummary: parseStr(v.currentSummary),
      notes: parseStr(v.notes),
      sharepointUrl: parseStr(v.sharepointUrl),
      // Finalize fields are owned by the PromoteDrawer; preserve whatever
      // the rent_roll row already has when editing here.
      securityDeposit: row.securityDeposit,
      rentCommencementDate: row.rentCommencementDate,
      cashflowJson: row.cashflowJson,
      metadata: row.metadata ?? {},
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
                  <label className={labelClass}>Project</label>
                  <ProjectPicker
                    projects={projects}
                    value={currentDealId}
                    onChange={(p) => {
                      setValue('dealId', p?.projectCode ?? '', { shouldDirty: true });
                      setValue('dealName', p?.name ?? '', { shouldDirty: true });
                      setValue('buildingId', '', { shouldDirty: true });
                      setValue('building', '', { shouldDirty: true });
                      setValue('spaceId', '', { shouldDirty: true });
                    }}
                    onRequestNew={() => setNewProjectOpen(true)}
                  />
                  <input type="hidden" {...register('dealId')} />
                  <input type="hidden" {...register('dealName')} />
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
                      setValue('spaceId', '', { shouldDirty: true });
                    }}
                  />
                  <input type="hidden" {...register('buildingId')} />
                  <input type="hidden" {...register('building')} />
                </div>
                <div>
                  <label className={labelClass}>Space</label>
                  <div className="flex items-stretch gap-1.5">
                    <SpacePicker
                      buildings={buildings}
                      buildingId={currentBuildingId}
                      value={currentSpaceIdLive}
                      onChange={(opt) => {
                        setValue('spaceId', opt?.spaceId ?? '', { shouldDirty: true });
                      }}
                      onRequestSplit={handleSplitRequest}
                      className="flex-1"
                    />
                    <SpaceEditPopover
                      space={
                        spaces.find(
                          (s) => s.buildingUuid === currentBuildingId && s.code === currentSpaceIdLive
                        ) ?? null
                      }
                      onSave={onUpsertSpace}
                    />
                  </div>
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
                  <label className={labelClass}>Market</label>
                  <EnumDropdown
                    options={MARKETS}
                    value={watch('market') ?? ''}
                    onChange={(v) => setValue('market', v, { shouldDirty: true })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Property Type</label>
                  <EnumDropdown
                    options={PROPERTY_TYPES}
                    value={watch('propertyType') ?? ''}
                    onChange={(v) => setValue('propertyType', v, { shouldDirty: true })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Building Type</label>
                  <EnumDropdown
                    options={BUILDING_TYPES}
                    value={watch('buildingType') ?? ''}
                    onChange={(v) => setValue('buildingType', v, { shouldDirty: true })}
                    placeholder="Class A bulk, Last-mile, Cold storage…"
                    className={inputClass}
                  />
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
                  <label className={labelClass}>Tenant Rating</label>
                  <select {...register('tenantRating')} className={inputClass}>
                    <option value="">—</option>
                    <option value="5">★★★★★ (5)</option>
                    <option value="4">★★★★☆ (4)</option>
                    <option value="3">★★★☆☆ (3)</option>
                    <option value="2">★★☆☆☆ (2)</option>
                    <option value="1">★☆☆☆☆ (1)</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Occupied</label>
                  <select {...register('occupied')} className={inputClass}>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
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
              </div>
            </Section>

            <Section icon={DollarSign} title="Rent & Costs">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelClass}>Starting Rent ($/SF)</label>
                  <input {...register('startingAnnualRentPSF')} type="number" step="0.01" className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>TI ($/SF)</label>
                  <input {...register('tiPerSF')} type="number" step="0.01" className={`${inputClass} tabular-nums`} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>TI Note</label>
                  <input {...register('tiNote')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Spec TI ($/SF)</label>
                  <input {...register('specTIPerSF')} type="number" step="0.01" className={`${inputClass} tabular-nums`} />
                </div>
                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 text-sm text-fg cursor-pointer select-none">
                    <input
                      {...register('specOffice')}
                      type="checkbox"
                      className="size-4 rounded border-border accent-accent"
                    />
                    Spec Office
                  </label>
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

            <Section icon={FolderOpen} title="Tenant Folder">
              <div className="space-y-1.5">
                <label className={labelClass}>SharePoint URL</label>
                <div className="flex items-stretch gap-2">
                  <input
                    {...register('sharepointUrl')}
                    type="url"
                    placeholder="https://contoso.sharepoint.com/sites/.../Tenant Folder"
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
                <p className="text-[11px] text-fg-muted">Paste the SharePoint folder link for any team member to access this tenant's docs.</p>
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
