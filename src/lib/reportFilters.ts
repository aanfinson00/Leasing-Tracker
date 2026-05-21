import type { RentRollRow } from '../types';
import { reportExpiryBucket } from './promote';

export interface ReportFilters {
  query: string;
  deals: Set<string>;
  markets: Set<string>;
  propertyTypes: Set<string>;
  buildingTypes: Set<string>;
  yearBuckets: Set<string>;
  occupancy: 'all' | 'occupied' | 'vacant';
}

export const emptyFilters = (): ReportFilters => ({
  query: '',
  deals: new Set(),
  markets: new Set(),
  propertyTypes: new Set(),
  buildingTypes: new Set(),
  yearBuckets: new Set(),
  occupancy: 'all',
});

export function applyFilters(rows: RentRollRow[], f: ReportFilters): RentRollRow[] {
  const q = f.query.trim().toLowerCase();
  return rows.filter((r) => {
    if (
      q !== '' &&
      !(
        (r.dealName ?? '').toLowerCase().includes(q) ||
        (r.tenantName ?? '').toLowerCase().includes(q) ||
        (r.spaceId ?? '').toLowerCase().includes(q) ||
        (r.market ?? '').toLowerCase().includes(q)
      )
    ) {
      return false;
    }
    if (f.deals.size > 0 && (!r.dealName || !f.deals.has(r.dealName))) return false;
    if (f.markets.size > 0 && (!r.market || !f.markets.has(r.market))) return false;
    if (f.propertyTypes.size > 0 && (!r.propertyType || !f.propertyTypes.has(r.propertyType))) return false;
    if (f.buildingTypes.size > 0 && (!r.buildingType || !f.buildingTypes.has(r.buildingType))) return false;
    if (f.yearBuckets.size > 0 && !f.yearBuckets.has(reportExpiryBucket(r.leaseEnd))) return false;
    if (f.occupancy === 'occupied' && !r.occupied) return false;
    if (f.occupancy === 'vacant' && r.occupied) return false;
    return true;
  });
}

export function hasActiveFilters(f: ReportFilters): boolean {
  return (
    f.query !== '' ||
    f.deals.size > 0 ||
    f.markets.size > 0 ||
    f.propertyTypes.size > 0 ||
    f.buildingTypes.size > 0 ||
    f.yearBuckets.size > 0 ||
    f.occupancy !== 'all'
  );
}

export function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}
