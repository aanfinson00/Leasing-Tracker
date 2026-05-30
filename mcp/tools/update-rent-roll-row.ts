// =============================================================================
// Tool: update_rent_roll_row
// =============================================================================

import { z } from 'zod';
import { getServiceClient } from '../db.js';
import type { AuthedToken } from '../auth.js';
import { toMcpInputSchema } from '../lib/zod-input.js';

const argsSchema = z
  .object({
    id: z.string().describe('UUID of the rent_roll row.'),
    tenantName: z.string().nullable().optional(),
    tenantRating: z.string().describe('AAA / AA / A / BBB / BB / B / NR / Unrated / Private / Govt').nullable().optional(),
    occupied: z.boolean().optional(),
    leasableSF: z.number().nullable().optional(),
    leaseStart: z.string().describe('YYYY-MM-DD').nullable().optional(),
    leaseEnd: z.string().describe('YYYY-MM-DD').nullable().optional(),
    leaseTermMonths: z.number().int().nullable().optional(),
    freeRentMonths: z.number().int().nullable().optional(),
    annualRentBumpsPct: z.number().nullable().optional(),
    tiPerSF: z.number().nullable().optional(),
    tiNote: z.string().nullable().optional(),
    startingAnnualRentPSF: z.number().nullable().optional(),
    currentSummary: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .strict();

type Args = z.infer<typeof argsSchema>;

const MAP: Record<string, string> = {
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

export const updateRentRollRowTool = {
  name: 'update_rent_roll_row',
  description:
    'Patch one rent_roll row. Use when the user wants to update lease terms, ' +
    'TI/LC, rent, tenant info, or notes on a specific space. Identify the row ' +
    'first via list_rent_roll. Only fields you pass are touched; omit to leave alone.',
  inputSchema: toMcpInputSchema(argsSchema),

  async handler(args: Args, _token: AuthedToken) {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const [camel, snake] of Object.entries(MAP)) {
      if (camel in args) patch[snake] = (args as Record<string, unknown>)[camel];
    }
    if (Object.keys(patch).length === 1) {
      throw new Error('update_rent_roll_row: no fields to update — pass at least one column');
    }

    const sb = getServiceClient();
    const { data, error } = await sb
      .from('rent_roll')
      .update(patch)
      .eq('id', args.id)
      .select('*')
      .single();
    if (error) throw new Error(`update_rent_roll_row failed: ${error.message}`);
    if (!data) throw new Error(`rent_roll row ${args.id} not found`);

    return { updated: data, patched_fields: Object.keys(patch).filter((k) => k !== 'updated_at') };
  },
} as const;
