import { useMemo, useState } from 'react';
import { Plus, HandCoins, CalendarClock, AlertTriangle, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import type {
  Contact,
  DispositionListing,
  DispositionListingContact,
  DispositionListingNote,
  DispositionStatus,
  RiskLevel,
} from '../../types';
import { DISPO_PIPELINE_ORDER, DispositionStatusEnum } from '../../types';
import { DispositionListingDrawer } from './DispositionListingDrawer';
import { ExcelToolbar } from '../ExcelToolbar';
import { MapView } from '../Map/MapView';
import { GeoFilterBar } from '../GeoFilterBar';
import { useGeoFilters, applyFilter } from '../../lib/useGeoFilters';

interface DispositionViewProps {
  listings: DispositionListing[];
  onSave: (d: DispositionListing) => void;
  onDelete: (id: string) => void;
  onUpdateListingCoords: (id: string, lat: number, lng: number) => void;
  onToast?: (msg: string) => void;
  // CRM
  contacts: Contact[];
  contactLinks: DispositionListingContact[];
  notes: DispositionListingNote[];
  onSaveContact: (c: Contact) => void;
  onLinkContact: (link: DispositionListingContact) => void;
  onUnlinkContact: (linkId: string) => void;
  onSaveNote: (n: DispositionListingNote) => void;
  onDeleteNote: (id: string) => void;
  onExcelExport?: () => void;
  onExcelImport?: (file: File) => void;
}

const SIDE_STATUSES: DispositionStatus[] = ['Pulled', 'On Hold'];

function newListingTemplate(): DispositionListing {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    assetName: '',
    buildingId: null,
    market: null,
    submarket: null,
    county: null,
    city: null,
    address: null,
    propertyType: null,
    status: 'Considering',
    totalSF: null,
    acres: null,
    occupancyPct: null,
    trailingNOI: null,
    forwardNOI: null,
    listPrice: null,
    listCapPct: null,
    achievedPrice: null,
    achievedCapPct: null,
    netProceeds: null,
    brokerCommissionPct: null,
    listDate: null,
    bidsDueDate: null,
    loiExecutedDate: null,
    psaExecutedDate: null,
    expectedClosingDate: null,
    actualClosingDate: null,
    riskLevel: 'Medium',
    statusSummary: null,
    lat: null,
    lng: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
  };
}

const fmtMoney = (v: number | null) =>
  v == null
    ? '—'
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(v);

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.floor((t - Date.now()) / 86_400_000);
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const cls =
    level === 'High'
      ? 'bg-danger/10 text-danger border-danger/30'
      : level === 'Medium'
        ? 'bg-warning/10 text-warning border-warning/30'
        : 'bg-success/10 text-success border-success/30';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border ${cls}`}
    >
      {level}
    </span>
  );
}

function StatusPill({ status }: { status: DispositionStatus }) {
  const isSide = SIDE_STATUSES.includes(status);
  const cls = isSide
    ? 'bg-fg-subtle/10 text-fg-muted border-fg-subtle/20'
    : status === 'Closed'
      ? 'bg-success/10 text-success border-success/30'
      : 'bg-accent-tint text-accent border-accent/30';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border ${cls}`}
    >
      {status}
    </span>
  );
}

