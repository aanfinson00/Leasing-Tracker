// ───────────────────────────────────────────────────────────────────
// Mapping between the app's camelCase shape (defined in src/types.ts)
// and the snake_case Postgres row shape. Pure functions, no Supabase
// imports — used by both the runtime repo modules and the seed script.
// ───────────────────────────────────────────────────────────────────

import type {
  ActivityEntry,
  Deal,
  OnboardingChecklist,
  RentRollRow,
} from '../../types';

// ── Deal ───────────────────────────────────────────────────────────

export interface DealRow {
  id: string;
  deal_name: string;
  space_id: string | null;
  building: string | null;
  deal_id: string | null;
  min_sf: number | null;
  max_sf: number | null;
  prospect_tenant: string | null;
  broker_rep: string | null;
  transaction: string | null;
  status: Deal['status'];
  last_reval_uw_rent: number | null;
  target_rent: number | null;
  proposed_term_months: number | null;
  free_rent_months: number | null;
  ti_per_sf: number | null;
  ti_note: string | null;
  probability_pct: number | null;
  expected_start: string | null;
  last_updated: string | null;
  priority: Deal['priority'];
  current_summary: string | null;
  notes: string | null;
}

export const dealToRow = (d: Deal): DealRow => ({
  id: d.id,
  deal_name: d.dealName,
  space_id: d.spaceId ?? null,
  building: d.building ?? null,
  deal_id: d.dealId ?? null,
  min_sf: d.minSF ?? null,
  max_sf: d.maxSF ?? null,
  prospect_tenant: d.prospectTenant ?? null,
  broker_rep: d.brokerRep ?? null,
  transaction: d.transaction ?? null,
  status: d.status,
  last_reval_uw_rent: d.lastRevalUWRent ?? null,
  target_rent: d.targetRent ?? null,
  proposed_term_months: d.proposedTermMonths ?? null,
  free_rent_months: d.freeRentMonths ?? null,
  ti_per_sf: d.tiPerSF ?? null,
  ti_note: d.tiNote ?? null,
  probability_pct: d.probabilityPct ?? null,
  expected_start: d.expectedStart ?? null,
  last_updated: d.lastUpdated ?? null,
  priority: d.priority,
  current_summary: d.currentSummary ?? null,
  notes: d.notes ?? null,
});

export const rowToDeal = (r: DealRow): Deal => ({
  id: r.id,
  dealName: r.deal_name,
  spaceId: r.space_id,
  building: r.building,
  dealId: r.deal_id,
  minSF: r.min_sf,
  maxSF: r.max_sf,
  prospectTenant: r.prospect_tenant,
  brokerRep: r.broker_rep,
  transaction: r.transaction,
  status: r.status,
  lastRevalUWRent: r.last_reval_uw_rent,
  targetRent: r.target_rent,
  proposedTermMonths: r.proposed_term_months,
  freeRentMonths: r.free_rent_months,
  tiPerSF: r.ti_per_sf,
  tiNote: r.ti_note,
  probabilityPct: r.probability_pct,
  expectedStart: r.expected_start,
  lastUpdated: r.last_updated,
  priority: r.priority,
  currentSummary: r.current_summary,
  notes: r.notes,
});

// ── RentRollRow ────────────────────────────────────────────────────

export interface RentRollDbRow {
  id: string;
  deal_id: string | null;
  deal_name: string | null;
  building_id: string | null;
  space_id: string | null;
  building: string | null;
  market: string | null;
  property_type: string | null;
  building_type: string | null;
  tenant_name: string | null;
  tenant_rating: number | null;
  occupied: boolean;
  uw_basis: RentRollRow['uwBasis'];
  leasable_sf: number | null;
  lease_start: string | null;
  lease_term_months: number | null;
  lease_end: string | null;
  free_rent_months: number | null;
  annual_rent_bumps_pct: number | null;
  ti_per_sf: number | null;
  ti_note: string | null;
  uw_ti_per_sf: number | null;
  spec_office: boolean;
  spec_ti_per_sf: number | null;
  commission_structure_pct: number | null;
  commission_dollar: number | null;
  last_reval_uw_rent: number | null;
  starting_annual_rent_psf: number | null;
  in_place_rent: number | null;
  current_summary: string | null;
  notes: string | null;
}

