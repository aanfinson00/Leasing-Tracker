import { useMemo, useState } from 'react';
import { Plus, Database, Search, ShieldCheck, ExternalLink } from 'lucide-react';
import type { LeaseComp } from '../../types';
import { CompDrawer } from './CompDrawer';

interface CompsViewProps {
  comps: LeaseComp[];
  onSave: (c: LeaseComp) => void;
  onDelete: (id: string) => void;
}

type SortKey =
  | 'signedDate'
  | 'market'
  | 'baseRentPSF'
  | 'leaseSF'
  | 'tiPSF'
  | 'termMonths';

function newCompTemplate(): LeaseComp {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    propertyName: null,
    buildingAddress: null,
    market: null,
    propertyType: null,
    buildingType: null,
    tenantName: null,
    tenantIndustry: null,
    transactionType: 'New Lease',
    signedDate: now.slice(0, 10),
    deliveryDate: null,
    leaseSF: null,
    buildingSF: null,
    baseRentPSF: null,
    effectiveRentPSF: null,
    rentType: 'NNN',
    termMonths: 60,
    freeRentMonths: null,
    tiPSF: null,
    escalationPct: null,
    options: null,
    source: null,
    sourceUrl: null,
    confidence: 'Medium',
    confidential: false,
    notes: null,
    createdAt: now,
    updatedAt: now,
  };
}

const fmtCurrency = (v: number | null) =>
  v == null
    ? '—'
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
      }).format(v);
const fmtNumber = (v: number | null, digits = 0) =>
  v == null
    ? '—'
    : new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(v);
const fmtPct = (v: number | null) => (v == null ? '—' : `${(v * 100).toFixed(2)}%`);

