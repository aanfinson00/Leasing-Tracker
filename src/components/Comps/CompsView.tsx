import { useMemo, useState } from 'react';
import { Plus, Database, Search, ShieldCheck, ExternalLink, Landmark } from 'lucide-react';
import type { LeaseComp, SalesComp } from '../../types';
import { CompDrawer } from './CompDrawer';
import { SaleCompDrawer } from './SaleCompDrawer';
import { ExcelToolbar } from '../ExcelToolbar';

type CompTab = 'lease' | 'sales';

interface CompsViewProps {
  comps: LeaseComp[];
  onSave: (c: LeaseComp) => void;
  onDelete: (id: string) => void;
  salesComps: SalesComp[];
  onSaveSalesComp: (c: SalesComp) => void;
  onDeleteSalesComp: (id: string) => void;
  onExcelExport?: () => void;
  onExcelImport?: (file: File) => void;
}

type LeaseSortKey =
  | 'signedDate'
  | 'market'
  | 'baseRentPSF'
  | 'leaseSF'
  | 'tiPSF'
  | 'termMonths';

type SalesSortKey =
  | 'saleDate'
  | 'market'
  | 'salePrice'
  | 'pricePSF'
  | 'capRate'
  | 'buildingSF';

function newLeaseCompTemplate(): LeaseComp {
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

function newSalesCompTemplate(): SalesComp {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    propertyName: null,
    buildingAddress: null,
    market: null,
    propertyType: null,
    buildingType: null,
    saleDate: now.slice(0, 10),
    salePrice: null,
    pricePSF: null,
    capRate: null,
    noi: null,
    buildingSF: null,
    landAcres: null,
    yearBuilt: null,
    occupancyPct: null,
    buyer: null,
    seller: null,
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

export function CompsView({
  comps,
  onSave,
  onDelete,
  salesComps,
  onSaveSalesComp,
  onDeleteSalesComp,
  onExcelExport,
  onExcelImport,
}: CompsViewProps) {
  const [tab, setTab] = useState<CompTab>('lease');
  const [editingLease, setEditingLease] = useState<LeaseComp | null>(null);
  const [editingSale, setEditingSale] = useState<SalesComp | null>(null);
  const [search, setSearch] = useState('');
  const [marketFilter, setMarketFilter] = useState<string>('all');

  // Lease sort state
  const [leaseSortKey, setLeaseSortKey] = useState<LeaseSortKey>('signedDate');
  const [leaseSortDesc, setLeaseSortDesc] = useState(true);

  // Sales sort state
  const [salesSortKey, setSalesSortKey] = useState<SalesSortKey>('saleDate');
  const [salesSortDesc, setSalesSortDesc] = useState(true);

  const markets = useMemo(() => {
    const set = new Set<string>();
    comps.forEach((c) => c.market && set.add(c.market));
    salesComps.forEach((c) => c.market && set.add(c.market));
    return Array.from(set).sort();
  }, [comps, salesComps]);

  // ── Lease filtering / sorting ──

  const filteredLeases = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = comps;
    if (q) {
      list = list.filter((c) =>
        [c.propertyName, c.tenantName, c.buildingAddress, c.market, c.source, c.notes]
          .filter(Boolean)
          .some((s) => s!.toLowerCase().includes(q))
      );
    }
    if (marketFilter !== 'all') {
      list = list.filter((c) => c.market === marketFilter);
    }
    const sorted = [...list].sort((a, b) => {
      const av = a[leaseSortKey];
      const bv = b[leaseSortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number')
        return leaseSortDesc ? bv - av : av - bv;
      const cmp = String(av).localeCompare(String(bv));
      return leaseSortDesc ? -cmp : cmp;
    });
    return sorted;
  }, [comps, search, marketFilter, leaseSortKey, leaseSortDesc]);

  const leaseAggregates = useMemo(() => {
    const withRent = filteredLeases.filter((c) => c.baseRentPSF != null);
    const withTi = filteredLeases.filter((c) => c.tiPSF != null);
    const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
    const median = (xs: number[]) => {
      if (xs.length === 0) return null;
      const s = [...xs].sort((a, b) => a - b);
      const mid = Math.floor(s.length / 2);
      return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
    };
    return {
      count: filteredLeases.length,
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
  }, [filteredLeases]);

  // ── Sales filtering / sorting ──

  const filteredSales = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = salesComps;
    if (q) {
      list = list.filter((c) =>
        [c.propertyName, c.buildingAddress, c.market, c.buyer, c.seller, c.source, c.notes]
          .filter(Boolean)
          .some((s) => s!.toLowerCase().includes(q))
      );
    }
    if (marketFilter !== 'all') {
      list = list.filter((c) => c.market === marketFilter);
    }
    const sorted = [...list].sort((a, b) => {
      const av = a[salesSortKey];
      const bv = b[salesSortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number')
        return salesSortDesc ? bv - av : av - bv;
      const cmp = String(av).localeCompare(String(bv));
      return salesSortDesc ? -cmp : cmp;
    });
    return sorted;
  }, [salesComps, search, marketFilter, salesSortKey, salesSortDesc]);

  const salesAggregates = useMemo(() => {
    const withPrice = filteredSales.filter((c) => c.pricePSF != null);
    const withCap = filteredSales.filter((c) => c.capRate != null);
    const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
    const median = (xs: number[]) => {
      if (xs.length === 0) return null;
      const s = [...xs].sort((a, b) => a - b);
      const mid = Math.floor(s.length / 2);
      return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
    };
    return {
      count: filteredSales.length,
      avgPricePSF:
        withPrice.length === 0
          ? null
          : sum(withPrice.map((c) => c.pricePSF!)) / withPrice.length,
      medianPricePSF: median(withPrice.map((c) => c.pricePSF!)),
      avgCapRate:
        withCap.length === 0
          ? null
          : sum(withCap.map((c) => c.capRate!)) / withCap.length,
    };
  }, [filteredSales]);

  const toggleLeaseSort = (k: LeaseSortKey) => {
    if (leaseSortKey === k) setLeaseSortDesc(!leaseSortDesc);
    else {
      setLeaseSortKey(k);
      setLeaseSortDesc(true);
    }
  };

  const toggleSalesSort = (k: SalesSortKey) => {
    if (salesSortKey === k) setSalesSortDesc(!salesSortDesc);
    else {
      setSalesSortKey(k);
      setSalesSortDesc(true);
    }
  };

  const headerCellClass =
    'py-2.5 px-3 text-xs font-medium uppercase tracking-wider text-fg-subtle cursor-pointer select-none';

  const activeCount = tab === 'lease' ? leaseAggregates.count : salesAggregates.count;
  const totalLeases = comps.length;
  const totalSales = salesComps.length;

  return (
    <div className="flex flex-col gap-5 max-w-[1400px] mx-auto w-full">
      <header className="rounded-2xl bg-bg-elevated shadow-soft p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-accent-tint text-accent">
              {tab === 'lease' ? (
                <Database size={18} strokeWidth={1.75} />
              ) : (
                <Landmark size={18} strokeWidth={1.75} />
              )}
            </div>
            <div>
              <h2 className="text-base font-semibold text-fg tracking-tight">
                Comps Library
              </h2>
              <p className="text-xs text-fg-muted mt-0.5">
                {tab === 'lease' ? (
                  <>
                    {leaseAggregates.count} {leaseAggregates.count === 1 ? 'lease comp' : 'lease comps'} ·
                    avg base rent {fmtCurrency(leaseAggregates.avgRent)}/SF · median{' '}
                    {fmtCurrency(leaseAggregates.medianRent)}/SF · avg TI{' '}
                    {fmtCurrency(leaseAggregates.avgTi)}/SF
                  </>
                ) : (
                  <>
                    {salesAggregates.count} {salesAggregates.count === 1 ? 'sale comp' : 'sale comps'} ·
                    avg {fmtCurrency(salesAggregates.avgPricePSF)}/SF · median{' '}
                    {fmtCurrency(salesAggregates.medianPricePSF)}/SF · avg cap{' '}
                    {fmtPct(salesAggregates.avgCapRate)}
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onExcelExport && onExcelImport && (
              <ExcelToolbar onExport={onExcelExport} onImport={onExcelImport} itemCount={activeCount} />
            )}
            <button
              type="button"
              onClick={() =>
                tab === 'lease'
                  ? setEditingLease(newLeaseCompTemplate())
                  : setEditingSale(newSalesCompTemplate())
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-accent-fg bg-accent rounded-xl hover:bg-accent-hover transition-colors shadow-soft"
            >
              <Plus size={15} strokeWidth={2} />
              {tab === 'lease' ? 'Log lease comp' : 'Log sale comp'}
            </button>
          </div>
        </div>

        {/* Tab toggle */}
        <div className="mt-5 flex items-center gap-1 p-1 bg-bg rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setTab('lease')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              tab === 'lease'
                ? 'bg-bg-elevated text-fg shadow-soft'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            Lease Comps
            {totalLeases > 0 && (
              <span className="ml-1.5 text-xs text-fg-subtle">({totalLeases})</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab('sales')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              tab === 'sales'
                ? 'bg-bg-elevated text-fg shadow-soft'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            Sales Comps
            {totalSales > 0 && (
              <span className="ml-1.5 text-xs text-fg-subtle">({totalSales})</span>
            )}
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 flex-wrap">
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
              placeholder={
                tab === 'lease'
                  ? 'Search tenant, address, source, notes…'
                  : 'Search property, buyer, seller, source…'
              }
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

      {/* ── Lease Comps Table ── */}
      {tab === 'lease' && (
        <>
          {filteredLeases.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-border rounded-2xl bg-bg-elevated">
              <p className="text-sm text-fg-muted max-w-md mx-auto">
                {comps.length === 0 ? (
                  <>
                    No lease comps banked yet. Click{' '}
                    <span className="font-medium text-fg">Log lease comp</span> to capture
                    one — or run{' '}
                    <span className="font-mono text-xs">/lease-abstract-from-pdf</span> on a
                    market report to extract several at once.
                  </>
                ) : (
                  <>No lease comps match the current filter.</>
                )}
              </p>
            </div>
          ) : (
            <div className="bg-bg-elevated rounded-2xl shadow-soft overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className={headerCellClass} onClick={() => toggleLeaseSort('signedDate')}>
                      Signed {leaseSortKey === 'signedDate' && (leaseSortDesc ? '↓' : '↑')}
                    </th>
                    <th className="py-2.5 px-3 text-xs font-medium uppercase tracking-wider text-fg-subtle">
                      Property / Tenant
                    </th>
                    <th className={headerCellClass} onClick={() => toggleLeaseSort('market')}>
                      Market {leaseSortKey === 'market' && (leaseSortDesc ? '↓' : '↑')}
                    </th>
                    <th className={`${headerCellClass} text-right`} onClick={() => toggleLeaseSort('leaseSF')}>
                      SF {leaseSortKey === 'leaseSF' && (leaseSortDesc ? '↓' : '↑')}
                    </th>
                    <th className={`${headerCellClass} text-right`} onClick={() => toggleLeaseSort('baseRentPSF')}>
                      Base $/SF {leaseSortKey === 'baseRentPSF' && (leaseSortDesc ? '↓' : '↑')}
                    </th>
                    <th className="py-2.5 px-3 text-xs font-medium uppercase tracking-wider text-fg-subtle text-right">
                      Esc %
                    </th>
                    <th className={`${headerCellClass} text-right`} onClick={() => toggleLeaseSort('termMonths')}>
                      Term {leaseSortKey === 'termMonths' && (leaseSortDesc ? '↓' : '↑')}
                    </th>
                    <th className={`${headerCellClass} text-right`} onClick={() => toggleLeaseSort('tiPSF')}>
                      TI $/SF {leaseSortKey === 'tiPSF' && (leaseSortDesc ? '↓' : '↑')}
                    </th>
                    <th className="py-2.5 px-3 text-xs font-medium uppercase tracking-wider text-fg-subtle">
                      Source
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeases.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setEditingLease(c)}
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
        </>
      )}

      {/* ── Sales Comps Table ── */}
      {tab === 'sales' && (
        <>
          {filteredSales.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-border rounded-2xl bg-bg-elevated">
              <p className="text-sm text-fg-muted max-w-md mx-auto">
                {salesComps.length === 0 ? (
                  <>
                    No sales comps banked yet. Click{' '}
                    <span className="font-medium text-fg">Log sale comp</span> to capture one.
                  </>
                ) : (
                  <>No sales comps match the current filter.</>
                )}
              </p>
            </div>
          ) : (
            <div className="bg-bg-elevated rounded-2xl shadow-soft overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className={headerCellClass} onClick={() => toggleSalesSort('saleDate')}>
                      Sale Date {salesSortKey === 'saleDate' && (salesSortDesc ? '↓' : '↑')}
                    </th>
                    <th className="py-2.5 px-3 text-xs font-medium uppercase tracking-wider text-fg-subtle">
                      Property
                    </th>
                    <th className={headerCellClass} onClick={() => toggleSalesSort('market')}>
                      Market {salesSortKey === 'market' && (salesSortDesc ? '↓' : '↑')}
                    </th>
                    <th className={`${headerCellClass} text-right`} onClick={() => toggleSalesSort('buildingSF')}>
                      SF {salesSortKey === 'buildingSF' && (salesSortDesc ? '↓' : '↑')}
                    </th>
                    <th className={`${headerCellClass} text-right`} onClick={() => toggleSalesSort('salePrice')}>
                      Sale Price {salesSortKey === 'salePrice' && (salesSortDesc ? '↓' : '↑')}
                    </th>
                    <th className={`${headerCellClass} text-right`} onClick={() => toggleSalesSort('pricePSF')}>
                      $/SF {salesSortKey === 'pricePSF' && (salesSortDesc ? '↓' : '↑')}
                    </th>
                    <th className={`${headerCellClass} text-right`} onClick={() => toggleSalesSort('capRate')}>
                      Cap Rate {salesSortKey === 'capRate' && (salesSortDesc ? '↓' : '↑')}
                    </th>
                    <th className="py-2.5 px-3 text-xs font-medium uppercase tracking-wider text-fg-subtle">
                      Buyer / Seller
                    </th>
                    <th className="py-2.5 px-3 text-xs font-medium uppercase tracking-wider text-fg-subtle">
                      Source
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setEditingSale(c)}
                      className="border-b border-border/60 hover:bg-bg-hover/60 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-3 tabular-nums text-fg-muted whitespace-nowrap">
                        {c.saleDate ?? '—'}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-fg flex items-center gap-1.5">
                          {c.propertyName ?? c.buildingAddress ?? '—'}
                          {c.confidential && (
                            <ShieldCheck size={12} strokeWidth={1.75} className="text-fg-subtle" />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-fg-muted">{c.market ?? '—'}</td>
                      <td className="py-3 px-3 tabular-nums text-right text-fg">
                        {fmtNumber(c.buildingSF)}
                      </td>
                      <td className="py-3 px-3 tabular-nums text-right text-fg">
                        {c.salePrice != null
                          ? `$${fmtNumber(c.salePrice)}`
                          : '—'}
                      </td>
                      <td className="py-3 px-3 tabular-nums text-right text-fg">
                        {fmtCurrency(c.pricePSF)}
                      </td>
                      <td className="py-3 px-3 tabular-nums text-right text-fg-muted">
                        {fmtPct(c.capRate)}
                      </td>
                      <td className="py-3 px-3 text-fg-muted">
                        <div className="text-xs">
                          {c.buyer && <span>B: {c.buyer}</span>}
                          {c.buyer && c.seller && <span className="mx-1">·</span>}
                          {c.seller && <span>S: {c.seller}</span>}
                          {!c.buyer && !c.seller && '—'}
                        </div>
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
        </>
      )}

      {editingLease && (
        <CompDrawer
          comp={editingLease}
          onClose={() => setEditingLease(null)}
          onSave={onSave}
          onDelete={onDelete}
        />
      )}

      {editingSale && (
        <SaleCompDrawer
          comp={editingSale}
          onClose={() => setEditingSale(null)}
          onSave={onSaveSalesComp}
          onDelete={onDeleteSalesComp}
        />
      )}
    </div>
  );
}
