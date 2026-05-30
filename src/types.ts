import { z } from 'zod';

// Format constraints from parce-data-dictionary.xlsx ("Identifiers" sheet).
// Enforced at the form layer (react-hook-form `pattern`), NOT in the zod
// schema — older rows may pre-date these formats and should still parse.
export const DEAL_ID_REGEX = /^\d{4}$/;
export const SPACE_ID_REGEX = /^\d{4}-B\d{2}-S\d{2}$/;
export const DEAL_ID_FORMAT_HINT = '4-digit project code (e.g. 5001)';
export const SPACE_ID_FORMAT_HINT = '{project}-B{nn}-S{nn} (e.g. 5001-B01-S03)';

export const DealStatusEnum = z.enum([
  'New Prospect',
  'RFP Requested',
  'Drafting Unsolicited',
  'Proposal Pending Approval',
  'Proposal Sent',
  'LOI Negotiations',
  'Lease Negotiations',
  'Executed',
  'On Hold',
  'Lost',
]);
export type DealStatus = z.infer<typeof DealStatusEnum>;

// Linear pipeline order — 'On Hold' and 'Lost' are side states, off-flow.
// Slots 2a / 2b ('RFP Requested' and 'Drafting Unsolicited') collapse into
// one visual step 2 in the stepper.
export const PIPELINE_ORDER: DealStatus[] = [
  'New Prospect',
  'RFP Requested',
  'Drafting Unsolicited',
  'Proposal Pending Approval',
  'Proposal Sent',
  'LOI Negotiations',
  'Lease Negotiations',
  'Executed',
];

export const SIDE_STATUSES: DealStatus[] = ['On Hold', 'Lost'];

export const PriorityEnum = z.enum(['High', 'Medium', 'Low']);
export type Priority = z.infer<typeof PriorityEnum>;

export const DealSchema = z.object({
  id: z.string().uuid(),

  // Identifiers
  dealName: z.string().min(1, 'Deal name is required'),
  spaceId: z.string().nullable().optional(),
  building: z.string().nullable().optional(),
  dealId: z.string().nullable().optional(),

  // Space (range supported via min/max)
  minSF: z.number().int().nullable().optional(),
  maxSF: z.number().int().nullable().optional(),

  // Prospect & broker
  prospectTenant: z.string().nullable().optional(),
  brokerRep: z.string().nullable().optional(),

  // Deal type & status
  transaction: z.string().nullable().optional(),
  status: DealStatusEnum,

  // Economics
  lastRevalUWRent: z.number().nullable().optional(),
  targetRent: z.number().nullable().optional(),
  proposedTermMonths: z.number().int().nullable().optional(),
  freeRentMonths: z.number().int().nullable().optional(),
  tiPerSF: z.number().nullable().optional(),
  tiNote: z.string().nullable().optional(),

  // Forecast
  probabilityPct: z.number().min(0).max(100).nullable().optional(),
  expectedStart: z.string().nullable().optional(),

  // Location (Map tab — Phase 1)
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),

  // Meta
  lastUpdated: z.string().nullable().optional(),
  priority: PriorityEnum,
  currentSummary: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
}).transform((d) => ({
  ...d,
  spaceId: d.spaceId ?? null,
  building: d.building ?? null,
  dealId: d.dealId ?? null,
  minSF: d.minSF ?? null,
  maxSF: d.maxSF ?? null,
  prospectTenant: d.prospectTenant ?? null,
  brokerRep: d.brokerRep ?? null,
  transaction: d.transaction ?? null,
  lastRevalUWRent: d.lastRevalUWRent ?? null,
  targetRent: d.targetRent ?? null,
  proposedTermMonths: d.proposedTermMonths ?? null,
  freeRentMonths: d.freeRentMonths ?? null,
  tiPerSF: d.tiPerSF ?? null,
  tiNote: d.tiNote ?? null,
  probabilityPct: d.probabilityPct ?? null,
  expectedStart: d.expectedStart ?? null,
  lat: d.lat ?? null,
  lng: d.lng ?? null,
  lastUpdated: d.lastUpdated ?? null,
  currentSummary: d.currentSummary ?? null,
  notes: d.notes ?? null,
}));

export type Deal = z.infer<typeof DealSchema>;

// ──────────────────────────────────────────────────────────────────
// Rent Roll — per-space, per-tenant current state
// ──────────────────────────────────────────────────────────────────

export const UWBasisEnum = z.enum(['Actual', 'Prospective UW']);
export type UWBasis = z.infer<typeof UWBasisEnum>;

// Credit-rating scale per parce-data-dictionary.xlsx. Replaces the
// prior numeric 0-5 "stars" — that was quality-perception, this is
// credit-quality. Existing star values are backfilled to
// 'Unrated / Private' in the accompanying migration.
export const TenantRatingEnum = z.enum([
  'AAA',
  'AA',
  'A',
  'BBB',
  'BB',
  'B',
  'NR',
  'Unrated / Private',
  'Govt',
]);
export type TenantRating = z.infer<typeof TenantRatingEnum>;

