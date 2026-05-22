// Side drawer shown when the user clicks a project marker on the map.
// Lists every deal that shares the project's dealId (e.g. all spaces
// under "Caliber 4001"). Each row → opens the existing DealDrawer.

import { Building2, X, ChevronRight, Plus, Construction } from 'lucide-react';
import type { Deal } from '../../types';
import type { Project } from './MapView';
import { StatusBadge } from '../StatusBadge';

interface Props {
  project: Project;
  onClose: () => void;
  onSelectDeal: (deal: Deal) => void;
}

export function ProjectDrawer({ project, onClose, onSelectDeal }: Props) {
  // Sort deals: in-flight (non-Lost) first, then by spaceId for stable order.
  const sortedDeals = [...project.deals].sort((a, b) => {
    const aLost = a.status === 'Lost' ? 1 : 0;
    const bLost = b.status === 'Lost' ? 1 : 0;
    if (aLost !== bLost) return aLost - bLost;
    return (a.spaceId ?? '').localeCompare(b.spaceId ?? '');
  });

  // Aggregate roll-ups for the header.
  const totalSF = sortedDeals.reduce((acc, d) => acc + (d.maxSF ?? d.minSF ?? 0), 0);
  const buildingsTouched = new Set(
    sortedDeals.map((d) => d.building?.trim()).filter((b): b is string => !!b)
  );
  const tenantsList = sortedDeals
    .map((d) => d.prospectTenant?.trim())
    .filter((t): t is string => !!t);

  return (
    <div className="fixed inset-0 z-40 flex pointer-events-none">
      {/* Click-catcher only — no blur or darkening, so the zoomed map
          stays readable behind the drawer. The pointer-events-none on
          the wrapper + pointer-events-auto on this catcher means clicks
          OUTSIDE both go through to the map (pan/zoom still work). */}
      <div
        className="flex-1 pointer-events-auto"
        onClick={onClose}
        aria-label="Close project drawer"
      />
      <div className="w-full max-w-md bg-bg/95 backdrop-blur-md shadow-lift overflow-y-auto pointer-events-auto border-l border-border">
        <div className="sticky top-0 bg-bg/90 backdrop-blur-md border-b border-border px-7 py-5 z-10">
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
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Deals" value={String(sortedDeals.length)} />
            <Stat
              label="Total SF"
              value={totalSF > 0 ? totalSF.toLocaleString('en-US') : '—'}
            />
            <Stat
              label="Buildings"
              value={buildingsTouched.size > 0 ? String(buildingsTouched.size) : '—'}
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

          {/* Phase 2b — building editor lives here. mapbox-gl-draw with
              right-angle snap, fill-extrusion heights, edit/delete/
              rename, color per building. Disabled placeholder for now
              so the affordance is visible. */}
          <div className="rounded-xl border border-dashed border-border bg-bg-elevated/50 px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Construction size={14} strokeWidth={2} className="text-accent shrink-0" />
                  <h3 className="text-sm font-semibold text-fg">Buildings</h3>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-accent bg-accent-tint px-1.5 py-0.5 rounded">
                    Phase 2
                  </span>
                </div>
                <p className="text-xs text-fg-muted mt-1.5 leading-relaxed">
                  Draw building footprints on the map with right-angle snap, set heights, and
                  see 3D extrusions. Coming next.
                </p>
              </div>
              <button
                type="button"
                disabled
                title="Coming soon"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-fg-subtle bg-bg-elevated border border-border rounded-lg shadow-soft opacity-50 cursor-not-allowed shrink-0"
              >
                <Plus size={12} strokeWidth={2} />
                Add
              </button>
            </div>
          </div>

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
