// =============================================================================
// Tool: list_sales_comps
// =============================================================================

import { z } from 'zod';
import { getServiceClient } from '../db';
import type { AuthedToken } from '../auth';
import { toMcpInputSchema } from '../lib/zod-input';

const argsSchema = z
  .object({
    market: z.string().describe('Filter to a market (substring match).').optional(),
    property_type: z.string().optional(),
    sold_after: z.string().describe('YYYY-MM-DD. Only comps sold on/after.').optional(),
    min_sf: z.number().int().optional(),
    max_sf: z.number().int().optional(),
    limit: z.number().int().min(1).max(100).describe('Max rows. Defaults to 20, capped at 100.').optional(),
  })
  .strict();

type Args = z.infer<typeof argsSchema>;

export const listSalesCompsTool = {
  name: 'list_sales_comps',
  description:
    'List sales comps for benchmarking. Use when the user wants to check market ' +
    'cap rates, $/sf pricing, or recent transactions for an acquisition or ' +
    'disposition. Ordered by sale_date descending.',
  inputSchema: toMcpInputSchema(argsSchema),

  async handler(args: Args, _token: AuthedToken) {
    const limit = Math.min(args.limit ?? 20, 100);
    const sb = getServiceClient();

    let query = sb
      .from('sales_comps')
      .select('*')
      .order('sale_date', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (args.market) query = query.ilike('market', `%${args.market}%`);
    if (args.property_type) query = query.eq('property_type', args.property_type);
    if (args.sold_after) query = query.gte('sale_date', args.sold_after);
    if (typeof args.min_sf === 'number') query = query.gte('building_sf', args.min_sf);
    if (typeof args.max_sf === 'number') query = query.lte('building_sf', args.max_sf);

    const { data, error } = await query;
    if (error) throw new Error(`list_sales_comps failed: ${error.message}`);

    return { count: data?.length ?? 0, comps: data ?? [] };
  },
} as const;