export const RentRollRowSchema = z.object({
  id: z.string().uuid(),

  // Identifiers (link key to Prospects: spaceId)
  dealId: z.string().nullable().optional(),
  dealName: z.string().nullable().optional(),
  buildingId: z.string().nullable().optional(),
  spaceId: z.string().nullable().optional(),
  building: z.string().nullable().optional(),

  // Property
  market: z.string().nullable().optional(),
  propertyType: z.string().nullable().optional(),
  buildingType: z.string().nullable().optional(),

  // Tenant
  tenantName: z.string().nullable().optional(),
  tenantRating: TenantRatingEnum.nullable().optional(),
  occupied: z.boolean(),
  uwBasis: UWBasisEnum.nullable().optional(),

  // Space
  leasableSF: z.number().nullable().optional(),

  // Lease terms
  leaseStart: z.string().nullable().optional(),
  leaseTermMonths: z.number().nullable().optional(),
  leaseEnd: z.string().nullable().optional(),
  freeRentMonths: z.number().nullable().optional(),
  annualRentBumpsPct: z.number().nullable().optional(),

  // TI & commissions
  tiPerSF: z.number().nullable().optional(),
  tiNote: z.string().nullable().optional(),
  uwTiPerSF: z.number().nullable().optional(),
  specOffice: z.boolean(),
  specTIPerSF: z.number().nullable().optional(),
  commissionStructurePct: z.number().nullable().optional(),
  commissionDollar: z.number().nullable().optional(),

  // Rent
  lastRevalUWRent: z.number().nullable().optional(),
  startingAnnualRentPSF: z.number().nullable().optional(),
  inPlaceRent: z.number().nullable().optional(),

  // Meta
  currentSummary: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
}).transform((r) => ({
  ...r,
  dealId: r.dealId ?? null,
  dealName: r.dealName ?? null,
  buildingId: r.buildingId ?? null,
  spaceId: r.spaceId ?? null,
  building: r.building ?? null,
  market: r.market ?? null,
  propertyType: r.propertyType ?? null,
  buildingType: r.buildingType ?? null,
  tenantName: r.tenantName ?? null,
  tenantRating: r.tenantRating ?? null,
  uwBasis: r.uwBasis ?? null,
  leasableSF: r.leasableSF ?? null,
  leaseStart: r.leaseStart ?? null,
  leaseTermMonths: r.leaseTermMonths ?? null,
  leaseEnd: r.leaseEnd ?? null,
  freeRentMonths: r.freeRentMonths ?? null,
  annualRentBumpsPct: r.annualRentBumpsPct ?? null,
  tiPerSF: r.tiPerSF ?? null,
  tiNote: r.tiNote ?? null,
  uwTiPerSF: r.uwTiPerSF ?? null,
  specOffice: r.specOffice,
  specTIPerSF: r.specTIPerSF ?? null,
  commissionStructurePct: r.commissionStructurePct ?? null,
  commissionDollar: r.commissionDollar ?? null,
  lastRevalUWRent: r.lastRevalUWRent ?? null,
  startingAnnualRentPSF: r.startingAnnualRentPSF ?? null,
  inPlaceRent: r.inPlaceRent ?? null,
  currentSummary: r.currentSummary ?? null,
  notes: r.notes ?? null,
}));

export type RentRollRow = z.infer<typeof RentRollRowSchema>;

export const defaultRentRollRow = (): RentRollRow => ({
  id: crypto.randomUUID(),
  dealId: null,
  dealName: null,
  buildingId: null,
  spaceId: null,
  building: null,
  market: null,
  propertyType: null,
  buildingType: null,
  tenantName: null,
  tenantRating: null,
  occupied: false,
  uwBasis: 'Prospective UW',
  leasableSF: null,
  leaseStart: null,
  leaseTermMonths: null,
  leaseEnd: null,
  freeRentMonths: null,
  annualRentBumpsPct: null,
  tiPerSF: null,
  tiNote: null,
  uwTiPerSF: null,
  specOffice: false,
  specTIPerSF: null,
  commissionStructurePct: null,
  commissionDollar: null,
  lastRevalUWRent: null,
  startingAnnualRentPSF: null,
  inPlaceRent: null,
  currentSummary: null,
  notes: null,
});

const todayIso = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

export const defaultOnboardingChecklist = (
  rentRollId: string,
  items: OnboardingItem[]
): OnboardingChecklist => ({
  id: crypto.randomUUID(),
  rentRollId,
  createdAt: new Date().toISOString(),
  templateVersion: 1,
  items,
});

export const defaultDeal = (): Deal => ({
  id: crypto.randomUUID(),
  dealName: '',
  spaceId: null,
  building: null,
  dealId: null,
  minSF: null,
  maxSF: null,
  prospectTenant: null,
  brokerRep: null,
  transaction: null,
  status: 'New Prospect',
  lastRevalUWRent: null,
  targetRent: null,
  proposedTermMonths: null,
  freeRentMonths: null,
  tiPerSF: null,
  tiNote: null,
  probabilityPct: null,
  expectedStart: null,
  lat: null,
  lng: null,
  lastUpdated: todayIso(),
  priority: 'Low',
  currentSummary: null,
  notes: null,
});

// ──────────────────────────────────────────────────────────────────
// Activity Log
// ──────────────────────────────────────────────────────────────────

export const ActivityTypeEnum = z.enum([
  'note',
  'email-out',
  'email-in',
  'call',
  'meeting',
  'status-change',
]);
export type ActivityType = z.infer<typeof ActivityTypeEnum>;

export const ActivityParentTypeEnum = z.enum(['deal', 'rentroll']);
export type ActivityParentType = z.infer<typeof ActivityParentTypeEnum>;

export const ActivityEntrySchema = z.object({
  id: z.string().uuid(),
  parentType: ActivityParentTypeEnum,
  parentId: z.string(),
  date: z.string(),
  type: ActivityTypeEnum,
  summary: z.string(),
  link: z.string().nullable().optional(),
  author: z.string().nullable().optional(),
  createdAt: z.string(),
}).transform((a) => ({
  ...a,
  link: a.link ?? null,
  author: a.author ?? null,
}));

export type ActivityEntry = z.infer<typeof ActivityEntrySchema>;

// ──────────────────────────────────────────────────────────────────
// Onboarding checklist — per Rent Roll tenant, one record with N
// checkbox items. Template lives in src/lib/onboarding.ts.
// ──────────────────────────────────────────────────────────────────

