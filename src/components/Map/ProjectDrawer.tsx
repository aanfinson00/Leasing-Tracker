// Side drawer shown when a project marker is clicked. Hosts the
// parametric building editor: input W × D × rotation × bay count,
// then click the satellite to drop the rectangle. Each existing
// building has an inline editor — same fields plus name + height.

import { useState } from 'react';
import { Building2, X, ChevronRight, Plus, Trash2 } from 'lucide-react';
import type { Building, Deal } from '../../types';
import type { Project, PlacementParams } from './MapView';
import { DEFAULT_BUILDING_PARAMS } from '../../lib/map-utils/parametric';
import { StatusBadge } from '../StatusBadge';

interface Props {
  project: Project;
  buildings: Building[];
  placement: PlacementParams | null;
  onClose: () => void;
  onSelectDeal: (deal: Deal) => void;
  onStartPlacement: (params: PlacementParams) => void;
  onCancelPlacement: () => void;
  onSaveBuilding: (b: Building) => void;
  onDeleteBuilding: (id: string) => void;
}

export function ProjectDrawer({
  project,
  buildings,
  placement,
  onClose,
  onSelectDeal,
  onStartPlacement,
  onCancelPlacement,
  onSaveBuilding,
  onDeleteBuilding,
}: Props) {
  const sortedDeals = [...project.deals].sort((a, b) => {
    const aLost = a.status === 'Lost' ? 1 : 0;
    const bLost = b.status === 'Lost' ? 1 : 0;
    if (aLost !== bLost) return aLost - bLost;
    return (a.spaceId ?? '').localeCompare(b.spaceId ?? '');
  });

  const totalSF = sortedDeals.reduce((acc, d) => acc + (d.maxSF ?? d.minSF ?? 0), 0);
  const tenantsList = sortedDeals
    .map((d) => d.prospectTenant?.trim())
    .filter((t): t is string => !!t);

  return (
    <div className="fixed inset-0 z-40 flex pointer-events-none">
      <div className="flex-1 pointer-events-none" aria-hidden />
      <div className="w-full max-w-md bg-bg/95 backdrop-blur-md shadow-lift overflow-y-auto pointer-events-auto border-l border-border">
        <div className="sticky top-0 bg-bg/95 backdrop-blur-md border-b border-border px-7 py-5 z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex items-center gap-3 flex-wrap">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-accent-tint text-accent shrink-0">
                <Building2 size={17} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl text-fg tracking-[-0.01em] font-semibold truncate">
                  {project.name}
                </h2>
                <p className="text-xs text-fg-muted tabular-nums mt-0.5">
                  Project {project.id}
                  {project.lat != null && project.lng != null && (
                    <>
                      {' · '}
                      {project.lat.toFixed(4)}, {project.lng.toFixed(4)}
                    </>
                  )}
                </p>
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

        <div className="px-7 py-6 flex flex-col gap-5">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Deals" value={String(sortedDeals.length)} />
            <Stat
              label="Total SF"
              value={totalSF > 0 ? totalSF.toLocaleString('en-US') : '—'}
            />
            <Stat
              label="Buildings"
              value={buildings.length > 0 ? String(buildings.length) : '—'}
            />
          </div>

          {tenantsList.length > 0 && (
            <div className="bg-bg-elevated rounded-xl px-4 py-3 shadow-soft">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-fg-subtle mb-1.5">
                Prospects / Tenants
              </p>
              <p className="text-sm text-fg">{[...new Set(tenantsList)].join(' · ')}</p>
            </div>
          )}

          <BuildingsSection
            buildings={buildings}
            placement={placement}
            onStartPlacement={onStartPlacement}
            onCancelPlacement={onCancelPlacement}
            onSaveBuilding={onSaveBuilding}
            onDeleteBuilding={onDeleteBuilding}
          />

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-subtle mb-3">
              Deals in this project
            </h3>
            <div className="flex flex-col gap-2">
              {sortedDeals.map((deal) => (
                <button
                  key={deal.id}
                  type="button"
                  onClick={() => onSelectDeal(deal)}
                  className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-bg-elevated hover:bg-bg-hover border border-border transition-colors text-left shadow-soft"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-fg truncate">
                        {deal.spaceId ?? deal.prospectTenant ?? deal.dealName}
                      </span>
                      <StatusBadge status={deal.status} />
                    </div>
                    <p className="text-xs text-fg-muted mt-1 tabular-nums">
                      {deal.prospectTenant && <span>{deal.prospectTenant}</span>}
                      {deal.prospectTenant && (deal.building || deal.maxSF) && (
                        <span className="text-fg-subtle"> · </span>
                      )}
                      {deal.building && <span>{deal.building}</span>}
                      {(deal.maxSF || deal.minSF) && (
                        <>
                          <span className="text-fg-subtle"> · </span>
                          <span>
                            {((deal.maxSF ?? deal.minSF) as number).toLocaleString('en-US')} SF
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <ChevronRight
                    size={14}
                    strokeWidth={2}
                    className="text-fg-subtle group-hover:text-fg transition-colors shrink-0"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BuildingsSection({
  buildings,
  placement,
  onStartPlacement,
  onCancelPlacement,
  onSaveBuilding,
  onDeleteBuilding,
}: {
  buildings: Building[];
  placement: PlacementParams | null;
  onStartPlacement: (p: PlacementParams) => void;
  onCancelPlacement: () => void;
  onSaveBuilding: (b: Building) => void;
  onDeleteBuilding: (id: string) => void;
}) {
  // The "Add building" panel — collapsed by default. When opened,
  // shows the parametric inputs and the "Click on map to place"
  // hint. While `placement` is active (after user clicked Place),
  // the panel shows the current params + Cancel.
  const [adding, setAdding] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">
          Buildings
        </h3>
        {!adding && !placement && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-accent-fg bg-accent rounded-lg hover:bg-accent-hover transition-colors shadow-soft"
          >
            <Plus size={12} strokeWidth={2.5} />
            Add building
          </button>
        )}
      </div>

      {(adding || placement) && (
        <NewBuildingForm
          placement={placement}
          onStartPlacement={(params) => {
            onStartPlacement(params);
          }}
          onCancel={() => {
            setAdding(false);
            onCancelPlacement();
          }}
          onDone={() => setAdding(false)}
        />
      )}

      {buildings.length === 0 ? (
        !adding && !placement && (
          <p className="text-xs text-fg-muted bg-bg-elevated/50 border border-dashed border-border rounded-xl px-4 py-3.5">
            No buildings yet. Click <strong className="text-fg">Add building</strong>, set
            dimensions, then click the satellite to drop the rectangle.
          </p>
        )
      ) : (
        <div className="flex flex-col gap-2 mt-3">
          {buildings.map((b) => (
            <BuildingRow
              key={b.id}
              building={b}
              onSave={onSaveBuilding}
              onDelete={onDeleteBuilding}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NewBuildingForm({
  placement,
  onStartPlacement,
  onCancel,
  onDone,
}: {
  placement: PlacementParams | null;
  onStartPlacement: (p: PlacementParams) => void;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [params, setParams] = useState<PlacementParams>(
    placement ?? {
      widthFt: DEFAULT_BUILDING_PARAMS.widthFt,
      depthFt: DEFAULT_BUILDING_PARAMS.depthFt,
      rotationDeg: DEFAULT_BUILDING_PARAMS.rotationDeg,
      bayCount: DEFAULT_BUILDING_PARAMS.bayCount,
    }
  );

  // When the parent flips placement off (after a successful drop or
  // cancel from the map banner), collapse the form.
  // Note: useEffect not needed; React re-renders propagate placement.

  const sf = params.widthFt * params.depthFt;
  const sfPerBay = params.bayCount > 0 ? sf / params.bayCount : sf;

  const setField = <K extends keyof PlacementParams>(k: K, v: PlacementParams[K]) =>
    setParams((p) => ({ ...p, [k]: v }));

  return (
    <div className="bg-bg-elevated rounded-xl border border-border shadow-soft p-4 flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <NumField
          label="Width (ft)"
          value={params.widthFt}
          onChange={(v) => setField('widthFt', Math.max(10, v))}
          step={10}
        />
        <NumField
          label="Depth (ft)"
          value={params.depthFt}
          onChange={(v) => setField('depthFt', Math.max(10, v))}
          step={10}
        />
        <NumField
          label="Rotation (deg)"
          value={params.rotationDeg}
          onChange={(v) => setField('rotationDeg', ((v % 360) + 360) % 360)}
          step={15}
        />
        <NumField
          label="Bays"
          value={params.bayCount}
          onChange={(v) => setField('bayCount', Math.max(1, Math.min(50, Math.round(v))))}
          step={1}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-fg-muted tabular-nums">
        <span>
          <strong className="text-fg">{Math.round(sf).toLocaleString('en-US')}</strong> SF total
          {params.bayCount > 1 && (
            <>
              {' '}
              · <strong className="text-fg">{Math.round(sfPerBay).toLocaleString('en-US')}</strong>{' '}
              SF/bay
            </>
          )}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {placement ? (
          <button
            type="button"
            onClick={() => {
              onCancel();
            }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-fg-muted bg-bg-hover rounded-lg hover:text-fg transition-colors"
          >
            <X size={12} strokeWidth={2} />
            Cancel placement
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                onStartPlacement(params);
                onDone();
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-accent-fg bg-accent rounded-lg hover:bg-accent-hover transition-colors shadow-soft"
            >
              <Plus size={12} strokeWidth={2.5} />
              Click map to place
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1 px-2.5 py-2 text-xs text-fg-muted hover:text-fg hover:bg-bg-hover rounded-lg transition-colors"
            >
              Close
            </button>
          </>
        )}
      </div>

      {placement && (
        <p className="text-[11px] text-warning leading-snug">
          Click anywhere on the satellite to drop this rectangle at that point.
        </p>
      )}
    </div>
  );
}

function BuildingRow({
  building,
  onSave,
  onDelete,
}: {
  building: Building;
  onSave: (b: Building) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const update = <K extends keyof Building>(field: K, value: Building[K]) => {
    onSave({
      ...building,
      [field]: value,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="rounded-xl bg-bg-elevated border border-border shadow-soft">
      <div className="flex items-center gap-2 px-3 py-2">
        <input
          type="text"
          value={building.name}
          onChange={(e) => update('name', e.target.value)}
          className="flex-1 min-w-0 bg-transparent text-sm font-medium text-fg focus:outline-none focus:ring-2 focus:ring-accent/40 rounded px-1.5 py-0.5"
          aria-label="Building name"
        />
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[11px] font-medium text-fg-muted hover:text-fg px-2 py-1 rounded-md hover:bg-bg-hover transition-colors"
        >
          {expanded ? 'Hide' : 'Edit'}
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Delete ${building.name}?`)) onDelete(building.id);
          }}
          className="p-1.5 rounded-md text-fg-subtle hover:text-danger hover:bg-danger/10 transition-colors"
          aria-label={`Delete ${building.name}`}
        >
          <Trash2 size={13} strokeWidth={2} />
        </button>
      </div>
      {expanded && (
        <div className="border-t border-border/60 px-3 py-3 grid grid-cols-2 gap-3">
          {building.widthFt != null && (
            <NumField
              label="Width (ft)"
              value={building.widthFt}
              onChange={(v) => update('widthFt', Math.max(10, v))}
              step={10}
            />
          )}
          {building.depthFt != null && (
            <NumField
              label="Depth (ft)"
              value={building.depthFt}
              onChange={(v) => update('depthFt', Math.max(10, v))}
              step={10}
            />
          )}
          <NumField
            label="Rotation (deg)"
            value={building.rotationDeg}
            onChange={(v) => update('rotationDeg', ((v % 360) + 360) % 360)}
            step={15}
          />
          <NumField
            label="Bays"
            value={building.bayCount}
            onChange={(v) => update('bayCount', Math.max(1, Math.min(50, Math.round(v))))}
            step={1}
          />
          <NumField
            label="Height (ft)"
            value={building.heightFt}
            onChange={(v) => update('heightFt', Math.max(1, v))}
            step={1}
          />
          {building.widthFt != null && building.depthFt != null && (
            <div className="col-span-2 text-[11px] text-fg-muted tabular-nums pt-1">
              <strong className="text-fg">
                {Math.round(building.widthFt * building.depthFt).toLocaleString('en-US')}
              </strong>{' '}
              SF total
              {building.bayCount > 1 && (
                <>
                  {' '}
                  ·{' '}
                  <strong className="text-fg">
                    {Math.round(
                      (building.widthFt * building.depthFt) / building.bayCount
                    ).toLocaleString('en-US')}
                  </strong>{' '}
                  SF/bay
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-fg-subtle">
        {label}
      </span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : ''}
        step={step}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(v);
        }}
        className="w-full px-3 py-2 bg-bg rounded-lg text-sm text-fg tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/40 border border-border"
      />
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-elevated rounded-xl px-4 py-3 shadow-soft">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">
        {label}
      </p>
      <p className="text-lg font-semibold text-fg tabular-nums mt-0.5">{value}</p>
    </div>
  );
}