export const rentRollToRow = (r: RentRollRow): RentRollDbRow => ({
  id: r.id,
  deal_id: r.dealId ?? null,
  deal_name: r.dealName ?? null,
  building_id: r.buildingId ?? null,
  space_id: r.spaceId ?? null,
  building: r.building ?? null,
  market: r.market ?? null,
  property_type: r.propertyType ?? null,
  building_type: r.buildingType ?? null,
  tenant_name: r.tenantName ?? null,
  tenant_rating: r.tenantRating ?? null,
  occupied: r.occupied,
  uw_basis: r.uwBasis ?? null,
  leasable_sf: r.leasableSF ?? null,
  lease_start: r.leaseStart ?? null,
  lease_term_months: r.leaseTermMonths ?? null,
  lease_end: r.leaseEnd ?? null,
  free_rent_months: r.freeRentMonths ?? null,
  annual_rent_bumps_pct: r.annualRentBumpsPct ?? null,
  ti_per_sf: r.tiPerSF ?? null,
  ti_note: r.tiNote ?? null,
  uw_ti_per_sf: r.uwTiPerSF ?? null,
  spec_office: r.specOffice,
  spec_ti_per_sf: r.specTIPerSF ?? null,
  commission_structure_pct: r.commissionStructurePct ?? null,
  commission_dollar: r.commissionDollar ?? null,
  last_reval_uw_rent: r.lastRevalUWRent ?? null,
  starting_annual_rent_psf: r.startingAnnualRentPSF ?? null,
  in_place_rent: r.inPlaceRent ?? null,
  current_summary: r.currentSummary ?? null,
  notes: r.notes ?? null,
});

export const rowToRentRoll = (r: RentRollDbRow): RentRollRow => ({
  id: r.id,
  dealId: r.deal_id,
  dealName: r.deal_name,
  buildingId: r.building_id,
  spaceId: r.space_id,
  building: r.building,
  market: r.market,
  propertyType: r.property_type,
  buildingType: r.building_type,
  tenantName: r.tenant_name,
  tenantRating: r.tenant_rating,
  occupied: r.occupied,
  uwBasis: r.uw_basis,
  leasableSF: r.leasable_sf,
  leaseStart: r.lease_start,
  leaseTermMonths: r.lease_term_months,
  leaseEnd: r.lease_end,
  freeRentMonths: r.free_rent_months,
  annualRentBumpsPct: r.annual_rent_bumps_pct,
  tiPerSF: r.ti_per_sf,
  tiNote: r.ti_note,
  uwTiPerSF: r.uw_ti_per_sf,
  specOffice: r.spec_office,
  specTIPerSF: r.spec_ti_per_sf,
  commissionStructurePct: r.commission_structure_pct,
  commissionDollar: r.commission_dollar,
  lastRevalUWRent: r.last_reval_uw_rent,
  startingAnnualRentPSF: r.starting_annual_rent_psf,
  inPlaceRent: r.in_place_rent,
  currentSummary: r.current_summary,
  notes: r.notes,
});

// ── ActivityEntry ──────────────────────────────────────────────────
// `createdAt` is now sourced from Postgres `created_at` (timestamptz)
// on read; on write we let the server default fill it. The app's
// `createdAt` field rides through as ISO string.

export interface ActivityRow {
  id: string;
  parent_type: ActivityEntry['parentType'];
  parent_id: string;
  date: string;
  type: ActivityEntry['type'];
  summary: string;
  link: string | null;
  author: string | null;
  created_at: string;
}

export const activityToRow = (a: ActivityEntry): Omit<ActivityRow, 'created_at'> & { created_at?: string } => ({
  id: a.id,
  parent_type: a.parentType,
  parent_id: a.parentId,
  date: a.date,
  type: a.type,
  summary: a.summary,
  link: a.link ?? null,
  author: a.author ?? null,
  // Pass through the client-generated timestamp; DB default is the fallback.
  created_at: a.createdAt,
});

export const rowToActivity = (r: ActivityRow): ActivityEntry => ({
  id: r.id,
  parentType: r.parent_type,
  parentId: r.parent_id,
  date: r.date,
  type: r.type,
  summary: r.summary,
  link: r.link,
  author: r.author,
  createdAt: r.created_at,
});

// ── OnboardingChecklist ────────────────────────────────────────────
// `items` is stored as jsonb; we pass it through unchanged in both
// directions. The app's zod schema validates shape on load.

export interface OnboardingRow {
  id: string;
  rent_roll_id: string;
  template_version: number;
  items: OnboardingChecklist['items'];
  created_at: string;
}

export const onboardingToRow = (
  o: OnboardingChecklist
): Omit<OnboardingRow, 'created_at'> & { created_at?: string } => ({
  id: o.id,
  rent_roll_id: o.rentRollId,
  template_version: o.templateVersion,
  items: o.items,
  created_at: o.createdAt,
});

export const rowToOnboarding = (r: OnboardingRow): OnboardingChecklist => ({
  id: r.id,
  rentRollId: r.rent_roll_id,
  createdAt: r.created_at,
  templateVersion: r.template_version,
  items: r.items,
});