export const OnboardingItemSchema = z.object({
  itemId: z.string(),
  checked: z.boolean(),
  notes: z.string().nullable().optional(),
  link: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
}).transform((i) => ({
  ...i,
  notes: i.notes ?? null,
  link: i.link ?? null,
  completedAt: i.completedAt ?? null,
}));

export type OnboardingItem = z.infer<typeof OnboardingItemSchema>;

export const OnboardingChecklistSchema = z.object({
  id: z.string().uuid(),
  rentRollId: z.string(),
  createdAt: z.string(),
  templateVersion: z.number().int().default(1),
  items: z.array(OnboardingItemSchema),
});

export type OnboardingChecklist = z.infer<typeof OnboardingChecklistSchema>;

// ──────────────────────────────────────────────────────────────────
// Scenario — underwriting analysis attached to a Deal. Stores the
// full Lease-Calculator inputs, globals snapshot, and optionally a
// cached results blob. Lives in Supabase `scenarios` table.
// inputs/globals/results are passed through as `unknown` here; the
// strict shape lives in src/lib/lease-math/types.ts and is enforced
// by the calc engine itself. We do this so changing the math model
// doesn't require a zod migration step.
// ──────────────────────────────────────────────────────────────────

export const ScenarioSchema = z.object({
  id: z.string().uuid(),
  dealId: z.string(),
  name: z.string().min(1),
  inputs: z.unknown(),
  globals: z.unknown(),
  results: z.unknown().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).transform((s) => ({
  ...s,
  results: s.results ?? null,
}));

export type Scenario = z.infer<typeof ScenarioSchema>;

// ──────────────────────────────────────────────────────────────────
// Building — drawn polygon footprint attached to a project. Rendered
// as 3D extrusion on the Map tab when zoomed in. `footprint` is a
// GeoJSON Polygon in WGS84 lng/lat (the same shape Mapbox sources
// natively, no client-side conversion required).
// ──────────────────────────────────────────────────────────────────

// Loose GeoJSON Polygon shape — z.unknown so we don't fight zod on
// nested coordinate arrays. The drawing tool (mapbox-gl-draw) is the
// authoritative producer of valid Polygons; readers trust the shape.
export const FrontageSideEnum = z.enum(['N', 'S', 'E', 'W']);
export type FrontageSide = z.infer<typeof FrontageSideEnum>;

// Bump-out — rectangle attached to a side of the building, extending
// outward. Stored on the Building as a jsonb array.
export const BumpOutSchema = z.object({
  id: z.string(),
  side: FrontageSideEnum,
  offsetFt: z.number().min(0),
  widthFt: z.number().positive(),
  depthFt: z.number().positive(),
  name: z.string().nullable().optional(),
  spaceId: z.string().nullable().optional(),
}).transform((b) => ({
  ...b,
  name: b.name ?? null,
  spaceId: b.spaceId ?? null,
}));

export type BumpOut = z.infer<typeof BumpOutSchema>;

// Subdivision: one parent bay-space split into N leasable child
// spaces. Parent disappears from the leasable list once split.
// Bay footprint is unaffected — splits are a leasing-identity
// construct, not a physical change to the building.
export const SpaceSubdivisionSchema = z.object({
  parentSpaceId: z.string().min(1),
  childSpaceIds: z.array(z.string().min(1)).min(2),
});
export type SpaceSubdivision = z.infer<typeof SpaceSubdivisionSchema>;

export const BuildingSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().min(1),
  name: z.string().default('Building'),
  footprint: z.unknown(),
  heightFt: z.number().positive(),
  color: z.string().nullable().optional(),
  bayCount: z.number().int().min(1).max(50).default(1),
  frontageSide: FrontageSideEnum.nullable().optional(),
  widthFt: z.number().positive().nullable().optional(),
  depthFt: z.number().positive().nullable().optional(),
  rotationDeg: z.number().min(-360).max(360).default(0),
  centerLat: z.number().min(-90).max(90).nullable().optional(),
  centerLng: z.number().min(-180).max(180).nullable().optional(),
  // Bump-outs: array of OUTWARD-extending rectangles attached to the
  // building's sides. Each is rendered as its own extrusion feature.
  bumpOuts: z.array(BumpOutSchema).default([]),
  // Space IDs per bay (parallel to bay_count). Null entries fall back
  // to the auto-format {projectId}-B{buildingOrdinal}-S{i+1}.
  baySpaceIds: z.array(z.string().nullable()).default([]),
  // Subdivisions of bay spaces. When a parent appears here, it is
  // replaced in the leasable-space list by its children.
  spaceSubdivisions: z.array(SpaceSubdivisionSchema).default([]),
  // 1-indexed position of this building within its project — used in
  // the auto Space ID format. Assigned on creation.
  buildingOrdinal: z.number().int().positive().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).transform((b) => ({
  ...b,
  color: b.color ?? null,
  frontageSide: b.frontageSide ?? null,
  widthFt: b.widthFt ?? null,
  depthFt: b.depthFt ?? null,
  centerLat: b.centerLat ?? null,
  centerLng: b.centerLng ?? null,
  buildingOrdinal: b.buildingOrdinal ?? null,
}));

export type Building = z.infer<typeof BuildingSchema>;

// Convention: {projectId}-B{nn}-S{nn} with zero-padded 2-digit ordinals.
// Falls back to the building's id prefix when ordinal isn't set yet
// (shouldn't happen post-migration but kept defensive).
export function autoSpaceId(
  projectId: string,
  buildingOrdinal: number | null | undefined,
  sectionIndex: number
): string {
  const b = (buildingOrdinal ?? 1).toString().padStart(2, '0');
  const s = (sectionIndex + 1).toString().padStart(2, '0');
  return `${projectId}-B${b}-S${s}`;
}

