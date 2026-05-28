// =============================================================================
// Tool: create_deal
//
// First write tool. Insert a row into `deals` with sensible defaults so the
// caller only has to provide what they know.
//
// Required: dealName.
// Common args from "broker tour request" emails: prospectTenant, brokerRep,
// building, transaction, minSF, maxSF, targetRent, expectedStart.
//
// Server-controlled (caller cannot set): id (uuid), createdAt/updatedAt
// (DB defaults), lastUpdated (today).
// =============================================================================

import { randomUUID } from 'node:crypto';
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

interface CreateDealArgs {
  dealName: string;
  prospectTenant?: string;
  brokerRep?: string;
  building?: string;
  dealId?: string;          // user-facing deal code (NOT the DB uuid)
  spaceId?: string;
  transaction?: string;
  status?: typeof DEAL_STATUSES[number];
  minSF?: number;
  maxSF?: number;
  targetRent?: number;
  proposedTermMonths?: number;
  freeRentMonths?: number;
  tiPerSF?: number;
  tiNote?: string;
  probabilityPct?: number;
  expectedStart?: string;   // ISO YYYY-MM-DD
  priority?: typeof PRIORITIES[number];
  notes?: string;
  currentSummary?: string;
  sharepointUrl?: string;
}

export const createDealTool = {
  name: 'create_deal',
  description:
    'Create a new deal in the Leasing-Tracker pipeline. Use when the user wants ' +
    'to log a new prospect, broker tour request, or RFP. Only dealName is required; ' +
    'fill in whatever else is known. Returns the newly-created deal including its DB id.',
  inputSchema: {
    type: 'object',
    properties: {
      dealName: { type: 'string', minLength: 1, description: 'Deal name (required) — typically the property name' },
      prospectTenant: { type: 'string' },
      brokerRep: { type: 'string', description: 'Brokerage name or rep, e.g. "JLL", "Cushman", "CBRE"' },
      building: { type: 'string' },
      dealId: { type: 'string', description: 'Internal deal code (e.g. "4001 · 400103"), distinct from the DB uuid' },
      spaceId: { type: 'string' },
      transaction: { type: 'string', description: 'e.g. "New Lease", "Renewal", "BTS"' },
      status: { type: 'string', enum: [...DEAL_STATUSES], description: 'Defaults to "New Prospect" if omitted' },
      minSF: { type: 'integer', minimum: 0 },
      maxSF: { type: 'integer', minimum: 0 },
      targetRent: { type: 'number', description: '$/SF/yr' },
      proposedTermMonths: { type: 'integer', minimum: 0 },
      freeRentMonths: { type: 'integer', minimum: 0 },
      tiPerSF: { type: 'number' },
      tiNote: { type: 'string' },
      probabilityPct: { type: 'number', minimum: 0, maximum: 100 },
      expectedStart: { type: 'string', description: 'ISO YYYY-MM-DD' },
      priority: { type: 'string', enum: [...PRIORITIES], description: 'Defaults to "Low" if omitted' },
      notes: { type: 'string' },
      currentSummary: { type: 'string' },
      sharepointUrl: { type: 'string', description: 'SharePoint folder URL for this deal' },
    },
    required: ['dealName'],
    additionalProperties: false,
  },

  async handler(args: CreateDealArgs, _token: AuthedToken) {
    if (!args.dealName || args.dealName.trim().length === 0) {
      throw new Error('dealName is required');
    }

    const today = new Date().toISOString().slice(0, 10);
    const id = randomUUID();

    // Map to snake_case DB row. Mirrors src/lib/repo/mappers.ts::dealToRow,
    // intentionally redeclared here to keep mcp/ self-contained.
    const row = {
      id,
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
    const { data, error } = await sb.from('deals').insert(row).select().single();
    if (error) {
      throw new Error(`Insert failed: ${error.message}`);
    }

    return {
      ok: true,
      deal: data,
      message:
        `Created deal "${row.deal_name}" with status "${row.status}". ` +
        `Open clients will see it appear via Realtime subscription.`,
    };
  },
} as const;
