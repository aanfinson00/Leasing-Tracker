// ───────────────────────────────────────────────────────────────────
// Mapping between the app's camelCase shape (defined in src/types.ts)
// and the snake_case Postgres row shape. Pure functions, no Supabase
// imports — used by both the runtime repo modules and the seed script.
// ───────────────────────────────────────────────────────────────────

import type {
  ActivityEntry,
  AMPendingItem,
  Building,
  Deal,
  DevelopmentProject,
  LeaseComp,
  OnboardingChecklist,
  PropertyTaxAppeal,
  PropertyTaxAppealStatus,
  RentRollRow,
  Scenario,
} from '../../types';
import type { Globals, ScenarioInputs, ScenarioResults } from '../lease-math/types';
import type { Polygon } from 'geojson';

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
  lat: number | null;
  lng: number | null;
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
  lat: d.lat ?? null,
  lng: d.lng ?? null,
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
  lat: r.lat,
  lng: r.lng,
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

// ── Scenario ───────────────────────────────────────────────────────
// inputs/globals/results travel as jsonb. The calc engine owns the
// shape — see src/lib/lease-math/types.ts. We type the row's blobs
// loosely (the app casts at the boundary) and trust the engine for
// shape validation.

export interface ScenarioRow {
  id: string;
  deal_id: string;
  name: string;
  inputs: ScenarioInputs;
  globals: Globals;
  results: ScenarioResults | null;
  created_at: string;
  updated_at: string;
}

export const scenarioToRow = (
  s: Scenario
): Omit<ScenarioRow, 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
} => ({
  id: s.id,
  deal_id: s.dealId,
  name: s.name,
  inputs: s.inputs as ScenarioInputs,
  globals: s.globals as Globals,
  results: (s.results ?? null) as ScenarioResults | null,
  created_at: s.createdAt,
  updated_at: s.updatedAt,
});