export function CompsView({ comps, onSave, onDelete }: CompsViewProps) {
  const [editing, setEditing] = useState<LeaseComp | null>(null);
  const [search, setSearch] = useState('');
  const [marketFilter, setMarketFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('signedDate');
  const [sortDesc, setSortDesc] = useState(true);

  const markets = useMemo(() => {
    const set = new Set<string>();
    comps.forEach((c) => c.market && set.add(c.market));
    return Array.from(set).sort();
  }, [comps]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = comps;
    if (q) {
      list = list.filter((c) =>
        [
          c.propertyName,
          c.tenantName,
          c.buildingAddress,
          c.market,
          c.source,
          c.notes,
        ]
          .filter(Boolean)
          .some((s) => s!.toLowerCase().includes(q))
      );
    }
    if (marketFilter !== 'all') {
      list = list.filter((c) => c.market === marketFilter);
    }
    const sorted = [...list].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      // null-last
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDesc ? bv - av : av - bv;
      }
      const cmp = String(av).localeCompare(String(bv));
      return sortDesc ? -cmp : cmp;
    });
    return sorted;
  }, [comps, search, marketFilter, sortKey, sortDesc]);

  const aggregates = useMemo(() => {
    const withRent = filtered.filter((c) => c.baseRentPSF != null);
    const withTi = filtered.filter((c) => c.tiPSF != null);
    const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
    const median = (xs: number[]) => {
      if (xs.length === 0) return null;
      const s = [...xs].sort((a, b) => a - b);
      const mid = Math.floor(s.length / 2);
      return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
    };
    return {
      count: filtered.length,
      avgRent:
        withRent.length === 0
          ? null
          : sum(withRent.map((c) => c.baseRentPSF!)) / withRent.length,
      medianRent: median(withRent.map((c) => c.baseRentPSF!)),
      avgTi:
        withTi.length === 0
          ? null
          : sum(withTi.map((c) => c.tiPSF!)) / withTi.length,
    };
  }, [filtered]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDesc(!sortDesc);
    else {
      setSortKey(k);
      setSortDesc(true);
    }
  };

  const headerCellClass =
    'py-2.5 px-3 text-xs font-medium uppercase tracking-wider text-fg-subtle cursor-pointer select-none';

  return (
    <div className="flex flex-col gap-5 max-w-[1400px] mx-auto w-full">
      <header className="rounded-2xl bg-bg-elevated shadow-soft p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-accent-tint text-accent">
              <Database size={18} strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-fg tracking-tight">
                Comps Library
              </h2>
              <p className="text-xs text-fg-muted mt-0.5">
                {aggregates.count} {aggregates.count === 1 ? 'comp' : 'comps'} ·
                avg base rent {fmtCurrency(aggregates.avgRent)}/SF · median{' '}
                {fmtCurrency(aggregates.medianRent)}/SF · avg TI{' '}
                {fmtCurrency(aggregates.avgTi)}/SF
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditing(newCompTemplate())}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-accent-fg bg-accent rounded-xl hover:bg-accent-hover transition-colors shadow-soft"
          >
            <Plus size={15} strokeWidth={2} />
            Log comp
          </button>
        </div>

        <div className="mt-5 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search
              size={14}
              strokeWidth={1.75}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tenant, address, source, notes…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-bg border border-border text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
            />
          </div>
          <select
            value={marketFilter}
            onChange={(e) => setMarketFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg bg-bg border border-border text-fg-muted hover:text-fg transition-colors"
          >
            <option value="all">All markets</option>
            {markets.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </header>

      {filtered.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border rounded-2xl bg-bg-elevated">
          <p className="text-sm text-fg-muted max-w-md mx-auto">
            {comps.length === 0 ? (
              <>
                No comps banked yet. Click <span className="font-medium text-fg">Log comp</span>{' '}
                to capture one — or run <span className="font-mono text-xs">/lease-abstract-from-pdf</span>{' '}
                on a market report to extract several at once.
              </>
            ) : (
              <>No comps match the current filter.</>
            )}
          </p>
        </div>
      ) : (
        <div className="bg-bg-elevated rounded-2xl shadow-soft overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className={headerCellClass} onClick={() => toggleSort('signedDate')}>
                  Signed {sortKey === 'signedDate' && (sortDesc ? '↓' : '↑')}
                </th>
                <th className="py-2.5 px-3 text-xs font-medium uppercase tracking-wider text-fg-subtle">
                  Property / Tenant
                </th>
                <th className={headerCellClass} onClick={() => toggleSort('market')}>
                  Market {sortKey === 'market' && (sortDesc ? '↓' : '↑')}
                </th>
                <th className={`${headerCellClass} text-right`} onClick={() => toggleSort('leaseSF')}>
                  SF {sortKey === 'leaseSF' && (sortDesc ? '↓' : '↑')}
                </th>
                <th className={`${headerCellClass} text-right`} onClick={() => toggleSort('baseRentPSF')}>
                  Base $/SF {sortKey === 'baseRentPSF' && (sortDesc ? '↓' : '↑')}
                </th>
                <th className="py-2.5 px-3 text-xs font-medium uppercase tracking-wider text-fg-subtle text-right">
                  Esc %
                </th>
                <th className={`${headerCellClass} text-right`} onClick={() => toggleSort('termMonths')}>
                  Term {sortKey === 'termMonths' && (sortDesc ? '↓' : '↑')}
                </th>
                <th className={`${headerCellClass} text-right`} onClick={() => toggleSort('tiPSF')}>
                  TI $/SF {sortKey === 'tiPSF' && (sortDesc ? '↓' : '↑')}
                </th>
                <th className="py-2.5 px-3 text-xs font-medium uppercase tracking-wider text-fg-subtle">
                  Source
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setEditing(c)}
                  className="border-b border-border/60 hover:bg-bg-hover/60 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-3 tabular-nums text-fg-muted whitespace-nowrap">
                    {c.signedDate ?? '—'}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-medium text-fg flex items-center gap-1.5">
                      {c.propertyName ?? c.buildingAddress ?? '—'}
                      {c.confidential && (
                        <ShieldCheck size={12} strokeWidth={1.75} className="text-fg-subtle" />
                      )}
                    </div>
                    {c.tenantName && (
                      <div className="text-xs text-fg-muted mt-0.5">{c.tenantName}</div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-fg-muted">{c.market ?? '—'}</td>
                  <td className="py-3 px-3 tabular-nums text-right text-fg">
                    {fmtNumber(c.leaseSF)}
                  </td>
                  <td className="py-3 px-3 tabular-nums text-right text-fg">
                    {fmtCurrency(c.baseRentPSF)}
                  </td>
                  <td className="py-3 px-3 tabular-nums text-right text-fg-muted">
                    {fmtPct(c.escalationPct)}
                  </td>
                  <td className="py-3 px-3 tabular-nums text-right text-fg-muted">
                    {c.termMonths ? `${c.termMonths} mo` : '—'}
                  </td>
                  <td className="py-3 px-3 tabular-nums text-right text-fg-muted">
                    {fmtCurrency(c.tiPSF)}
                  </td>
                  <td className="py-3 px-3 text-fg-muted">
                    {c.source ? (
                      c.sourceUrl ? (
                        <a
                          href={c.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-accent hover:underline"
                        >
                          {c.source} <ExternalLink size={11} strokeWidth={1.75} />
                        </a>
                      ) : (
                        c.source
                      )
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <CompDrawer
          comp={editing}
          onClose={() => setEditing(null)}
          onSave={onSave}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}
