import type { Deal, RentRollRow } from '../types';

export function computeLeaseEnd(start: string | null, months: number | null): string | null {
  if (!start || !months || months <= 0) return null;
  const d = new Date(start);
  if (isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + months);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function computeExpiryBucket(leaseEnd: string | null): string | null {
  if (!leaseEnd) return null;
  const year = parseInt(leaseEnd.slice(0, 4), 10);
  if (!Number.isFinite(year)) return null;
  if (year >= 2032) return '2032+';
  return String(year);
}

// Build the Rent Roll row that should result from promoting this prospect.
// If `existing` is provided, keep its non-prospect metadata (market,
// propertyType, buildingType, tenantRating, commissions, etc.) and overwrite
// only the lease-economic fields.
export function previewPromote(
  deal: Deal,
  existing: RentRollRow | null
): RentRollRow {
  const sf = deal.maxSF ?? deal.minSF ?? existing?.leasableSF ?? null;
  const startingRent = deal.targetRent ?? existing?.startingAnnualRentPSF ?? null;
  const leaseEnd = computeLeaseEnd(deal.expectedStart, deal.proposedTermMonths);
  const annualRent =
    sf !== null && startingRent !== null
      ? Math.round(sf * startingRent)
      : existing?.annualRent ?? null;
  const expiryYearBucket =
    computeExpiryBucket(leaseEnd) ?? existing?.expiryYearBucket ?? null;

  return {
    id: existing?.id ?? crypto.randomUUID(),

    dealId: deal.dealId ?? existing?.dealId ?? null,
    dealName: deal.dealName ?? existing?.dealName ?? null,
    buildingId: existing?.buildingId ?? null,
    spaceId: deal.spaceId ?? existing?.spaceId ?? null,
    building: deal.building ?? existing?.building ?? null,

    market: existing?.market ?? null,
    propertyType: existing?.propertyType ?? null,
    buildingType: existing?.buildingType ?? null,

    tenantName: deal.prospectTenant ?? existing?.tenantName ?? null,
    tenantRating: existing?.tenantRating ?? null,
    occupied: true,
    uwBasis: 'Actual',

    leasableSF: sf,

    leaseStart: deal.expectedStart ?? existing?.leaseStart ?? null,
    leaseTermMonths: deal.proposedTermMonths ?? existing?.leaseTermMonths ?? null,
    leaseEnd: leaseEnd ?? existing?.leaseEnd ?? null,
    freeRentMonths: deal.freeRentMonths ?? existing?.freeRentMonths ?? null,
    annualRentBumpsPct: existing?.annualRentBumpsPct ?? null,
    expiryYearBucket,

    tiPerSF: deal.tiPerSF ?? existing?.tiPerSF ?? null,
    tiNote: deal.tiNote ?? existing?.tiNote ?? null,
    specOffice: existing?.specOffice ?? null,
    commissionStructurePct: existing?.commissionStructurePct ?? null,
    commissionDollar: existing?.commissionDollar ?? null,

    lastRevalUWRent: deal.lastRevalUWRent ?? existing?.lastRevalUWRent ?? null,
    startingAnnualRentPSF: startingRent,
    inPlaceRent: existing?.inPlaceRent ?? null,
    annualRent,

    notes: deal.notes ?? existing?.notes ?? null,
  };
}
