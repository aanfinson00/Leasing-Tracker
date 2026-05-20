import { z } from 'zod';

export const DealStatusEnum = z.enum([
  'Prospect',
  'RFP Out',
  'RFP for Approval',
  'On Hold',
  'Executed',
  'Lost',
]);
export type DealStatus = z.infer<typeof DealStatusEnum>;

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

  // Meta
  lastUpdated: z.string().nullable().optional(),
  priority: PriorityEnum,
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
  lastUpdated: d.lastUpdated ?? null,
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
  expiryYearBucket: z.string().nullable().optional(),

  // TI & commissions
  tiPerSF: z.number().nullable().optional(),
  tiNote: z.string().nullable().optional(),
  specOffice: z.string().nullable().optional(),
  commissionStructurePct: z.number().nullable().optional(),
  commissionDollar: z.number().nullable().optional(),

  // Rent
  lastRevalUWRent: z.number().nullable().optional(),
  startingAnnualRentPSF: z.number().nullable().optional(),
  inPlaceRent: z.number().nullable().optional(),
  annualRent: z.number().nullable().optional(),

  // Meta
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
  expiryYearBucket: r.expiryYearBucket ?? null,
  tiPerSF: r.tiPerSF ?? null,
  tiNote: r.tiNote ?? null,
  specOffice: r.specOffice ?? null,
  commissionStructurePct: r.commissionStructurePct ?? null,
  commissionDollar: r.commissionDollar ?? null,
  lastRevalUWRent: r.lastRevalUWRent ?? null,
  startingAnnualRentPSF: r.startingAnnualRentPSF ?? null,
  inPlaceRent: r.inPlaceRent ?? null,
  annualRent: r.annualRent ?? null,
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
  expiryYearBucket: null,
  tiPerSF: null,
  tiNote: null,
  specOffice: null,
  commissionStructurePct: null,
  commissionDollar: null,
  lastRevalUWRent: null,
  startingAnnualRentPSF: null,
  inPlaceRent: null,
  annualRent: null,
  notes: null,
});

const todayIso = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

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
  status: 'Prospect',
  lastRevalUWRent: null,
  targetRent: null,
  proposedTermMonths: null,
  freeRentMonths: null,
  tiPerSF: null,
  tiNote: null,
  probabilityPct: null,
  expectedStart: null,
  lastUpdated: todayIso(),
  priority: 'Low',
  notes: null,
});
