import { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import type { Building, Deal, RentRollRow } from '../types';
import {
  type ReportFilters,
  applyFilters,
  emptyFilters,
  toggleInSet,
} from '../lib/reportFilters';
import { ReportsFilterBar } from './ReportsFilterBar';
import { LeaseRolloverChart } from './charts/LeaseRolloverChart';
import { OccupancyByDealChart } from './charts/OccupancyByDealChart';
import { MarketBreakdownChart } from './charts/MarketBreakdownChart';
import { UWvsActualRentChart } from './charts/UWvsActualRentChart';
import { UWvsActualTIChart } from './charts/UWvsActualTIChart';
import { PipelineForecastChart } from './charts/PipelineForecastChart';
import { DataIntegrityAudits } from './DataIntegrityAudits';

interface ReportsViewProps {
  deals: Deal[];
  rentRoll: RentRollRow[];
  buildings: Building[];
}

export function ReportsView({ deals, rentRoll, buildings }: ReportsViewProps) {
  const [filters, setFilters] = useState<ReportFilters>(emptyFilters);

  const filtered = useMemo(() => applyFilters(rentRoll, filters), [rentRoll, filters]);

  const onMarketClick = (market: string) =>
    setFilters((f) => ({ ...f, markets: toggleInSet(f.markets, market) }));
  const onDealClick = (deal: string) =>
    setFilters((f) => ({ ...f, deals: toggleInSet(f.deals, deal) }));
  const onYearBucketClick = (bucket: string) =>
    setFilters((f) => ({ ...f, yearBuckets: toggleInSet(f.yearBuckets, bucket) }));

  if (rentRoll.length === 0 && deals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 px-6">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-tint text-accent mb-6">
          <BarChart3 size={24} strokeWidth={1.5} />
        </div>
        <h2 className="text-2xl sm:text-3xl text-fg font-semibold tracking-[-0.02em]">
          Reports come alive with data
        </h2>
        <p className="text-base text-fg-muted mt-3 max-w-md leading-relaxed">
          Open a workbook with Rent Roll and Prospects sheets to populate charts for rollover,
          occupancy, market breakdown, UW comparisons, and pipeline forecast.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ReportsFilterBar rows={rentRoll} filters={filters} onChange={setFilters} />

      <div className="text-xs text-fg-muted tabular-nums">
        Showing{' '}
        <span className="font-medium text-fg">{filtered.length}</span> of{' '}
        <span className="font-medium text-fg">{rentRoll.length}</span> rent roll rows
        {deals.length > 0 && (
          <>
            {' · '}
            <span className="font-medium text-fg">{deals.length}</span> prospects
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LeaseRolloverChart rows={filtered} onYearBucketClick={onYearBucketClick} />
        <MarketBreakdownChart rows={filtered} onMarketClick={onMarketClick} />
      </div>

      <OccupancyByDealChart rows={filtered} onDealClick={onDealClick} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UWvsActualRentChart rows={filtered} />
        <UWvsActualTIChart rows={filtered} />
      </div>

      <PipelineForecastChart deals={deals} />

      <DataIntegrityAudits rentRoll={rentRoll} buildings={buildings} />
    </div>
  );
}
