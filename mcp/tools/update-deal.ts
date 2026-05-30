// =============================================================================
// Tool: update_deal
//
// Patch one deal. Required: dealId. All other fields are optional;
// nullable to allow explicit clears. `last_updated` auto-bumped on any change.
// =============================================================================

import { z } from 'zod';
import { getServiceClient } from '../db';
import type { AuthedToken } from '../auth';
import { toMcpInputSchema } from '../lib/zod-input';

const DEAL_STATUSES = [
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
] as const;

const PRIORITIES = ['High', 'Medium', 'Low'] as const;

const argsSchema = z
  .object({
    dealId: z.string().describe('DB uuid of the deal (NOT the user-facing deal_id code). Use list_deals to find it.'),
    dealName: z.string().optional(),
    prospectTenant: z.string().nullable().optional(),
    brokerRep: z.string().nullable().optional(),
    building: z.string().nullable().optional(),
    dealCode: z.string().nullable().describe('User-facing deal code (e.g. "4001 · 400103") — maps to DB column deal_id').optional(),
    spaceId: z.string().nullable().optional(),
    transaction: z.string().nullable().optional(),
    status: z.enum(DEAL_STATUSES).optional(),
    minSF: z.number().int().nullable().optional(),
    maxSF: z.number().int().nullable().optional(),
    targetRent: z.number().nullable().optional(),
    proposedTermMonths: z.number().int().nullable().optional(),
    freeRentMonths: z.number().int().nullable().optional(),
    tiPerSF: z.number().nullable().optional(),
    tiNote: z.string().nullable().optional(),
    probabilityPct: z.number().min(0).max(100).nullable().optional(),
    expectedStart: z.string().nullable().optional(),
    priority: z.enum(PRIORITIES).optional(),
    notes: z.string().nullable().optional(),
    currentSummary: z.string().nullable().optional(),
    sharepointUrl: z.string().nullable().optional(),
  })
  .strict();

type Args = z.infer<typeof argsSchema>;

const PATCH_MAP: Record<string, string> = {
  dealName: 'deal_name',
  prospectTenant: 'prospect_tenant',
  brokerRep: 'broker_rep',
  building: 'building',
  dealCode: 'deal_id',
  spaceId: 'space_id',
  transaction: 'transaction',
  status: 'status',
  minSF: 'min_sf',
  maxSF: 'max_sf',
  targetRent: 'target_rent',
  proposedTermMonths: 'proposed_term_months',
  freeRentMonths: 'free_rent_months',
  tiPerSF: 'ti_per_sf',
  tiNote: 'ti_note',
  probabilityPct: 'probability_pct',
  expectedStart: 'expected_start',
  priority: 'priority',
  notes: 'notes',
  currentSummary: 'current_summary',
  sharepointUrl: 'sharepoint_url',
};

export const updateDealTool = {
  name: 'update_deal',
  description:
    'Patch an existing deal. Provide the dealId (DB uuid) plus any subset of fields ' +
    'to update — omitted fields stay as-is. Pass null to explicitly clear a field. ' +
    'Use when a broker email arrives with updated terms or when status changes.',
  inputSchema: toMcpInputSchema(argsSchema),

  async handler(args: Args, _token: AuthedToken) {
    const patch: Record<string, unknown> = {};
    for (const [camel, snake] of Object.entries(PATCH_MAP)) {
      if (camel in args) patch[snake] = (args as Record<string, unknown>)[camel];
    }
    if (Object.keys(patch).length === 0) {
      throw new Error('No patchable fields supplied — pass at least one field besides dealId.');
    }
    patch.last_updated = new Date().toISOString().slice(0, 10);

    const sb = getServiceClient();
    const { data, error } = await sb
      .from('deals')
      .update(patch)
      .eq('id', args.dealId)
      .select('*')
      .single();
    if (error) throw new Error(`Update failed: ${error.message}`);
    if (!data) throw new Error(`No deal with id "${args.dealId}" — verify via list_deals first.`);

    return { ok: true, deal: data, patchedFields: Object.keys(patch) };
  },
} as const;