// ──────────────────────────────────────────────────────────────────
// Development Projects — capital projects from site selection through
// delivery. Each row is one project (often becomes 1+ buildings on
// delivery, then handoff to Rent Roll for lease-up).
// ──────────────────────────────────────────────────────────────────

export const DevPhaseEnum = z.enum([
  'Site Selection',
  'Entitlement',
  'Design',
  'Construction',
  'Lease-Up',
  'Delivered',
  'On Hold',
  'Cancelled',
]);
export type DevPhase = z.infer<typeof DevPhaseEnum>;

// Linear phase order — On Hold / Cancelled are side states.
export const DEV_PHASE_ORDER: DevPhase[] = [
  'Site Selection',
  'Entitlement',
  'Design',
  'Construction',
  'Lease-Up',
  'Delivered',
];

export const RiskLevelEnum = z.enum(['Low', 'Medium', 'High']);
export type RiskLevel = z.infer<typeof RiskLevelEnum>;

export const DevelopmentProjectSchema = z.object({
  id: z.string().uuid(),

  projectName: z.string().min(1, 'Project name is required'),
  market: z.string().nullable().optional(),
  submarket: z.string().nullable().optional(),
  county: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  address: z.string().nullable().optional(),

  phase: DevPhaseEnum,

  totalSF: z.number().positive().nullable().optional(),
  acres: z.number().positive().nullable().optional(),
  buildingCount: z.number().int().positive().nullable().optional(),

  startDate: z.string().nullable().optional(),
  expectedDeliveryDate: z.string().nullable().optional(),
  actualDeliveryDate: z.string().nullable().optional(),

  totalBudget: z.number().min(0).nullable().optional(),
  spentToDate: z.number().min(0).nullable().optional(),

  pmName: z.string().nullable().optional(),
  gcName: z.string().nullable().optional(),
  gcContact: z.string().nullable().optional(),
  architect: z.string().nullable().optional(),

  riskLevel: RiskLevelEnum,
  statusSummary: z.string().nullable().optional(),

  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),

  notes: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).transform((p) => ({
  ...p,
  market: p.market ?? null,
  submarket: p.submarket ?? null,
  county: p.county ?? null,
  city: p.city ?? null,
  address: p.address ?? null,
  totalSF: p.totalSF ?? null,
  acres: p.acres ?? null,
  buildingCount: p.buildingCount ?? null,
  startDate: p.startDate ?? null,
  expectedDeliveryDate: p.expectedDeliveryDate ?? null,
  actualDeliveryDate: p.actualDeliveryDate ?? null,
  totalBudget: p.totalBudget ?? null,
  spentToDate: p.spentToDate ?? null,
  pmName: p.pmName ?? null,
  gcName: p.gcName ?? null,
  gcContact: p.gcContact ?? null,
  architect: p.architect ?? null,
  statusSummary: p.statusSummary ?? null,
  lat: p.lat ?? null,
  lng: p.lng ?? null,
  notes: p.notes ?? null,
}));

export type DevelopmentProject = z.infer<typeof DevelopmentProjectSchema>;

// ──────────────────────────────────────────────────────────────────
// Property Tax Appeals — one row per filed/considered appeal for a
// given property and tax year. Backs Asset Management workflows
// + .claude/skills/property-tax-appeal-{intake,watcher}.
// ──────────────────────────────────────────────────────────────────

export const PropertyTaxAppealStatusEnum = z.enum([
  'Considering',
  'Filed',
  'Under Review',
  'Hearing Scheduled',
  'Settled',
  'Withdrawn',
  'Lost',
]);
export type PropertyTaxAppealStatus = z.infer<typeof PropertyTaxAppealStatusEnum>;

// Statuses that close out the appeal — exclude from "open work" reports.
export const APPEAL_OPEN_STATUSES: PropertyTaxAppealStatus[] = [
  'Considering',
  'Filed',
  'Under Review',
  'Hearing Scheduled',
];

