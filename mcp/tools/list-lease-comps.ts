// =============================================================================
// Tool: list_lease_comps
// =============================================================================

import { z } from 'zod';
import { getServiceClient } from '../db.js';
import type { AuthedToken } from '../auth.js';
import { toMcpInputSchema } from '../lib/zod-input.js';

const argsSchema = z
  .object({
    market: z.string().describe('Filter to a market (substring match).').optional(),
    property_type: z.string().optional(),
    signed_after: z.string().describe('YYYY-MM-DD. Only comps signed on/after.').optional(),
    min_sf: z.number().int().optional(),
    max_sf: z.number().int().optional(),
    limit: z.number().int().min(1).max(100).describe('Max rows. Defaults to 20, capped at 100.').optional(),
  })
  .strict();

type Args = z.infer<typeof argsSchema>;

export const listLeaseCompsTool = {
  name: 'list_lease_comps',
  description:
    'List lease comps for benchmarking. Use when the user wants to check market ' +
    'rents for a particular market / property type / size range, or when ' +
    'underwriting a new prospect. Ordered by signed_date descending.',
  inputSchema: toMcpInputSchema(argsSchema),

  async handler(args: Args, _token: AuthedToken) {
    const limit = Math.min(args.limit ?? 20, 100);
    const sb = getServiceClient();

    let query = sb
      .from('lease_comps')
      .select('*')
      .order('signed_date', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (args.market) query = query.ilike('market', `%${args.market}%`);
    if (args.property_type) query = query.eq('property_type', args.property_type);
    if (args.signed_after) query = query.gte('signed_date', args.signed_after);
    if (typeof args.min_sf === 'number') query = query.gte('lease_sf', args.min_sf);
    if (typeof args.max_sf === 'number') query = query.lte('lease_sf', args.max_sf);

    const { data, error } = await query;
    if (error) throw new Error(`list_lease_comps failed: ${error.message}`);

    return { count: data?.length ?? 0, comps: data ?? [] };
  },
} as const;
