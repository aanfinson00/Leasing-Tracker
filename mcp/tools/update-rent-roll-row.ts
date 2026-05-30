// =============================================================================
// Tool: update_rent_roll_row
//
// Write tool. Patches a single rent_roll row by id. Only the fields the
// caller passes are touched — null is honored as "clear this", omitted means
// "leave alone". `updated_at` is auto-bumped.
// =============================================================================

import { getServiceClient } from '../db';
import type { AuthedToken } from '../auth';

export const updateRentRollRowTool = {
  name: 'update_rent_roll_row',
  description:
    'Patch one rent_roll row. Use when the user wants to update lease terms, ' +
    'TI/LC, rent, tenant info, or notes on a specific space. Identify the row ' +
    'first via list_rent_roll. Only fields you pass are touched; omit to leave alone.',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'UUID of the rent_roll row.' },
      tenantName: { type: ['string', 'null'] },
      tenantRating: {
        type: ['string', 'null'],
        description: 'AAA / AA / A / BBB / BB / B / NR / Unrated / Private / Govt',
      },
      occupied: { type: 'boolean' },
      leasableSF: { type: ['number', 'null'] },
      leaseStart: { type: ['string', 'null'], description: 'YYYY-MM-DD' },
      leaseEnd: { type: ['string', 'null'], description: 'YYYY-MM-DD' },
      leaseTermMonths: { type: ['integer', 'null'] },
      freeRentMonths: { type: ['integer', 'null'] },
      annualRentBumpsPct: { type: ['number', 'null'] },
      tiPerSF: { type: ['number', 'null'] },
      tiNote: { type: ['string', 'null'] },
      startingAnnualRentPSF: { type: ['number', 'null'] },
      currentSummary: { type: ['string', 'null'] },
      notes: { type: ['string', 'null'] },
    },
    required: ['id'],
    additionalProperties: false,
  },

  async handler(
    args: {
      id: string;
      tenantName?: string | null;
      tenantRating?: string | null;
      occupied?: boolean;
      leasableSF?: number | null;
      leaseStart?: string | null;
      leaseEnd?: string | null;
      leaseTermMonths?: number | null;
      freeRentMonths?: number | null;
      annualRentBumpsPct?: number | null;
      tiPerSF?: number | null;
      tiNote?: string | null;
      startingAnnualRentPSF?: number | null;
      currentSummary?: string | null;
      notes?: string | null;
    },
    _token: AuthedToken
  ) {
    const sb = getServiceClient();

    // camelCase → snake_case for the columns we accept
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const map: Record<string, string> = {
      tenantName: 'tenant_name',
      tenantRating: 'tenant_rating',
      occupied: 'occupied',
      leasableSF: 'leasable_sf',
      leaseStart: 'lease_start',
      leaseEnd: 'lease_end',
      leaseTermMonths: 'lease_term_months',
      freeRentMonths: 'free_rent_months',
      annualRentBumpsPct: 'annual_rent_bumps_pct',
      tiPerSF: 'ti_per_sf',
      tiNote: 'ti_note',
      startingAnnualRentPSF: 'starting_annual_rent_psf',
      currentSummary: 'current_summary',
      notes: 'notes',
    };
    for (const [k, col] of Object.entries(map)) {
      if (k in args) patch[col] = (args as Record<string, unknown>)[k];
    }

    if (Object.keys(patch).length === 1) {
      throw new Error('update_rent_roll_row: no fields to update — pass at least one column');
    }

    const { data, error } = await sb
      .from('rent_roll')
      .update(patch)
      .eq('id', args.id)
      .select('id, tenant_name, space_id, building, occupied, lease_end, starting_annual_rent_psf')
      .single();

    if (error) throw new Error(`update_rent_roll_row failed: ${error.message}`);
    if (!data) throw new Error(`rent_roll row ${args.id} not found`);

    return { updated: data, patched_fields: Object.keys(patch).filter((k) => k !== 'updated_at') };
  },
} as const;
