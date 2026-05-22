import { z } from 'zod';

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
  tenantRating: z.number().min(0).max(5).nullable().optional(),
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
