// =============================================================================
// Tool: update_deal
//
// Patch one deal. Caller supplies dealId + any subset of mutable fields.
// Common use case: a broker proposal email arrives and the user wants to
// update rent, term, free rent, TI, status in one call.
//
// Server-controlled (not patchable): id, createdAt, updatedAt (DB-managed).
// `lastUpdated` is auto-bumped to today whenever the row changes.
//
// Caveat noted in mcp/README.md: the app's auto-promote-on-Executed hook
// lives in App.tsx onSave, so flipping `status` to 'Executed' via the MCP
// won't open the PromoteDrawer for users with the app open — they'll see
// the status change via Realtime but have to open the drawer manually.
// Use the (future) `promote_deal_to_rent_roll` tool when full auto-promote
// is the intent.
// =============================================================================

import { getServiceClient } from '../db';
import type { AuthedToken } from '../auth';

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

interface UpdateDealArgs {
  dealId: string;
  // Every field below is optional; presence in the args object = patch it.
  dealName?: string;
  prospectTenant?: string | null;
  brokerRep?: string | null;
  building?: string | null;
  dealCode?: string | null;
  spaceId?: string | null;
  transaction?: string | null;
  status?: typeof DEAL_STATUSES[number];
  minSF?: number | null;
  maxSF?: number | null;
  targetRent?: number | null;
  proposedTermMonths?: number | null;
  freeRentMonths?: number | null;
  tiPerSF?: number | null;
  tiNote?: string | null;
  probabilityPct?: number | null;
  expectedStart?: string | null;
  priority?: typeof PRIORITIES[number];
  notes?: string | null;
  currentSummary?: string | null;
  sharepointUrl?: string | null;
}

export const updateDealTool = {
  name: 'update_deal',
  description:
    'Patch an existing deal. Provide the dealId (DB uuid) plus any subset of fields ' +
    'to update — omitted fields stay as-is. Use when a broker email arrives with ' +
    'updated terms (rent, term, TI, free rent) or when status changes (e.g., ' +
    'Proposal Sent → LOI Negotiations). For Executed status flip, see ' +
    'promote_deal_to_rent_roll (future tool) — this one just sets status without ' +
    'opening the Promote drawer.',
  inputSchema: {
    type: 'object',
    properties: {
      dealId: { type: 'string', description: 'DB uuid of the deal (NOT the user-facing deal_id code). Use list_deals to find it.' },
      dealName: { type: 'string' },
      prospectTenant: { type: ['string', 'null'] },
      brokerRep: { type: ['string', 'null'] },
      building: { type: ['string', 'null'] },
      dealCode: { type: ['string', 'null'], description: 'User-facing deal code (e.g. "4001 · 400103") — maps to DB column deal_id' },
      spaceId: { type: ['string', 'null'] },
      transaction: { type: ['string', 'null'] },
      status: { type: 'string', enum: [...DEAL_STATUSES] },
      minSF: { type: ['integer', 'null'] },
      maxSF: { type: ['integer', 'null'] },
      targetRent: { type: ['number', 'null'] },
      proposedTermMonths: { type: ['integer', 'null'] },
      freeRentMonths: { type: ['integer', 'null'] },
      tiPerSF: { type: ['number', 'null'] },
      tiNote: { type: ['string', 'null'] },
      probabilityPct: { type: ['number', 'null'], minimum: 0, maximum: 100 },
      expectedStart: { type: ['string', 'null'] },
      priority: { type: 'string', enum: [...PRIORITIES] },
      notes: { type: ['string', 'null'] },
      currentSummary: { type: ['string', 'null'] },
      sharepointUrl: { type: ['string', 'null'] },
    },
    required: ['dealId'],
    additionalProperties: false,
  },

  async handler(args: UpdateDealArgs, _token: AuthedToken) {
    if (!args.dealId) throw new Error('dealId is required');

    // Translate camelCase → snake_case; only include keys the caller passed,
    // so partial patches stay partial.
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

    const patch: Record<string, unknown> = {};
    for (const [camel, snake] of Object.entries(PATCH_MAP)) {
      if (camel in args) patch[snake] = args[camel as keyof UpdateDealArgs];
    }

    if (Object.keys(patch).length === 0) {
      throw new Error('No patchable fields supplied — pass at least one field besides dealId.');
    }

    // Always bump lastUpdated whenever the row mutates.
    patch.last_updated = new Date().toISOString().slice(0, 10);

    const sb = getServiceClient();
    const { data, error } = await sb
      .from('deals')
      .update(patch)
      .eq('id', args.dealId)
      .select()
      .single();
    if (error) {
      throw new Error(`Update failed: ${error.message}`);
    }
    if (!data) {
      throw new Error(`No deal with id "${args.dealId}" — verify via list_deals first.`);
    }

    return {
      ok: true,
      deal: data,
      patchedFields: Object.keys(patch),
    };
  },
} as const;
