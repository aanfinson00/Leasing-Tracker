// =============================================================================
// Tool: update_tenant
// Patch a rent_roll row. The shape of patchable fields matches the
// RentRollDrawer form, minus the cashflow projection (which is computed
// at promote time from the structured terms — set those instead).
// =============================================================================

import { getServiceClient } from '../db';
import type { AuthedToken } from '../auth';

interface UpdateTenantArgs {
  tenantId: string;
  tenantName?: string | null;
  occupied?: boolean;
  leasableSF?: number | null;
  leaseStart?: string | null;
  leaseTermMonths?: number | null;
  leaseEnd?: string | null;
  startingAnnualRentPSF?: number | null;
  freeRentMonths?: number | null;
  annualRentBumpsPct?: number | null;
  tiPerSF?: number | null;
  tiNote?: string | null;
  securityDeposit?: number | null;
  rentCommencementDate?: string | null;
  tenantRating?: string | null;
  market?: string | null;
  propertyType?: string | null;
  notes?: string | null;
  sharepointUrl?: string | null;
}

export const updateTenantTool = {
  name: 'update_tenant',
  description:
    'Patch a rent_roll row (tenant). Provide tenantId (DB uuid) plus any subset ' +
    'of fields. Use after a lease renewal, an amendment, or when finalizing ' +
    'lease commencement details. Leaves cashflow_json untouched — use the ' +
    'promote_deal_to_rent_roll tool (Session 4+) when you want the cashflow ' +
    'projection recomputed.',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: { type: 'string', description: 'DB uuid of the rent_roll row. Use list_tenants to find it.' },
      tenantName: { type: ['string', 'null'] },
      occupied: { type: 'boolean' },
      leasableSF: { type: ['number', 'null'] },
      leaseStart: { type: ['string', 'null'], description: 'ISO YYYY-MM-DD' },
      leaseTermMonths: { type: ['integer', 'null'] },
      leaseEnd: { type: ['string', 'null'], description: 'ISO YYYY-MM-DD' },
      startingAnnualRentPSF: { type: ['number', 'null'] },
      freeRentMonths: { type: ['integer', 'null'] },
      annualRentBumpsPct: { type: ['number', 'null'], description: '3 for 3%/yr or 0.03; tool accepts either' },
      tiPerSF: { type: ['number', 'null'] },
      tiNote: { type: ['string', 'null'] },
      securityDeposit: { type: ['number', 'null'], description: 'Dollars' },
      rentCommencementDate: { type: ['string', 'null'] },
      tenantRating: { type: ['string', 'null'], description: 'Credit rating string (e.g. "BBB+", "NR", "Unrated / Private")' },
      market: { type: ['string', 'null'] },
      propertyType: { type: ['string', 'null'] },
      notes: { type: ['string', 'null'] },
      sharepointUrl: { type: ['string', 'null'] },
    },
    required: ['tenantId'],
    additionalProperties: false,
  },

  async handler(args: UpdateTenantArgs, _token: AuthedToken) {
    if (!args.tenantId) throw new Error('tenantId is required');

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

    const patch: Record<string, unknown> = {};
    for (const [camel, snake] of Object.entries(MAP)) {
      if (camel in args) patch[snake] = args[camel as keyof UpdateTenantArgs];
    }
    if (Object.keys(patch).length === 0) {
      throw new Error('Pass at least one field besides tenantId.');
    }

    const sb = getServiceClient();
    const { data, error } = await sb
      .from('rent_roll')
      .update(patch)
      .eq('id', args.tenantId)
      .select()
      .single();
    if (error) throw new Error(`Update failed: ${error.message}`);
    if (!data) throw new Error(`No tenant with id "${args.tenantId}".`);

    return { ok: true, tenant: data, patchedFields: Object.keys(patch) };
  },
} as const;
