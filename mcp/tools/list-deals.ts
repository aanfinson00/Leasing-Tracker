// =============================================================================
// Tool: list_deals
//
// Read-only. Returns deals from the Leasing-Tracker DB, optionally filtered by
// status or a fuzzy search across deal_name / prospect_tenant / broker_rep.
//
// Uses SELECT * so new columns surface automatically.
// argsSchema is the source of truth for both input validation (Zod) and the
// MCP inputSchema (auto-derived via toMcpInputSchema).
// =============================================================================

import { z } from 'zod';
import { getServiceClient } from '../db.js';
import type { AuthedToken } from '../auth.js';
import { toMcpInputSchema } from '../lib/zod-input.js';

const argsSchema = z
  .object({
    status: z
      .string()
      .describe(
        'Filter to a specific pipeline status: "New Prospect", "RFP Requested", ' +
          '"Drafting Unsolicited", "Proposal Pending Approval", "Proposal Sent", ' +
          '"LOI Negotiations", "Lease Negotiations", "Executed", "On Hold", "Lost". ' +
          'Omit to include all statuses.'
      )
      .optional(),
    search: z
      .string()
      .describe(
        'Substring (case-insensitive) matched against deal_name / prospect_tenant / broker_rep. Omit to skip search.'
      )
      .optional(),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .describe('Max rows to return. Defaults to 20, capped at 50.')
      .optional(),
  })
  .strict();

type Args = z.infer<typeof argsSchema>;

export const listDealsTool = {
  name: 'list_deals',
  description:
    'List deals in the Leasing-Tracker. Use this when the user asks about prospects, ' +
    'the leasing pipeline, or wants to find a deal by tenant / broker / name. ' +
    'Returns the most relevant deals (capped at 20) with all columns.',
  inputSchema: toMcpInputSchema(argsSchema),

  async handler(args: Args, _token: AuthedToken) {
    const limit = Math.min(args.limit ?? 20, 50);
    const sb = getServiceClient();

    let query = sb
      .from('deals')
      .select('*')
      .order('last_updated', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (args.status) {
      query = query.eq('status', args.status);
    }
    if (args.search) {
      const pat = `%${args.search}%`;
      query = query.or(
        `deal_name.ilike.${pat},prospect_tenant.ilike.${pat},broker_rep.ilike.${pat}`
      );
    }

    const { data, error } = await query;
    if (error) throw new Error(`list_deals failed: ${error.message}`);

    return { count: data?.length ?? 0, deals: data ?? [] };
  },
} as const;
