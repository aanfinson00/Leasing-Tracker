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

// Bucketed expiry used by the rollover chart and the report filters. Same
// year math as computeExpiryBucket but with 'Past' and 'Unknown' fallbacks
// so every row lands somewhere.
export function reportExpiryBucket(leaseEnd: string | null): string {
  if (!leaseEnd) return 'Unknown';
  const year = parseInt(leaseEnd.slice(0, 4), 10);
  if (!Number.isFinite(year)) return 'Unknown';
  const todayYear = new Date().getFullYear();
  if (year < todayYear) return 'Past';
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

  return {
    id: existing?.id ?? crypto.randomUUID(),

    dealId: deal.dealId ?? existing?.dealId ?? null,
    dealName: deal.dealName ?? existing?.dealName ?? null,
    buildingId: existing?.buildingId ?? null,
    spaceId: deal.spaceId ?? existing?.spaceId ?? null,
    building: deal.building ?? existing?.building ?? null,
    // Carry through new uuid FKs — deal's projectUuid takes precedence on promote.
    projectUuid: deal.projectUuid ?? existing?.projectUuid ?? null,
    spaceUuid: existing?.spaceUuid ?? null,

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

    tiPerSF: deal.tiPerSF ?? existing?.tiPerSF ?? null,
    tiNote: deal.tiNote ?? existing?.tiNote ?? null,
    uwTiPerSF: existing?.uwTiPerSF ?? null,
    specOffice: existing?.specOffice ?? false,
    specTIPerSF: existing?.specTIPerSF ?? null,
    commissionStructurePct: existing?.commissionStructurePct ?? null,
    commissionDollar: existing?.commissionDollar ?? null,

    lastRevalUWRent: deal.lastRevalUWRent ?? existing?.lastRevalUWRent ?? null,
    startingAnnualRentPSF: startingRent,
    inPlaceRent: existing?.inPlaceRent ?? null,

    currentSummary: deal.currentSummary ?? existing?.currentSummary ?? null,
    notes: deal.notes ?? existing?.notes ?? null,

    // Carry the deal's SharePoint URL forward to the tenant if the rent_roll
    // row doesn't already have one; preserve any existing value otherwise.
    sharepointUrl: existing?.sharepointUrl ?? deal.sharepointUrl ?? null,

    // Finalize-at-promote fields — user fills these in inside PromoteDrawer
    // before confirming. Default null; preserve any existing values.
    securityDeposit: existing?.securityDeposit ?? null,
    rentCommencementDate: existing?.rentCommencementDate ?? deal.expectedStart ?? null,
    cashflowJson: existing?.cashflowJson ?? null,
    updatedAt: existing?.updatedAt ?? null,
    // Free-form escape hatch — carry through existing.
    metadata: existing?.metadata ?? {},
  };
}