export function DispositionView({
  listings,
  onSave,
  onDelete,
  onUpdateListingCoords,
  onToast,
  contacts,
  contactLinks,
  notes,
  onSaveContact,
  onLinkContact,
  onUnlinkContact,
  onSaveNote,
  onDeleteNote,
  onExcelExport,
  onExcelImport,
}: DispositionViewProps) {
  const [editing, setEditing] = useState<DispositionListing | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    DispositionStatus | 'all' | 'active'
  >('active');
  const [mapOpen, setMapOpen] = useState(true);
  const { filters: geoFilters, setFilters: setGeoFilters, reset: resetGeoFilters } = useGeoFilters('dispo');

  const geoFiltered = useMemo(() => applyFilter(listings, geoFilters), [listings, geoFilters]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return geoFiltered;
    if (statusFilter === 'active') {
      return geoFiltered.filter(
        (d) => !SIDE_STATUSES.includes(d.status) && d.status !== 'Closed'
      );
    }
    return geoFiltered.filter((d) => d.status === statusFilter);
  }, [geoFiltered, statusFilter]);

  const visible = useMemo(() => {
    const submarkets = new Set<string>();
    const counties = new Set<string>();
    const cities = new Set<string>();
    for (const d of listings) {
      if (d.submarket) submarkets.add(d.submarket);
      if (d.county) counties.add(d.county);
      if (d.city) cities.add(d.city);
    }
    return {
      submarkets: Array.from(submarkets).sort(),
      counties: Array.from(counties).sort(),
      cities: Array.from(cities).sort(),
    };
  }, [listings]);

  const byStatus = useMemo(() => {
    const m = new Map<DispositionStatus, DispositionListing[]>();
    DispositionStatusEnum.options.forEach((s) => m.set(s, []));
    for (const d of filtered) m.get(d.status)!.push(d);
    return m;
  }, [filtered]);

  const stats = useMemo(() => {
    const active = listings.filter(
      (d) => !SIDE_STATUSES.includes(d.status) && d.status !== 'Closed'
    );
    const totalList = active.reduce((sum, d) => sum + (d.listPrice ?? 0), 0);
    // Expected proceeds: prefer achievedPrice when known, fall back to list
    const totalExpected = active.reduce(
      (sum, d) => sum + (d.achievedPrice ?? d.listPrice ?? 0),
      0
    );
    const closingSoon = active.filter((d) => {
      const days = daysUntil(d.expectedClosingDate);
      return days != null && days <= 60 && days >= 0;
    });
    const highRisk = active.filter((d) => d.riskLevel === 'High');
    return {
      activeCount: active.length,
      totalList,
      totalExpected,
      closingSoonCount: closingSoon.length,
      highRiskCount: highRisk.length,
    };
  }, [listings]);

  return (
    <div className="flex flex-col gap-5 max-w-[1400px] mx-auto w-full">
      <header className="rounded-2xl bg-bg-elevated shadow-soft p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-accent-tint text-accent">
              <HandCoins size={18} strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-fg tracking-tight">
                Disposition Tracking
              </h2>
              <p className="text-xs text-fg-muted mt-0.5">
                {stats.activeCount} active · {fmtMoney(stats.totalList)} listed ·
                {' '}
                {fmtMoney(stats.totalExpected)} expected proceeds
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onExcelExport && onExcelImport && (
              <ExcelToolbar onExport={onExcelExport} onImport={onExcelImport} itemCount={listings.length} />
            )}
            <button
              type="button"
              onClick={() => setEditing(newListingTemplate())}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-accent-fg bg-accent rounded-xl hover:bg-accent-hover transition-colors shadow-soft"
            >
              <Plus size={15} strokeWidth={2} />
              New listing
            </button>
          </div>
        </div>

        {(stats.closingSoonCount > 0 || stats.highRiskCount > 0) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {stats.closingSoonCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-warning/10 text-warning border border-warning/30">
                <CalendarClock size={13} strokeWidth={1.75} />
                {stats.closingSoonCount} closing in next 60 days
              </span>
            )}
            {stats.highRiskCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-danger/10 text-danger border border-danger/30">
                <AlertTriangle size={13} strokeWidth={1.75} />
                {stats.highRiskCount} high-risk
              </span>
            )}
          </div>
        )}

        <div className="mt-4 border-t border-border pt-3">
          <GeoFilterBar
            filters={geoFilters}
            onChange={setGeoFilters}
            onReset={resetGeoFilters}
            visibleSubmarkets={visible.submarkets}
            visibleCounties={visible.counties}
            visibleCities={visible.cities}
          />
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              statusFilter === 'active'
                ? 'bg-accent text-accent-fg'
                : 'text-fg-muted hover:text-fg hover:bg-bg-hover'
            }`}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              statusFilter === 'all'
                ? 'bg-accent text-accent-fg'
                : 'text-fg-muted hover:text-fg hover:bg-bg-hover'
            }`}
          >
            All
          </button>
          <span className="text-fg-subtle mx-1">·</span>
          <select
            value={statusFilter === 'active' || statusFilter === 'all' ? '' : statusFilter}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') setStatusFilter('active');
              else setStatusFilter(v as DispositionStatus);
            }}
            className="px-2.5 py-1.5 text-xs rounded-lg bg-bg border border-border text-fg-muted hover:text-fg transition-colors"
          >
            <option value="">Status…</option>
            {DispositionStatusEnum.options.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </header>

      {listings.length > 0 && (
        <section className="rounded-2xl bg-bg-elevated shadow-soft overflow-hidden">
          <header className="px-5 py-3 border-b border-border flex items-center justify-between bg-bg/60">
            <div className="flex items-center gap-2">
              <MapPin size={14} strokeWidth={2} className="text-accent" />
              <span className="text-sm font-medium text-fg">Map</span>
              <span className="text-xs text-fg-muted">
                · scoped to {filtered.length}{' '}
                {filtered.length === 1 ? 'listing' : 'listings'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMapOpen((v) => !v)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-fg-muted hover:text-fg hover:bg-bg-hover transition-colors"
              aria-expanded={mapOpen}
            >
              {mapOpen ? <ChevronUp size={13} strokeWidth={2} /> : <ChevronDown size={13} strokeWidth={2} />}
              {mapOpen ? 'Collapse' : 'Expand'}
            </button>
          </header>
          {mapOpen && (
            <div className="h-[420px] p-3">
              <MapView
                mode="dispo-only"
                deals={[]}
                dispoListings={filtered}
                onSelectDeal={() => {}}
                onUpdateProjectCoords={() => {}}
                onSelectDispoListing={(d) => setEditing(d)}
                onUpdateDispoListingCoords={onUpdateListingCoords}
                onToast={onToast}
              />
            </div>
          )}
        </section>
      )}

      {listings.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border rounded-2xl bg-bg-elevated">
          <p className="text-sm text-fg-muted max-w-md mx-auto">
            No dispositions yet. Click <span className="font-medium text-fg">New listing</span>{' '}
            to track a sale from Considering through Closed.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {DISPO_PIPELINE_ORDER.map((status) => {
            const rows = byStatus.get(status) ?? [];
            if (rows.length === 0) return null;
            return (
              <section
                key={status}
                className="rounded-2xl bg-bg-elevated shadow-soft overflow-hidden"
              >
                <header className="px-5 py-3 border-b border-border flex items-center justify-between bg-bg/60">
                  <div className="flex items-center gap-2">
                    <StatusPill status={status} />
                    <span className="text-xs text-fg-muted">
                      {rows.length} {rows.length === 1 ? 'listing' : 'listings'}
                    </span>
                  </div>
                </header>
                <table className="w-full text-sm">
                  <tbody>
                    {rows.map((d) => {
                      const days = daysUntil(d.expectedClosingDate);
                      const dayClass =
                        days == null
                          ? 'text-fg-subtle'
                          : days < 0
                            ? 'text-danger'
                            : days <= 30
                              ? 'text-warning'
                              : 'text-fg-muted';
                      return (
                        <tr
                          key={d.id}
                          onClick={() => setEditing(d)}
                          className="border-b border-border/40 last:border-b-0 hover:bg-bg-hover/60 cursor-pointer transition-colors"
                        >
                          <td className="py-3 px-5">
                            <div className="font-medium text-fg">{d.assetName}</div>
                            {(d.market || d.address) && (
                              <div className="text-xs text-fg-muted mt-0.5">
                                {[d.market, d.address].filter(Boolean).join(' · ')}
                              </div>
                            )}
                            {d.statusSummary && (
                              <div className="text-xs text-fg-subtle mt-1 max-w-md truncate">
                                {d.statusSummary}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 tabular-nums text-right text-fg-muted whitespace-nowrap">
                            {fmtMoney(d.achievedPrice ?? d.listPrice)}
                          </td>
                          <td className="py-3 px-3 tabular-nums text-right text-fg-muted whitespace-nowrap">
                            {d.achievedCapPct != null
                              ? `${(d.achievedCapPct * 100).toFixed(2)}%`
                              : d.listCapPct != null
                                ? `${(d.listCapPct * 100).toFixed(2)}%`
                                : '—'}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <RiskBadge level={d.riskLevel} />
                          </td>
                          <td className={`py-3 px-3 text-xs tabular-nums whitespace-nowrap ${dayClass}`}>
                            {d.expectedClosingDate ?? '—'}
                            {days != null && (
                              <span className="ml-1 text-fg-subtle">
                                ({days >= 0 ? `${days}d` : `${Math.abs(days)}d ago`})
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            );
          })}

          {SIDE_STATUSES.map((status) => {
            const rows = byStatus.get(status) ?? [];
            if (rows.length === 0) return null;
            return (
              <section
                key={status}
                className="rounded-2xl bg-bg-elevated/60 shadow-soft overflow-hidden opacity-80"
              >
                <header className="px-5 py-3 border-b border-border flex items-center gap-2">
                  <StatusPill status={status} />
                  <span className="text-xs text-fg-muted">{rows.length}</span>
                </header>
                <ul className="px-5 py-3 text-sm text-fg-muted space-y-1">
                  {rows.map((d) => (
                    <li
                      key={d.id}
                      onClick={() => setEditing(d)}
                      className="cursor-pointer hover:text-fg"
                    >
                      {d.assetName}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {editing && (
        <DispositionListingDrawer
          listing={editing}
          onClose={() => setEditing(null)}
          onSave={onSave}
          onDelete={onDelete}
          allContacts={contacts}
          contactLinks={contactLinks}
          notes={notes}
          onSaveContact={onSaveContact}
          onLinkContact={onLinkContact}
          onUnlinkContact={onUnlinkContact}
          onSaveNote={onSaveNote}
          onDeleteNote={onDeleteNote}
        />
      )}
    </div>
  );
}