export const rowToScenario = (r: ScenarioRow): Scenario => ({
  id: r.id,
  dealId: r.deal_id,
  name: r.name,
  inputs: r.inputs,
  globals: r.globals,
  results: r.results,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

// ── Building ──────────────────────────────────────────────────────

export interface BuildingRow {
  id: string;
  project_id: string;
  name: string;
  footprint: Polygon;
  height_ft: number;
  color: string | null;
  bay_count: number;
  frontage_side: 'N' | 'S' | 'E' | 'W' | null;
  width_ft: number | null;
  depth_ft: number | null;
  rotation_deg: number;
  center_lat: number | null;
  center_lng: number | null;
  bump_outs: Building['bumpOuts'];
  bay_space_ids: Array<string | null>;
  building_ordinal: number | null;
  created_at: string;
  updated_at: string;
}

export const buildingToRow = (
  b: Building
): Omit<BuildingRow, 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
} => ({
  id: b.id,
  project_id: b.projectId,
  name: b.name,
  footprint: b.footprint as Polygon,
  height_ft: b.heightFt,
  color: b.color ?? null,
  bay_count: b.bayCount ?? 1,
  frontage_side: b.frontageSide ?? null,
  width_ft: b.widthFt ?? null,
  depth_ft: b.depthFt ?? null,
  rotation_deg: b.rotationDeg ?? 0,
  center_lat: b.centerLat ?? null,
  center_lng: b.centerLng ?? null,
  bump_outs: b.bumpOuts ?? [],
  bay_space_ids: b.baySpaceIds ?? [],
  building_ordinal: b.buildingOrdinal ?? null,
  created_at: b.createdAt,
  updated_at: b.updatedAt,
});

export const rowToBuilding = (r: BuildingRow): Building => ({
  id: r.id,
  projectId: r.project_id,
  name: r.name,
  footprint: r.footprint,
  heightFt: Number(r.height_ft),
  color: r.color,
  bayCount: r.bay_count ?? 1,
  frontageSide: r.frontage_side,
  widthFt: r.width_ft != null ? Number(r.width_ft) : null,
  depthFt: r.depth_ft != null ? Number(r.depth_ft) : null,
  rotationDeg: r.rotation_deg != null ? Number(r.rotation_deg) : 0,
  centerLat: r.center_lat != null ? Number(r.center_lat) : null,
  centerLng: r.center_lng != null ? Number(r.center_lng) : null,
  bumpOuts: r.bump_outs ?? [],
  baySpaceIds: r.bay_space_ids ?? [],
  buildingOrdinal: r.building_ordinal,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

// Shared helper used by all numeric-or-string DB columns. Postgres
// `numeric` columns come back as strings in supabase-js; coerce here.
const numOrNull = (v: number | string | null | undefined): number | null =>
  v == null ? null : Number(v);

// ── DevelopmentProject ────────────────────────────────────────────

export interface DevelopmentProjectRow {
  id: string;
  project_name: string;
  market: string | null;
  address: string | null;
  phase: DevelopmentProject['phase'];
  total_sf: number | string | null;
  acres: number | string | null;
  building_count: number | null;
  start_date: string | null;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  total_budget: number | string | null;
  spent_to_date: number | string | null;
  pm_name: string | null;
  gc_name: string | null;
  gc_contact: string | null;
  architect: string | null;
  risk_level: DevelopmentProject['riskLevel'];
  status_summary: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const developmentProjectToRow = (
  p: DevelopmentProject
): Omit<DevelopmentProjectRow, 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
} => ({
  id: p.id,
  project_name: p.projectName,
  market: p.market,
  address: p.address,
  phase: p.phase,
  total_sf: p.totalSF,
  acres: p.acres,
  building_count: p.buildingCount,
  start_date: p.startDate,
  expected_delivery_date: p.expectedDeliveryDate,
  actual_delivery_date: p.actualDeliveryDate,
  total_budget: p.totalBudget,
  spent_to_date: p.spentToDate,
  pm_name: p.pmName,
  gc_name: p.gcName,
  gc_contact: p.gcContact,
  architect: p.architect,
  risk_level: p.riskLevel,
  status_summary: p.statusSummary,
  notes: p.notes,
  created_at: p.createdAt,
  updated_at: p.updatedAt,
});

export const rowToDevelopmentProject = (
  r: DevelopmentProjectRow
): DevelopmentProject => ({
  id: r.id,
  projectName: r.project_name,
  market: r.market,
  address: r.address,
  phase: r.phase,
  totalSF: numOrNull(r.total_sf),
  acres: numOrNull(r.acres),
  buildingCount: r.building_count,
  startDate: r.start_date,
  expectedDeliveryDate: r.expected_delivery_date,
  actualDeliveryDate: r.actual_delivery_date,
  totalBudget: numOrNull(r.total_budget),
  spentToDate: numOrNull(r.spent_to_date),
  pmName: r.pm_name,
  gcName: r.gc_name,
  gcContact: r.gc_contact,
  architect: r.architect,
  riskLevel: r.risk_level,
  statusSummary: r.status_summary,
  notes: r.notes,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

// ── PropertyTaxAppeal ─────────────────────────────────────────────

export interface PropertyTaxAppealRow {
  id: string;
  building_id: string | null;
  building: string | null;
  parcel_number: string | null;
  jurisdiction: string | null;
  tax_year: number;
  assessed_value: number | string | null;
  proposed_value: number | string | null;
  market_value: number | string | null;
  status: PropertyTaxAppealStatus;
  filed_date: string | null;
  hearing_date: string | null;
  resolution_date: string | null;
  initial_assessed_value: number | string | null;
  final_assessed_value: number | string | null;
  estimated_savings: number | string | null;
  consultant_name: string | null;
  consultant_fee_pct: number | string | null;
  consultant_fee_dollar: number | string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const propertyTaxAppealToRow = (
  a: PropertyTaxAppeal
): Omit<PropertyTaxAppealRow, 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
} => ({
  id: a.id,
  building_id: a.buildingId,
  building: a.building,
  parcel_number: a.parcelNumber,
  jurisdiction: a.jurisdiction,
  tax_year: a.taxYear,
  assessed_value: a.assessedValue,
  proposed_value: a.proposedValue,
  market_value: a.marketValue,
  status: a.status,
  filed_date: a.filedDate,
  hearing_date: a.hearingDate,
  resolution_date: a.resolutionDate,
  initial_assessed_value: a.initialAssessedValue,
  final_assessed_value: a.finalAssessedValue,
  estimated_savings: a.estimatedSavings,
  consultant_name: a.consultantName,
  consultant_fee_pct: a.consultantFeePct,
  consultant_fee_dollar: a.consultantFeeDollar,
  notes: a.notes,
  created_at: a.createdAt,
  updated_at: a.updatedAt,
});

export const rowToPropertyTaxAppeal = (r: PropertyTaxAppealRow): PropertyTaxAppeal => ({
  id: r.id,
  buildingId: r.building_id,
  building: r.building,
  parcelNumber: r.parcel_number,
  jurisdiction: r.jurisdiction,
  taxYear: r.tax_year,
  assessedValue: numOrNull(r.assessed_value),
  proposedValue: numOrNull(r.proposed_value),
  marketValue: numOrNull(r.market_value),
  status: r.status,
  filedDate: r.filed_date,
  hearingDate: r.hearing_date,
  resolutionDate: r.resolution_date,
  initialAssessedValue: numOrNull(r.initial_assessed_value),
  finalAssessedValue: numOrNull(r.final_assessed_value),
  estimatedSavings: numOrNull(r.estimated_savings),
  consultantName: r.consultant_name,
  consultantFeePct: numOrNull(r.consultant_fee_pct),
  consultantFeeDollar: numOrNull(r.consultant_fee_dollar),
  notes: r.notes,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

// ── LeaseComp ─────────────────────────────────────────────────────

export interface LeaseCompRow {
  id: string;
  property_name: string | null;
  building_address: string | null;
  market: string | null;
  property_type: string | null;
  building_type: string | null;
  tenant_name: string | null;
  tenant_industry: string | null;
  transaction_type: LeaseComp['transactionType'];
  signed_date: string | null;
  delivery_date: string | null;
  lease_sf: number | string | null;
  building_sf: number | string | null;
  base_rent_psf: number | string | null;
  effective_rent_psf: number | string | null;
  rent_type: LeaseComp['rentType'];
  term_months: number | null;
  free_rent_months: number | string | null;
  ti_psf: number | string | null;
  escalation_pct: number | string | null;
  options: string | null;
  source: string | null;
  source_url: string | null;
  confidence: LeaseComp['confidence'];
  confidential: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const leaseCompToRow = (
  c: LeaseComp
): Omit<LeaseCompRow, 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
} => ({
  id: c.id,
  property_name: c.propertyName,
  building_address: c.buildingAddress,
  market: c.market,
  property_type: c.propertyType,
  building_type: c.buildingType,
  tenant_name: c.tenantName,
  tenant_industry: c.tenantIndustry,
  transaction_type: c.transactionType,
  signed_date: c.signedDate,
  delivery_date: c.deliveryDate,
  lease_sf: c.leaseSF,
  building_sf: c.buildingSF,
  base_rent_psf: c.baseRentPSF,
  effective_rent_psf: c.effectiveRentPSF,
  rent_type: c.rentType,
  term_months: c.termMonths,
  free_rent_months: c.freeRentMonths,
  ti_psf: c.tiPSF,
  escalation_pct: c.escalationPct,
  options: c.options,
  source: c.source,
  source_url: c.sourceUrl,
  confidence: c.confidence,
  confidential: c.confidential,
  notes: c.notes,
  created_at: c.createdAt,
  updated_at: c.updatedAt,
});

export const rowToLeaseComp = (r: LeaseCompRow): LeaseComp => ({
  id: r.id,
  propertyName: r.property_name,
  buildingAddress: r.building_address,
  market: r.market,
  propertyType: r.property_type,
  buildingType: r.building_type,
  tenantName: r.tenant_name,
  tenantIndustry: r.tenant_industry,
  transactionType: r.transaction_type,
  signedDate: r.signed_date,
  deliveryDate: r.delivery_date,
  leaseSF: numOrNull(r.lease_sf),
  buildingSF: numOrNull(r.building_sf),
  baseRentPSF: numOrNull(r.base_rent_psf),
  effectiveRentPSF: numOrNull(r.effective_rent_psf),
  rentType: r.rent_type,
  termMonths: r.term_months,
  freeRentMonths: numOrNull(r.free_rent_months),
  tiPSF: numOrNull(r.ti_psf),
  escalationPct: numOrNull(r.escalation_pct),
  options: r.options,
  source: r.source,
  sourceUrl: r.source_url,
  confidence: r.confidence,
  confidential: r.confidential,
  notes: r.notes,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

// ── AMPendingItem ─────────────────────────────────────────────────

export interface AMPendingItemRow {
  id: string;
  item_type: AMPendingItem['itemType'];
  title: string;
  description: string | null;
  building_id: string | null;
  building_name: string | null;
  deal_id: string | null;
  deal_name: string | null;
  owner: string | null;
  status: AMPendingItem['status'];
  priority: AMPendingItem['priority'];
  due_date: string | null;
  completed_date: string | null;
  source: string | null;
  link: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const amPendingItemToRow = (
  i: AMPendingItem
): Omit<AMPendingItemRow, 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
} => ({
  id: i.id,
  item_type: i.itemType,
  title: i.title,
  description: i.description,
  building_id: i.buildingId,
  building_name: i.buildingName,
  deal_id: i.dealId,
  deal_name: i.dealName,
  owner: i.owner,
  status: i.status,
  priority: i.priority,
  due_date: i.dueDate,
  completed_date: i.completedDate,
  source: i.source,
  link: i.link,
  notes: i.notes,
  created_at: i.createdAt,
  updated_at: i.updatedAt,
});

export const rowToAMPendingItem = (r: AMPendingItemRow): AMPendingItem => ({
  id: r.id,
  itemType: r.item_type,
  title: r.title,
  description: r.description,
  buildingId: r.building_id,
  buildingName: r.building_name,
  dealId: r.deal_id,
  dealName: r.deal_name,
  owner: r.owner,
  status: r.status,
  priority: r.priority,
  dueDate: r.due_date,
  completedDate: r.completed_date,
  source: r.source,
  link: r.link,
  notes: r.notes,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});