export const PropertyTaxAppealSchema = z.object({
  id: z.string().uuid(),

  // Property reference (soft link)
  buildingId: z.string().nullable().optional(),
  building: z.string().nullable().optional(),
  parcelNumber: z.string().nullable().optional(),
  jurisdiction: z.string().nullable().optional(),

  // Required: which tax year we're appealing
  taxYear: z.number().int().min(2000).max(2100),

  // Valuation triangle
  assessedValue: z.number().nullable().optional(),
  proposedValue: z.number().nullable().optional(),
  marketValue: z.number().nullable().optional(),

  status: PropertyTaxAppealStatusEnum,

  // Dates (ISO YYYY-MM-DD)
  filedDate: z.string().nullable().optional(),
  hearingDate: z.string().nullable().optional(),
  resolutionDate: z.string().nullable().optional(),

  // Outcome
  initialAssessedValue: z.number().nullable().optional(),
  finalAssessedValue: z.number().nullable().optional(),
  estimatedSavings: z.number().nullable().optional(),

  // Consultant
  consultantName: z.string().nullable().optional(),
  consultantFeePct: z.number().min(0).max(1).nullable().optional(),
  consultantFeeDollar: z.number().min(0).nullable().optional(),

  notes: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).transform((a) => ({
  ...a,
  buildingId: a.buildingId ?? null,
  building: a.building ?? null,
  parcelNumber: a.parcelNumber ?? null,
  jurisdiction: a.jurisdiction ?? null,
  assessedValue: a.assessedValue ?? null,
  proposedValue: a.proposedValue ?? null,
  marketValue: a.marketValue ?? null,
  filedDate: a.filedDate ?? null,
  hearingDate: a.hearingDate ?? null,
  resolutionDate: a.resolutionDate ?? null,
  initialAssessedValue: a.initialAssessedValue ?? null,
  finalAssessedValue: a.finalAssessedValue ?? null,
  estimatedSavings: a.estimatedSavings ?? null,
  consultantName: a.consultantName ?? null,
  consultantFeePct: a.consultantFeePct ?? null,
  consultantFeeDollar: a.consultantFeeDollar ?? null,
  notes: a.notes ?? null,
}));

export type PropertyTaxAppeal = z.infer<typeof PropertyTaxAppealSchema>;

// ──────────────────────────────────────────────────────────────────
// Lease Comps — historical observed deals stored as reference data
// for underwriting. Not generated from existing deals — these are
// market data points the user gathers from brokers, reports, etc.
// ──────────────────────────────────────────────────────────────────

export const TransactionTypeEnum = z.enum([
  'New Lease',
  'Renewal',
  'Sublease',
  'Expansion',
  'Other',
]);
export type TransactionType = z.infer<typeof TransactionTypeEnum>;

export const RentTypeEnum = z.enum([
  'NNN',
  'Modified Gross',
  'Full Service',
  'Industrial Gross',
]);
export type RentType = z.infer<typeof RentTypeEnum>;

export const CompConfidenceEnum = z.enum(['High', 'Medium', 'Low']);
export type CompConfidence = z.infer<typeof CompConfidenceEnum>;

export const LeaseCompSchema = z.object({
  id: z.string().uuid(),

  propertyName: z.string().nullable().optional(),
  buildingAddress: z.string().nullable().optional(),
  market: z.string().nullable().optional(),
  propertyType: z.string().nullable().optional(),
  buildingType: z.string().nullable().optional(),

  tenantName: z.string().nullable().optional(),
  tenantIndustry: z.string().nullable().optional(),
  transactionType: TransactionTypeEnum.nullable().optional(),
  signedDate: z.string().nullable().optional(),
  deliveryDate: z.string().nullable().optional(),

  leaseSF: z.number().positive().nullable().optional(),
  buildingSF: z.number().positive().nullable().optional(),
  baseRentPSF: z.number().min(0).nullable().optional(),
  effectiveRentPSF: z.number().min(0).nullable().optional(),
  rentType: RentTypeEnum.nullable().optional(),
  termMonths: z.number().int().positive().nullable().optional(),
  freeRentMonths: z.number().min(0).nullable().optional(),
  tiPSF: z.number().min(0).nullable().optional(),
  // Stored as fraction (0.03 for 3%).
  escalationPct: z.number().nullable().optional(),
  options: z.string().nullable().optional(),

  source: z.string().nullable().optional(),
  sourceUrl: z.string().nullable().optional(),
  confidence: CompConfidenceEnum,
  confidential: z.boolean(),

  notes: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).transform((c) => ({
  ...c,
  propertyName: c.propertyName ?? null,
  buildingAddress: c.buildingAddress ?? null,
  market: c.market ?? null,
  propertyType: c.propertyType ?? null,
  buildingType: c.buildingType ?? null,
  tenantName: c.tenantName ?? null,
  tenantIndustry: c.tenantIndustry ?? null,
  transactionType: c.transactionType ?? null,
  signedDate: c.signedDate ?? null,
  deliveryDate: c.deliveryDate ?? null,
  leaseSF: c.leaseSF ?? null,
  buildingSF: c.buildingSF ?? null,
  baseRentPSF: c.baseRentPSF ?? null,
  effectiveRentPSF: c.effectiveRentPSF ?? null,
  rentType: c.rentType ?? null,
  termMonths: c.termMonths ?? null,
  freeRentMonths: c.freeRentMonths ?? null,
  tiPSF: c.tiPSF ?? null,
  escalationPct: c.escalationPct ?? null,
  options: c.options ?? null,
  source: c.source ?? null,
  sourceUrl: c.sourceUrl ?? null,
  notes: c.notes ?? null,
}));

export type LeaseComp = z.infer<typeof LeaseCompSchema>;

// ──────────────────────────────────────────────────────────────────
// Sales Comps — closed sale transactions used as reference data for
// acquisitions, dispositions, and underwriting. Separate from lease
// comps because the fields are fundamentally different (price vs rent).
// ──────────────────────────────────────────────────────────────────

export const SalesCompSchema = z.object({
  id: z.string().uuid(),

  propertyName: z.string().nullable().optional(),
  buildingAddress: z.string().nullable().optional(),
  market: z.string().nullable().optional(),
  propertyType: z.string().nullable().optional(),
  buildingType: z.string().nullable().optional(),

  saleDate: z.string().nullable().optional(),
  salePrice: z.number().min(0).nullable().optional(),
  pricePSF: z.number().min(0).nullable().optional(),
  capRate: z.number().nullable().optional(),
  noi: z.number().nullable().optional(),

  buildingSF: z.number().positive().nullable().optional(),
  landAcres: z.number().positive().nullable().optional(),
  yearBuilt: z.number().int().nullable().optional(),
  occupancyPct: z.number().nullable().optional(),

  buyer: z.string().nullable().optional(),
  seller: z.string().nullable().optional(),

  source: z.string().nullable().optional(),
  sourceUrl: z.string().nullable().optional(),
  confidence: CompConfidenceEnum,
  confidential: z.boolean(),

  notes: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).transform((c) => ({
  ...c,
  propertyName: c.propertyName ?? null,
  buildingAddress: c.buildingAddress ?? null,
  market: c.market ?? null,
  propertyType: c.propertyType ?? null,
  buildingType: c.buildingType ?? null,
  saleDate: c.saleDate ?? null,
  salePrice: c.salePrice ?? null,
  pricePSF: c.pricePSF ?? null,
  capRate: c.capRate ?? null,
  noi: c.noi ?? null,
  buildingSF: c.buildingSF ?? null,
  landAcres: c.landAcres ?? null,
  yearBuilt: c.yearBuilt ?? null,
  occupancyPct: c.occupancyPct ?? null,
  buyer: c.buyer ?? null,
  seller: c.seller ?? null,
  source: c.source ?? null,
  sourceUrl: c.sourceUrl ?? null,
  notes: c.notes ?? null,
}));

export type SalesComp = z.infer<typeof SalesCompSchema>;

// ──────────────────────────────────────────────────────────────────
// Asset Management Pending Items — operating to-do list across the
// portfolio. One table covers all 5 playbook categories.
// ──────────────────────────────────────────────────────────────────

export const AMItemTypeEnum = z.enum([
  'Deliverable',
  'Construction Followup',
  'Tenant Request',
  'Building Monitoring',
  'Capital Vendor',
  'Insurance',
  'Operating Budget',
  'CAM Reconciliation',
  'Valuation',
  'Cash Management',
  'Reporting',
  'LP Approval',
  'Lease Renewal',
]);
export type AMItemType = z.infer<typeof AMItemTypeEnum>;

export const AMCadenceEnum = z.enum([
  'One-Time',
  'Monthly',
  'Quarterly',
  'Bi-Annual',
  'Annual',
]);
export type AMCadence = z.infer<typeof AMCadenceEnum>;

export const AMStatusEnum = z.enum([
  'Open',
  'In Progress',
  'Waiting',
  'Done',
  'Cancelled',
]);
export type AMStatus = z.infer<typeof AMStatusEnum>;

// Statuses that mean the item is no longer outstanding.
export const AM_OPEN_STATUSES: AMStatus[] = ['Open', 'In Progress', 'Waiting'];

export const AMPendingItemSchema = z.object({
  id: z.string().uuid(),

  itemType: AMItemTypeEnum,
  title: z.string().min(1, 'Title is required'),
  description: z.string().nullable().optional(),

  buildingId: z.string().nullable().optional(),
  buildingName: z.string().nullable().optional(),
  dealId: z.string().nullable().optional(),
  dealName: z.string().nullable().optional(),

  owner: z.string().nullable().optional(),
  status: AMStatusEnum,
  priority: PriorityEnum,
  dueDate: z.string().nullable().optional(),
  completedDate: z.string().nullable().optional(),

  source: z.string().nullable().optional(),
  link: z.string().nullable().optional(),

  cadence: AMCadenceEnum.default('One-Time'),
  sentToTab: z.string().nullable().optional(),
  sentToId: z.string().nullable().optional(),

  notes: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).transform((i) => ({
  ...i,
  description: i.description ?? null,
  buildingId: i.buildingId ?? null,
  buildingName: i.buildingName ?? null,
  dealId: i.dealId ?? null,
  dealName: i.dealName ?? null,
  owner: i.owner ?? null,
  dueDate: i.dueDate ?? null,
  completedDate: i.completedDate ?? null,
  source: i.source ?? null,
  link: i.link ?? null,
  sentToTab: i.sentToTab ?? null,
  sentToId: i.sentToId ?? null,
  notes: i.notes ?? null,
}));

export type AMPendingItem = z.infer<typeof AMPendingItemSchema>;

// ──────────────────────────────────────────────────────────────────
// Contacts — CRM v1 (first slice of ParceCRM integration).
// People involved with dev projects, deals, properties. Multi-phone
// + multi-email stored as JSONB arrays for single-row reads. The
// many-to-many link to development_projects lives in its own table
// (DevProjectContactSchema below).
// ──────────────────────────────────────────────────────────────────

export const ContactTypeEnum = z.enum([
  'Owner',
  'Broker',
  'Attorney',
  'Title Agent',
  'Consultant',
  'GC',
  'Architect',
  'Other',
]);
export type ContactType = z.infer<typeof ContactTypeEnum>;

export const ContactChannelLabelEnum = z.enum(['mobile', 'work', 'home', 'other']);
export type ContactChannelLabel = z.infer<typeof ContactChannelLabelEnum>;

export const ContactChannelSchema = z.object({
  label: ContactChannelLabelEnum,
  value: z.string().min(1),
  isPrimary: z.boolean().default(false),
});
export type ContactChannel = z.infer<typeof ContactChannelSchema>;

export const ContactSchema = z.object({
  id: z.string().uuid(),

  contactType: ContactTypeEnum,
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  companyName: z.string().nullable().optional(),
  title: z.string().nullable().optional(),

  phones: z.array(ContactChannelSchema).default([]),
  emails: z.array(ContactChannelSchema).default([]),

  notes: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).transform((c) => ({
  ...c,
  firstName: c.firstName ?? null,
  lastName: c.lastName ?? null,
  companyName: c.companyName ?? null,
  title: c.title ?? null,
  notes: c.notes ?? null,
}));

export type Contact = z.infer<typeof ContactSchema>;

// Display label: "Lastname, Firstname" or company if no person, with
// company suffix when both present. Centralized so the picker, badge,
// and drawer all agree.
export function contactDisplayName(c: Pick<Contact, 'firstName' | 'lastName' | 'companyName'>): string {
  const personParts = [c.lastName, c.firstName].filter(Boolean) as string[];
  const person = personParts.length === 2 ? `${personParts[0]}, ${personParts[1]}` : personParts[0] ?? '';
  if (person && c.companyName) return `${person} (${c.companyName})`;
  return person || c.companyName || '(unnamed)';
}

// ──────────────────────────────────────────────────────────────────
// Dev Project ↔ Contact link.
// ──────────────────────────────────────────────────────────────────
export const DevProjectContactSchema = z.object({
  id: z.string().uuid(),
  devProjectId: z.string(),
  contactId: z.string(),

  // Optional override — if a Broker contact is acting in a different
  // role on this specific project, set roleOverride. Display falls
  // back to the contact's own contactType.
  roleOverride: ContactTypeEnum.nullable().optional(),
  isPrimary: z.boolean().default(false),
  linkNotes: z.string().nullable().optional(),

  createdAt: z.string(),
  updatedAt: z.string(),
}).transform((r) => ({
  ...r,
  roleOverride: r.roleOverride ?? null,
  linkNotes: r.linkNotes ?? null,
}));

export type DevProjectContact = z.infer<typeof DevProjectContactSchema>;

// ──────────────────────────────────────────────────────────────────
// Dev Project Notes — activity log scoped to development_projects.
// Mirrors the activities table for deals/rent_roll but with the
// ParceCRM note_type taxonomy (call/meeting/site visit/research/
// feasibility).
// ──────────────────────────────────────────────────────────────────

export const DevNoteTypeEnum = z.enum([
  'General',
  'Call Log',
  'Meeting',
  'Site Visit',
  'Research',
  'Feasibility',
]);
export type DevNoteType = z.infer<typeof DevNoteTypeEnum>;

export const DevProjectNoteSchema = z.object({
  id: z.string().uuid(),
  devProjectId: z.string(),

  noteType: DevNoteTypeEnum,
  eventDate: z.string().nullable().optional(),
  content: z.string().min(1, 'Note content is required'),
  author: z.string().nullable().optional(),
  link: z.string().nullable().optional(),

  createdAt: z.string(),
  updatedAt: z.string(),
}).transform((n) => ({
  ...n,
  eventDate: n.eventDate ?? null,
  author: n.author ?? null,
  link: n.link ?? null,
}));

export type DevProjectNote = z.infer<typeof DevProjectNoteSchema>;

// ──────────────────────────────────────────────────────────────────
// Acquisition Targets — opportunities being chased. Sourcing →
// Pursuing → LOI → PSA → Closing → Closed / Lost / On Hold.
// Mirrors DevelopmentProject's shape so the same workflow patterns
// (phase-grouped board, drawer, contacts + notes) apply.
// ──────────────────────────────────────────────────────────────────

export const AcquisitionStatusEnum = z.enum([
  'Sourcing',
  'Pursuing',
  'LOI',
  'PSA',
  'Closing',
  'Closed',
  'Lost',
  'On Hold',
]);
export type AcquisitionStatus = z.infer<typeof AcquisitionStatusEnum>;

export const ACQ_PIPELINE_ORDER: AcquisitionStatus[] = [
  'Sourcing',
  'Pursuing',
  'LOI',
  'PSA',
  'Closing',
  'Closed',
];

export const AcquisitionTargetSchema = z.object({
  id: z.string().uuid(),

  targetName: z.string().min(1, 'Target name is required'),
  market: z.string().nullable().optional(),
  submarket: z.string().nullable().optional(),
  county: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  propertyType: z.string().nullable().optional(),

  status: AcquisitionStatusEnum,

  acres: z.number().positive().nullable().optional(),
  buildingCount: z.number().int().positive().nullable().optional(),
  totalSF: z.number().positive().nullable().optional(),

  askingPrice: z.number().min(0).nullable().optional(),
  ourOffer: z.number().min(0).nullable().optional(),
  earnestMoney: z.number().min(0).nullable().optional(),
  closingCostsEstimate: z.number().nullable().optional(),
  rehabBudget: z.number().nullable().optional(),
  // Both stored as fractions: 0.15 = 15% IRR, 2.0 = 2.0x equity multiple
  underwrittenIRR: z.number().nullable().optional(),
  underwrittenEquityMultiple: z.number().nullable().optional(),

  firstContactedDate: z.string().nullable().optional(),
  loiDate: z.string().nullable().optional(),
  psaDate: z.string().nullable().optional(),
  expectedClosingDate: z.string().nullable().optional(),
  actualClosingDate: z.string().nullable().optional(),

  diligenceStatus: z.record(z.string(), z.unknown()).default({}),

  riskLevel: RiskLevelEnum,
  statusSummary: z.string().nullable().optional(),

  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),

  notes: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).transform((a) => ({
  ...a,
  market: a.market ?? null,
  submarket: a.submarket ?? null,
  county: a.county ?? null,
  city: a.city ?? null,
  address: a.address ?? null,
  propertyType: a.propertyType ?? null,
  acres: a.acres ?? null,
  buildingCount: a.buildingCount ?? null,
  totalSF: a.totalSF ?? null,
  askingPrice: a.askingPrice ?? null,
  ourOffer: a.ourOffer ?? null,
  earnestMoney: a.earnestMoney ?? null,
  closingCostsEstimate: a.closingCostsEstimate ?? null,
  rehabBudget: a.rehabBudget ?? null,
  underwrittenIRR: a.underwrittenIRR ?? null,
  underwrittenEquityMultiple: a.underwrittenEquityMultiple ?? null,
  firstContactedDate: a.firstContactedDate ?? null,
  loiDate: a.loiDate ?? null,
  psaDate: a.psaDate ?? null,
  expectedClosingDate: a.expectedClosingDate ?? null,
  actualClosingDate: a.actualClosingDate ?? null,
  statusSummary: a.statusSummary ?? null,
  lat: a.lat ?? null,
  lng: a.lng ?? null,
  notes: a.notes ?? null,
}));

export type AcquisitionTarget = z.infer<typeof AcquisitionTargetSchema>;

// Same shapes as DevProjectContact / DevProjectNote — different parent.
export const AcquisitionTargetContactSchema = z.object({
  id: z.string().uuid(),
  acquisitionTargetId: z.string(),
  contactId: z.string(),
  roleOverride: ContactTypeEnum.nullable().optional(),
  isPrimary: z.boolean().default(false),
  linkNotes: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).transform((r) => ({
  ...r,
  roleOverride: r.roleOverride ?? null,
  linkNotes: r.linkNotes ?? null,
}));

export type AcquisitionTargetContact = z.infer<typeof AcquisitionTargetContactSchema>;

export const AcquisitionTargetNoteSchema = z.object({
  id: z.string().uuid(),
  acquisitionTargetId: z.string(),
  noteType: DevNoteTypeEnum,  // Reuses Dev's taxonomy — same set of activity types
  eventDate: z.string().nullable().optional(),
  content: z.string().min(1, 'Note content is required'),
  author: z.string().nullable().optional(),
  link: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).transform((n) => ({
  ...n,
  eventDate: n.eventDate ?? null,
  author: n.author ?? null,
  link: n.link ?? null,
}));

export type AcquisitionTargetNote = z.infer<typeof AcquisitionTargetNoteSchema>;

// ──────────────────────────────────────────────────────────────────
// Disposition Listings — sells we're running. Considering →
// Underwriting → Marketing → Under Contract → Closed / Pulled.
// Same template as AcquisitionTarget — different status set + a
// few disposition-specific economics (NOI / cap rate / net proceeds).
// ──────────────────────────────────────────────────────────────────

export const DispositionStatusEnum = z.enum([
  'Considering',
  'Underwriting',
  'Marketing',
  'Under Contract',
  'Closed',
  'Pulled',
  'On Hold',
]);
export type DispositionStatus = z.infer<typeof DispositionStatusEnum>;

export const DISPO_PIPELINE_ORDER: DispositionStatus[] = [
  'Considering',
  'Underwriting',
  'Marketing',
  'Under Contract',
  'Closed',
];

export const DispositionListingSchema = z.object({
  id: z.string().uuid(),
  assetName: z.string().min(1, 'Asset name is required'),
  buildingId: z.string().nullable().optional(),
  market: z.string().nullable().optional(),
  submarket: z.string().nullable().optional(),
  county: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  propertyType: z.string().nullable().optional(),

  status: DispositionStatusEnum,

  totalSF: z.number().positive().nullable().optional(),
  acres: z.number().positive().nullable().optional(),
  // Stored as fraction (0.93 for 93% occupied)
  occupancyPct: z.number().min(0).max(1).nullable().optional(),

  trailingNOI: z.number().nullable().optional(),
  forwardNOI: z.number().nullable().optional(),
  listPrice: z.number().min(0).nullable().optional(),
  // Stored as fraction (0.06 for 6%)
  listCapPct: z.number().nullable().optional(),
  achievedPrice: z.number().min(0).nullable().optional(),
  achievedCapPct: z.number().nullable().optional(),
  netProceeds: z.number().nullable().optional(),
  brokerCommissionPct: z.number().nullable().optional(),

  listDate: z.string().nullable().optional(),
  bidsDueDate: z.string().nullable().optional(),
  loiExecutedDate: z.string().nullable().optional(),
  psaExecutedDate: z.string().nullable().optional(),
  expectedClosingDate: z.string().nullable().optional(),
  actualClosingDate: z.string().nullable().optional(),

  riskLevel: RiskLevelEnum,
  statusSummary: z.string().nullable().optional(),

  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),

  notes: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).transform((d) => ({
  ...d,
  buildingId: d.buildingId ?? null,
  market: d.market ?? null,
  submarket: d.submarket ?? null,
  county: d.county ?? null,
  city: d.city ?? null,
  address: d.address ?? null,
  propertyType: d.propertyType ?? null,
  totalSF: d.totalSF ?? null,
  acres: d.acres ?? null,
  occupancyPct: d.occupancyPct ?? null,
  trailingNOI: d.trailingNOI ?? null,
  forwardNOI: d.forwardNOI ?? null,
  listPrice: d.listPrice ?? null,
  listCapPct: d.listCapPct ?? null,
  achievedPrice: d.achievedPrice ?? null,
  achievedCapPct: d.achievedCapPct ?? null,
  netProceeds: d.netProceeds ?? null,
  brokerCommissionPct: d.brokerCommissionPct ?? null,
  listDate: d.listDate ?? null,
  bidsDueDate: d.bidsDueDate ?? null,
  loiExecutedDate: d.loiExecutedDate ?? null,
  psaExecutedDate: d.psaExecutedDate ?? null,
  expectedClosingDate: d.expectedClosingDate ?? null,
  actualClosingDate: d.actualClosingDate ?? null,
  statusSummary: d.statusSummary ?? null,
  lat: d.lat ?? null,
  lng: d.lng ?? null,
  notes: d.notes ?? null,
}));

export type DispositionListing = z.infer<typeof DispositionListingSchema>;

export const DispositionListingContactSchema = z.object({
  id: z.string().uuid(),
  dispositionListingId: z.string(),
  contactId: z.string(),
  roleOverride: ContactTypeEnum.nullable().optional(),
  isPrimary: z.boolean().default(false),
  linkNotes: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).transform((r) => ({
  ...r,
  roleOverride: r.roleOverride ?? null,
  linkNotes: r.linkNotes ?? null,
}));

export type DispositionListingContact = z.infer<typeof DispositionListingContactSchema>;

export const DispositionListingNoteSchema = z.object({
  id: z.string().uuid(),
  dispositionListingId: z.string(),
  noteType: DevNoteTypeEnum,
  eventDate: z.string().nullable().optional(),
  content: z.string().min(1, 'Note content is required'),
  author: z.string().nullable().optional(),
  link: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).transform((n) => ({
  ...n,
  eventDate: n.eventDate ?? null,
  author: n.author ?? null,
  link: n.link ?? null,
}));

export type DispositionListingNote = z.infer<typeof DispositionListingNoteSchema>;
