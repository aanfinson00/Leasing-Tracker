// Side drawer shown when the user clicks a project marker. Now also
// hosts the building editor: list of drawn buildings (name + height
// editable, delete), plus an "Add building" button that puts the
// map into draw mode.

import { Building2, X, ChevronRight, Plus, Trash2 } from 'lucide-react';
import type { Building, Deal } from '../../types';
import type { Project } from './MapView';
import { StatusBadge } from '../StatusBadge';

interface Props {
  project: Project;
  buildings: Building[];
  drawMode: boolean;
  onClose: () => void;
  onSelectDeal: (deal: Deal) => void;
  onStartDraw: () => void;
  onSaveBuilding: (b: Building) => void;
  onDeleteBuilding: (id: string) => void;
}

export function ProjectDrawer({
  project,
  buildings,
  drawMode,
  onClose,
  onSelectDeal,
  onStartDraw,
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
      {/* Left side is pointer-events-none — the map underneath stays
          fully navigable (pan, zoom, drag pins, place new pins, draw
          polygons). Drawer dismissal is the X in the header or
          switching to another project by clicking its pin. */}
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
            drawMode={drawMode}
            onStartDraw={onStartDraw}
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
  drawMode,
  onStartDraw,
  onSaveBuilding,
  onDeleteBuilding,
}: {
  buildings: Building[];
  drawMode: boolean;
  onStartDraw: () => void;
  onSaveBuilding: (b: Building) => void;
  onDeleteBuilding: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">
          Buildings
        </h3>
        <button
          type="button"
          onClick={onStartDraw}
          disabled={drawMode}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-accent-fg bg-accent rounded-lg hover:bg-accent-hover transition-colors shadow-soft disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={12} strokeWidth={2.5} />
          {drawMode ? 'Drawing…' : 'Add building'}
        </button>
      </div>
      {buildings.length === 0 ? (
        <p className="text-xs text-fg-muted bg-bg-elevated/50 border border-dashed border-border rounded-xl px-4 py-3.5">
          No buildings yet. Click <strong className="text-fg">Add building</strong> and trace a
          rectangle on the map — right angles snap automatically.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
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

function BuildingRow({
  building,
  onSave,
  onDelete,
}: {
  building: Building;
  onSave: (b: Building) => void;
  onDelete: (id: string) => void;
}) {
  const updateField = <K extends 'name' | 'heightFt'>(field: K, value: Building[K]) => {
    onSave({
      ...building,
      [field]: value,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-elevated border border-border shadow-soft">
      <input
        type="text"
        value={building.name}
        onChange={(e) => updateField('name', e.target.value)}
        className="flex-1 min-w-0 bg-transparent text-sm font-medium text-fg focus:outline-none focus:ring-2 focus:ring-accent/40 rounded px-1.5 py-0.5"
        aria-label="Building name"
      />
      <div className="flex items-center gap-1 text-fg-muted text-xs">
        <input
          type="number"
          step={1}
          value={Number.isFinite(building.heightFt) ? building.heightFt : ''}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v) && v > 0) updateField('heightFt', v);
          }}
          className="w-16 bg-bg rounded-md text-sm text-fg tabular-nums text-right focus:outline-none focus:ring-2 focus:ring-accent/40 px-2 py-1 border border-border"
          aria-label="Height in feet"
        />
        <span className="font-medium">ft</span>
      </div>
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
