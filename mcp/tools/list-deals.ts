// =============================================================================
// Tool: list_deals
//
// First MCP tool — read-only. Returns deals from the Leasing-Tracker DB,
// optionally filtered by status or a fuzzy search across deal_name /
// prospect_tenant / broker_rep.
//
// Shape of an MCP tool:
//   - `name`        — what Claude sees when picking a tool
//   - `description` — what Claude reads to decide WHEN to use it
//   - `inputSchema` — JSON schema for the args; Claude validates against it
//   - `handler`     — the function that actually runs
//
// The handler receives the parsed args and an authed token (for permission
// checks later) and returns a JSON-serializable result.
// =============================================================================

import { getServiceClient } from '../db';
import type { AuthedToken } from '../auth';

export const listDealsTool = {
  name: 'list_deals',
  description:
    'List deals in the Leasing-Tracker. Use this when the user asks about prospects, ' +
    'the leasing pipeline, or wants to find a deal by tenant / broker / name. ' +
    'Returns the most relevant deals (capped at 20) with key economics + status.',
  inputSchema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        description:
          'Filter to a specific pipeline status: "New Prospect", "RFP Requested", ' +
          '"Drafting Unsolicited", "Proposal Pending Approval", "Proposal Sent", ' +
          '"LOI Negotiations", "Lease Negotiations", "Executed", "On Hold", "Lost". ' +
          'Omit to include all statuses.',
      },
      search: {
        type: 'string',
        description:
          'Substring (case-insensitive) matched against deal_name / prospect_tenant / ' +
          'broker_rep. Omit to skip search.',
      },
      limit: {
        type: 'integer',
        description: 'Max rows to return. Defaults to 20, capped at 50.',
        minimum: 1,
        maximum: 50,
      },
    },
    additionalProperties: false,
  },

  async handler(args: { status?: string; search?: string; limit?: number }, _token: AuthedToken) {
    const limit = Math.min(args.limit ?? 20, 50);
    const sb = getServiceClient();

    let query = sb
      .from('deals')
      .select(
        'id, deal_name, prospect_tenant, broker_rep, building, status, transaction, ' +
        'target_rent, proposed_term_months, free_rent_months, ti_per_sf, probability_pct, ' +
        'expected_start, priority, last_updated'
      )
      .order('last_updated', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (args.status) {
      query = query.eq('status', args.status);
    }
    if (args.search) {
      // Postgres `or` filter with three ilike clauses — case-insensitive substring
      const pat = `%${args.search}%`;
      query = query.or(
        `deal_name.ilike.${pat},prospect_tenant.ilike.${pat},broker_rep.ilike.${pat}`
      );
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`list_deals failed: ${error.message}`);
    }

    return {
      count: data?.length ?? 0,
      deals: data ?? [],
    };
  },
} as const;
