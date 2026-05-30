// =============================================================================
// Tool: create_deal
//
// Insert a new row into `deals`. Required: dealName. Server-controlled:
// id (uuid), createdAt/updatedAt (DB defaults), lastUpdated (today).
// =============================================================================

import { randomUUID } from 'node:crypto';
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
    dealName: z.string().min(1).describe('Deal name (required) — typically the property name'),
    prospectTenant: z.string().optional(),
    brokerRep: z.string().describe('Brokerage name or rep, e.g. "JLL", "Cushman", "CBRE"').optional(),
    building: z.string().optional(),
    dealId: z.string().describe('Internal deal code (e.g. "4001 · 400103"), distinct from the DB uuid').optional(),
    spaceId: z.string().optional(),
    transaction: z.string().describe('e.g. "New Lease", "Renewal", "BTS"').optional(),
    status: z.enum(DEAL_STATUSES).describe('Defaults to "New Prospect" if omitted').optional(),
    minSF: z.number().int().min(0).optional(),
    maxSF: z.number().int().min(0).optional(),
    targetRent: z.number().describe('$/SF/yr').optional(),
    proposedTermMonths: z.number().int().min(0).optional(),
    freeRentMonths: z.number().int().min(0).optional(),
    tiPerSF: z.number().optional(),
    tiNote: z.string().optional(),
    probabilityPct: z.number().min(0).max(100).optional(),
    expectedStart: z.string().describe('ISO YYYY-MM-DD').optional(),
    priority: z.enum(PRIORITIES).describe('Defaults to "Low" if omitted').optional(),
    notes: z.string().optional(),
    currentSummary: z.string().optional(),
    sharepointUrl: z.string().describe('SharePoint folder URL for this deal').optional(),
  })
  .strict();

type Args = z.infer<typeof argsSchema>;

export const createDealTool = {
  name: 'create_deal',
  description:
    'Create a new deal in the Leasing-Tracker pipeline. Use when the user wants ' +
    'to log a new prospect, broker tour request, or RFP. Only dealName is required.',
  inputSchema: toMcpInputSchema(argsSchema),

  async handler(args: Args, _token: AuthedToken) {
    const today = new Date().toISOString().slice(0, 10);
    const row = {
      id: randomUUID(),
      deal_name: args.dealName.trim(),
      prospect_tenant: args.prospectTenant ?? null,
      broker_rep: args.brokerRep ?? null,
      building: args.building ?? null,
      deal_id: args.dealId ?? null,
      space_id: args.spaceId ?? null,
      transaction: args.transaction ?? null,
      status: args.status ?? 'New Prospect',
      min_sf: args.minSF ?? null,
      max_sf: args.maxSF ?? args.minSF ?? null,
      target_rent: args.targetRent ?? null,
      proposed_term_months: args.proposedTermMonths ?? null,
      free_rent_months: args.freeRentMonths ?? null,
      ti_per_sf: args.tiPerSF ?? null,
      ti_note: args.tiNote ?? null,
      probability_pct: args.probabilityPct ?? null,
      expected_start: args.expectedStart ?? null,
      last_updated: today,
      priority: args.priority ?? 'Low',
      current_summary: args.currentSummary ?? null,
      notes: args.notes ?? null,
      sharepoint_url: args.sharepointUrl ?? null,
      last_reval_uw_rent: null,
      lat: null,
      lng: null,
    };

    const sb = getServiceClient();
    const { data, error } = await sb.from('deals').insert(row).select('*').single();
    if (error) throw new Error(`Insert failed: ${error.message}`);

    return {
      ok: true,
      deal: data,
      message: `Created deal "${row.deal_name}" with status "${row.status}".`,
    };
  },
} as const;
