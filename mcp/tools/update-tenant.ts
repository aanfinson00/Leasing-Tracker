// =============================================================================
// Tool: update_tenant
// Patch a rent_roll row. Cashflow projection untouched — use Session 4+
// promote_deal_to_rent_roll when you want it recomputed.
// =============================================================================

import { z } from 'zod';
import { getServiceClient } from '../db';
import type { AuthedToken } from '../auth';
import { toMcpInputSchema } from '../lib/zod-input';

const argsSchema = z
  .object({
    tenantId: z.string().describe('DB uuid of the rent_roll row. Use list_tenants to find it.'),
    tenantName: z.string().nullable().optional(),
    occupied: z.boolean().optional(),
    leasableSF: z.number().nullable().optional(),
    leaseStart: z.string().describe('ISO YYYY-MM-DD').nullable().optional(),
    leaseTermMonths: z.number().int().nullable().optional(),
    leaseEnd: z.string().describe('ISO YYYY-MM-DD').nullable().optional(),
    startingAnnualRentPSF: z.number().nullable().optional(),
    freeRentMonths: z.number().int().nullable().optional(),
    annualRentBumpsPct: z.number().describe('3 for 3%/yr or 0.03; tool accepts either').nullable().optional(),
    tiPerSF: z.number().nullable().optional(),
    tiNote: z.string().nullable().optional(),
    securityDeposit: z.number().describe('Dollars').nullable().optional(),
    rentCommencementDate: z.string().nullable().optional(),
    tenantRating: z.string().describe('Credit rating string (e.g. "BBB+", "NR", "Unrated / Private")').nullable().optional(),
    market: z.string().nullable().optional(),
    propertyType: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    sharepointUrl: z.string().nullable().optional(),
  })
  .strict();

type Args = z.infer<typeof argsSchema>;

const MAP: Record<string, string> = {
  tenantName: 'tenant_name',
  occupied: 'occupied',
  leasableSF: 'leasable_sf',
  leaseStart: 'lease_start',
  leaseTermMonths: 'lease_term_months',
  leaseEnd: 'lease_end',
  startingAnnualRentPSF: 'starting_annual_rent_psf',
  freeRentMonths: 'free_rent_months',
  annualRentBumpsPct: 'annual_rent_bumps_pct',
  tiPerSF: 'ti_per_sf',
  tiNote: 'ti_note',
  securityDeposit: 'security_deposit',
  rentCommencementDate: 'rent_commencement_date',
  tenantRating: 'tenant_rating',
  market: 'market',
  propertyType: 'property_type',
  notes: 'notes',
  sharepointUrl: 'sharepoint_url',
};

export const updateTenantTool = {
  name: 'update_tenant',
  description:
    'Patch a rent_roll row (tenant). Provide tenantId (DB uuid) plus any subset ' +
    'of fields. Use after a lease renewal, an amendment, or when finalizing lease details.',
  inputSchema: toMcpInputSchema(argsSchema),

  async handler(args: Args, _token: AuthedToken) {
    const patch: Record<string, unknown> = {};
    for (const [camel, snake] of Object.entries(MAP)) {
      if (camel in args) patch[snake] = (args as Record<string, unknown>)[camel];
    }
    if (Object.keys(patch).length === 0) {
      throw new Error('Pass at least one field besides tenantId.');
    }

    const sb = getServiceClient();
    const { data, error } = await sb
      .from('rent_roll')
      .update(patch)
      .eq('id', args.tenantId)
      .select('*')
      .single();
    if (error) throw new Error(`Update failed: ${error.message}`);
    if (!data) throw new Error(`No tenant with id "${args.tenantId}".`);

    return { ok: true, tenant: data, patchedFields: Object.keys(patch) };
  },
} as const;
