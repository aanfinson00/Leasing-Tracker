// ───────────────────────────────────────────────────────────────────
// Mapping between the app's camelCase shape (defined in src/types.ts)
// and the snake_case Postgres row shape. Pure functions, no Supabase
// imports — used by both the runtime repo modules and the seed script.
// ───────────────────────────────────────────────────────────────────

import type {
  ActivityEntry,
  AcquisitionTarget,
  AcquisitionTargetContact,
  AcquisitionTargetNote,
  AMPendingItem,
  Building,
  Contact,
  ContactChannel,
  Deal,
  DevelopmentProject,
  DevProjectContact,
  DevProjectNote,
  DispositionListing,
  DispositionListingContact,
  DispositionListingNote,
  LeaseComp,
  SalesComp,
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
  sharepoint_url: string | null;
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
  sharepoint_url: d.sharepointUrl ?? null,
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
  sharepointUrl: r.sharepoint_url,
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
  tenant_rating: string | null;
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
  sharepoint_url: string | null;
  security_deposit: number | string | null;
  rent_commencement_date: string | null;
  cashflow_json: unknown | null;
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
  sharepoint_url: r.sharepointUrl ?? null,
  security_deposit: r.securityDeposit ?? null,
  rent_commencement_date: r.rentCommencementDate ?? null,
  cashflow_json: r.cashflowJson ?? null,
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
  tenantRating: r.tenant_rating as RentRollRow['tenantRating'],
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
  sharepointUrl: r.sharepoint_url,
  securityDeposit: numOrNull(r.security_deposit),
  rentCommencementDate: r.rent_commencement_date,
  cashflowJson: r.cashflow_json ?? null,
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
  submarket: string | null;
  county: string | null;
  city: string | null;
  address: string | null;
  site_setter_url: string | null;
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
  lat: number | string | null;
  lng: number | string | null;
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
  submarket: p.submarket,
  county: p.county,
  city: p.city,
  address: p.address,
  site_setter_url: p.siteSetterUrl,
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
  lat: p.lat,
  lng: p.lng,
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
  submarket: r.submarket,
  county: r.county,
  city: r.city,
  address: r.address,
  siteSetterUrl: r.site_setter_url,
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
  lat: numOrNull(r.lat),
  lng: numOrNull(r.lng),
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

// ── SalesComp ────────────────────────────────────────────────────

export interface SalesCompRow {
  id: string;
  property_name: string | null;
  building_address: string | null;
  market: string | null;
  property_type: string | null;
  building_type: string | null;
  sale_date: string | null;
  sale_price: number | string | null;
  price_psf: number | string | null;
  cap_rate: number | string | null;
  noi: number | string | null;
  building_sf: number | string | null;
  land_acres: number | string | null;
  year_built: number | null;
  occupancy_pct: number | string | null;
  buyer: string | null;
  seller: string | null;
  source: string | null;
  source_url: string | null;
  confidence: SalesComp['confidence'];
  confidential: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const salesCompToRow = (
  c: SalesComp
): Omit<SalesCompRow, 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
} => ({
  id: c.id,
  property_name: c.propertyName,
  building_address: c.buildingAddress,
  market: c.market,
  property_type: c.propertyType,
  building_type: c.buildingType,
  sale_date: c.saleDate,
  sale_price: c.salePrice,
  price_psf: c.pricePSF,
  cap_rate: c.capRate,
  noi: c.noi,
  building_sf: c.buildingSF,
  land_acres: c.landAcres,
  year_built: c.yearBuilt,
  occupancy_pct: c.occupancyPct,
  buyer: c.buyer,
  seller: c.seller,
  source: c.source,
  source_url: c.sourceUrl,
  confidence: c.confidence,
  confidential: c.confidential,
  notes: c.notes,
  created_at: c.createdAt,
  updated_at: c.updatedAt,
});

export const rowToSalesComp = (r: SalesCompRow): SalesComp => ({
  id: r.id,
  propertyName: r.property_name,
  buildingAddress: r.building_address,
  market: r.market,
  propertyType: r.property_type,
  buildingType: r.building_type,
  saleDate: r.sale_date,
  salePrice: numOrNull(r.sale_price),
  pricePSF: numOrNull(r.price_psf),
  capRate: numOrNull(r.cap_rate),
  noi: numOrNull(r.noi),
  buildingSF: numOrNull(r.building_sf),
  landAcres: numOrNull(r.land_acres),
  yearBuilt: r.year_built,
  occupancyPct: numOrNull(r.occupancy_pct),
  buyer: r.buyer,
  seller: r.seller,
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
  cadence: string;
  sent_to_tab: string | null;
  sent_to_id: string | null;
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
  cadence: i.cadence,
  sent_to_tab: i.sentToTab,
  sent_to_id: i.sentToId,
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
  cadence: (r.cadence as AMPendingItem['cadence']) ?? 'One-Time',
  sentToTab: r.sent_to_tab,
  sentToId: r.sent_to_id,
  notes: r.notes,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

// ── Contact (CRM v1) ──────────────────────────────────────────────

export interface ContactRow {
  id: string;
  contact_type: Contact['contactType'];
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  title: string | null;
  phones: ContactChannel[];
  emails: ContactChannel[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const contactToRow = (c: Contact): Omit<ContactRow, 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
} => ({
  id: c.id,
  contact_type: c.contactType,
  first_name: c.firstName,
  last_name: c.lastName,
  company_name: c.companyName,
  title: c.title,
  phones: c.phones,
  emails: c.emails,
  notes: c.notes,
  created_at: c.createdAt,
  updated_at: c.updatedAt,
});

export const rowToContact = (r: ContactRow): Contact => ({
  id: r.id,
  contactType: r.contact_type,
  firstName: r.first_name,
  lastName: r.last_name,
  companyName: r.company_name,
  title: r.title,
  phones: Array.isArray(r.phones) ? r.phones : [],
  emails: Array.isArray(r.emails) ? r.emails : [],
  notes: r.notes,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

// ── DevProjectContact ─────────────────────────────────────────────

export interface DevProjectContactRow {
  id: string;
  dev_project_id: string;
  contact_id: string;
  role_override: DevProjectContact['roleOverride'];
  is_primary: boolean;
  link_notes: string | null;
  created_at: string;
  updated_at: string;
}

export const devProjectContactToRow = (
  r: DevProjectContact
): Omit<DevProjectContactRow, 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
} => ({
  id: r.id,
  dev_project_id: r.devProjectId,
  contact_id: r.contactId,
  role_override: r.roleOverride,
  is_primary: r.isPrimary,
  link_notes: r.linkNotes,
  created_at: r.createdAt,
  updated_at: r.updatedAt,
});

export const rowToDevProjectContact = (r: DevProjectContactRow): DevProjectContact => ({
  id: r.id,
  devProjectId: r.dev_project_id,
  contactId: r.contact_id,
  roleOverride: r.role_override,
  isPrimary: r.is_primary,
  linkNotes: r.link_notes,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

// ── DevProjectNote ────────────────────────────────────────────────

export interface DevProjectNoteRow {
  id: string;
  dev_project_id: string;
  note_type: DevProjectNote['noteType'];
  event_date: string | null;
  content: string;
  author: string | null;
  link: string | null;
  created_at: string;
  updated_at: string;
}

export const devProjectNoteToRow = (
  n: DevProjectNote
): Omit<DevProjectNoteRow, 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
} => ({
  id: n.id,
  dev_project_id: n.devProjectId,
  note_type: n.noteType,
  event_date: n.eventDate,
  content: n.content,
  author: n.author,
  link: n.link,
  created_at: n.createdAt,
  updated_at: n.updatedAt,
});

export const rowToDevProjectNote = (r: DevProjectNoteRow): DevProjectNote => ({
  id: r.id,
  devProjectId: r.dev_project_id,
  noteType: r.note_type,
  eventDate: r.event_date,
  content: r.content,
  author: r.author,
  link: r.link,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

// ── AcquisitionTarget ─────────────────────────────────────────────

export interface AcquisitionTargetRow {
  id: string;
  target_name: string;
  market: string | null;
  submarket: string | null;
  county: string | null;
  city: string | null;
  address: string | null;
  property_type: string | null;
  status: AcquisitionTarget['status'];
  acres: number | string | null;
  building_count: number | null;
  total_sf: number | string | null;
  asking_price: number | string | null;
  our_offer: number | string | null;
  earnest_money: number | string | null;
  closing_costs_estimate: number | string | null;
  rehab_budget: number | string | null;
  underwritten_irr: number | string | null;
  underwritten_eqty_multiple: number | string | null;
  first_contacted_date: string | null;
  loi_date: string | null;
  psa_date: string | null;
  expected_closing_date: string | null;
  actual_closing_date: string | null;
  diligence_status: Record<string, unknown>;
  risk_level: AcquisitionTarget['riskLevel'];
  status_summary: string | null;
  lat: number | string | null;
  lng: number | string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const acquisitionTargetToRow = (
  a: AcquisitionTarget
): Omit<AcquisitionTargetRow, 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
} => ({
  id: a.id,
  target_name: a.targetName,
  market: a.market,
  submarket: a.submarket,
  county: a.county,
  city: a.city,
  address: a.address,
  property_type: a.propertyType,
  status: a.status,
  acres: a.acres,
  building_count: a.buildingCount,
  total_sf: a.totalSF,
  asking_price: a.askingPrice,
  our_offer: a.ourOffer,
  earnest_money: a.earnestMoney,
  closing_costs_estimate: a.closingCostsEstimate,
  rehab_budget: a.rehabBudget,
  underwritten_irr: a.underwrittenIRR,
  underwritten_eqty_multiple: a.underwrittenEquityMultiple,
  first_contacted_date: a.firstContactedDate,
  loi_date: a.loiDate,
  psa_date: a.psaDate,
  expected_closing_date: a.expectedClosingDate,
  actual_closing_date: a.actualClosingDate,
  diligence_status: a.diligenceStatus,
  risk_level: a.riskLevel,
  status_summary: a.statusSummary,
  lat: a.lat,
  lng: a.lng,
  notes: a.notes,
  created_at: a.createdAt,
  updated_at: a.updatedAt,
});

export const rowToAcquisitionTarget = (r: AcquisitionTargetRow): AcquisitionTarget => ({
  id: r.id,
  targetName: r.target_name,
  market: r.market,
  submarket: r.submarket,
  county: r.county,
  city: r.city,
  address: r.address,
  propertyType: r.property_type,
  status: r.status,
  acres: numOrNull(r.acres),
  buildingCount: r.building_count,
  totalSF: numOrNull(r.total_sf),
  askingPrice: numOrNull(r.asking_price),
  ourOffer: numOrNull(r.our_offer),
  earnestMoney: numOrNull(r.earnest_money),
  closingCostsEstimate: numOrNull(r.closing_costs_estimate),
  rehabBudget: numOrNull(r.rehab_budget),
  underwrittenIRR: numOrNull(r.underwritten_irr),
  underwrittenEquityMultiple: numOrNull(r.underwritten_eqty_multiple),
  firstContactedDate: r.first_contacted_date,
  loiDate: r.loi_date,
  psaDate: r.psa_date,
  expectedClosingDate: r.expected_closing_date,
  actualClosingDate: r.actual_closing_date,
  diligenceStatus: (r.diligence_status ?? {}) as Record<string, unknown>,
  riskLevel: r.risk_level,
  statusSummary: r.status_summary,
  lat: numOrNull(r.lat),
  lng: numOrNull(r.lng),
  notes: r.notes,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

// ── AcquisitionTargetContact / Note ───────────────────────────────

export interface AcquisitionTargetContactRow {
  id: string;
  acquisition_target_id: string;
  contact_id: string;
  role_override: AcquisitionTargetContact['roleOverride'];
  is_primary: boolean;
  link_notes: string | null;
  created_at: string;
  updated_at: string;
}

export const acquisitionTargetContactToRow = (
  r: AcquisitionTargetContact
): Omit<AcquisitionTargetContactRow, 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
} => ({
  id: r.id,
  acquisition_target_id: r.acquisitionTargetId,
  contact_id: r.contactId,
  role_override: r.roleOverride,
  is_primary: r.isPrimary,
  link_notes: r.linkNotes,
  created_at: r.createdAt,
  updated_at: r.updatedAt,
});

export const rowToAcquisitionTargetContact = (
  r: AcquisitionTargetContactRow
): AcquisitionTargetContact => ({
  id: r.id,
  acquisitionTargetId: r.acquisition_target_id,
  contactId: r.contact_id,
  roleOverride: r.role_override,
  isPrimary: r.is_primary,
  linkNotes: r.link_notes,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export interface AcquisitionTargetNoteRow {
  id: string;
  acquisition_target_id: string;
  note_type: AcquisitionTargetNote['noteType'];
  event_date: string | null;
  content: string;
  author: string | null;
  link: string | null;
  created_at: string;
  updated_at: string;
}

export const acquisitionTargetNoteToRow = (
  n: AcquisitionTargetNote
): Omit<AcquisitionTargetNoteRow, 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
} => ({
  id: n.id,
  acquisition_target_id: n.acquisitionTargetId,
  note_type: n.noteType,
  event_date: n.eventDate,
  content: n.content,
  author: n.author,
  link: n.link,
  created_at: n.createdAt,
  updated_at: n.updatedAt,
});

export const rowToAcquisitionTargetNote = (
  r: AcquisitionTargetNoteRow
): AcquisitionTargetNote => ({
  id: r.id,
  acquisitionTargetId: r.acquisition_target_id,
  noteType: r.note_type,
  eventDate: r.event_date,
  content: r.content,
  author: r.author,
  link: r.link,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

// ── DispositionListing ────────────────────────────────────────────

export interface DispositionListingRow {
  id: string;
  asset_name: string;
  building_id: string | null;
  market: string | null;
  submarket: string | null;
  county: string | null;
  city: string | null;
  address: string | null;
  property_type: string | null;
  status: DispositionListing['status'];
  total_sf: number | string | null;
  acres: number | string | null;
  occupancy_pct: number | string | null;
  trailing_noi: number | string | null;
  forward_noi: number | string | null;
  list_price: number | string | null;
  list_cap_pct: number | string | null;
  achieved_price: number | string | null;
  achieved_cap_pct: number | string | null;
  net_proceeds: number | string | null;
  broker_commission_pct: number | string | null;
  list_date: string | null;
  bids_due_date: string | null;
  loi_executed_date: string | null;
  psa_executed_date: string | null;
  expected_closing_date: string | null;
  actual_closing_date: string | null;
  risk_level: DispositionListing['riskLevel'];
  status_summary: string | null;
  lat: number | string | null;
  lng: number | string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const dispositionListingToRow = (
  d: DispositionListing
): Omit<DispositionListingRow, 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
} => ({
  id: d.id,
  asset_name: d.assetName,
  building_id: d.buildingId,
  market: d.market,
  submarket: d.submarket,
  county: d.county,
  city: d.city,
  address: d.address,
  property_type: d.propertyType,
  status: d.status,
  total_sf: d.totalSF,
  acres: d.acres,
  occupancy_pct: d.occupancyPct,
  trailing_noi: d.trailingNOI,
  forward_noi: d.forwardNOI,
  list_price: d.listPrice,
  list_cap_pct: d.listCapPct,
  achieved_price: d.achievedPrice,
  achieved_cap_pct: d.achievedCapPct,
  net_proceeds: d.netProceeds,
  broker_commission_pct: d.brokerCommissionPct,
  list_date: d.listDate,
  bids_due_date: d.bidsDueDate,
  loi_executed_date: d.loiExecutedDate,
  psa_executed_date: d.psaExecutedDate,
  expected_closing_date: d.expectedClosingDate,
  actual_closing_date: d.actualClosingDate,
  risk_level: d.riskLevel,
  status_summary: d.statusSummary,
  lat: d.lat,
  lng: d.lng,
  notes: d.notes,
  created_at: d.createdAt,
  updated_at: d.updatedAt,
});

export const rowToDispositionListing = (r: DispositionListingRow): DispositionListing => ({
  id: r.id,
  assetName: r.asset_name,
  buildingId: r.building_id,
  market: r.market,
  submarket: r.submarket,
  county: r.county,
  city: r.city,
  address: r.address,
  propertyType: r.property_type,
  status: r.status,
  totalSF: numOrNull(r.total_sf),
  acres: numOrNull(r.acres),
  occupancyPct: numOrNull(r.occupancy_pct),
  trailingNOI: numOrNull(r.trailing_noi),
  forwardNOI: numOrNull(r.forward_noi),
  listPrice: numOrNull(r.list_price),
  listCapPct: numOrNull(r.list_cap_pct),
  achievedPrice: numOrNull(r.achieved_price),
  achievedCapPct: numOrNull(r.achieved_cap_pct),
  netProceeds: numOrNull(r.net_proceeds),
  brokerCommissionPct: numOrNull(r.broker_commission_pct),
  listDate: r.list_date,
  bidsDueDate: r.bids_due_date,
  loiExecutedDate: r.loi_executed_date,
  psaExecutedDate: r.psa_executed_date,
  expectedClosingDate: r.expected_closing_date,
  actualClosingDate: r.actual_closing_date,
  riskLevel: r.risk_level,
  statusSummary: r.status_summary,
  lat: numOrNull(r.lat),
  lng: numOrNull(r.lng),
  notes: r.notes,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export interface DispositionListingContactRow {
  id: string;
  disposition_listing_id: string;
  contact_id: string;
  role_override: DispositionListingContact['roleOverride'];
  is_primary: boolean;
  link_notes: string | null;
  created_at: string;
  updated_at: string;
}

export const dispositionListingContactToRow = (
  r: DispositionListingContact
): Omit<DispositionListingContactRow, 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
} => ({
  id: r.id,
  disposition_listing_id: r.dispositionListingId,
  contact_id: r.contactId,
  role_override: r.roleOverride,
  is_primary: r.isPrimary,
  link_notes: r.linkNotes,
  created_at: r.createdAt,
  updated_at: r.updatedAt,
});

export const rowToDispositionListingContact = (
  r: DispositionListingContactRow
): DispositionListingContact => ({
  id: r.id,
  dispositionListingId: r.disposition_listing_id,
  contactId: r.contact_id,
  roleOverride: r.role_override,
  isPrimary: r.is_primary,
  linkNotes: r.link_notes,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export interface DispositionListingNoteRow {
  id: string;
  disposition_listing_id: string;
  note_type: DispositionListingNote['noteType'];
  event_date: string | null;
  content: string;
  author: string | null;
  link: string | null;
  created_at: string;
  updated_at: string;
}

export const dispositionListingNoteToRow = (
  n: DispositionListingNote
): Omit<DispositionListingNoteRow, 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
} => ({
  id: n.id,
  disposition_listing_id: n.dispositionListingId,
  note_type: n.noteType,
  event_date: n.eventDate,
  content: n.content,
  author: n.author,
  link: n.link,
  created_at: n.createdAt,
  updated_at: n.updatedAt,
});

export const rowToDispositionListingNote = (
  r: DispositionListingNoteRow
): DispositionListingNote => ({
  id: r.id,
  dispositionListingId: r.disposition_listing_id,
  noteType: r.note_type,
  eventDate: r.event_date,
  content: r.content,
  author: r.author,
  link: r.link,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});
