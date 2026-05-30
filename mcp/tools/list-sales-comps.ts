// =============================================================================
// Tool: list_sales_comps
//
// Read-only. Comparable property sales — for cap rate / $/sf benchmarking
// when underwriting an acquisition or disposition.
// =============================================================================

import { getServiceClient } from '../db';
import type { AuthedToken } from '../auth';

export const listSalesCompsTool = {
  name: 'list_sales_comps',
  description:
    'List sales comps for benchmarking. Use when the user wants to check market ' +
    'cap rates, $/sf pricing, or recent transactions for an acquisition or ' +
    'disposition. Ordered by sale_date descending.',
  inputSchema: {
    type: 'object',
    properties: {
      market: { type: 'string', description: 'Filter to a market (substring match).' },
      property_type: { type: 'string' },
      sold_after: { type: 'string', description: 'YYYY-MM-DD. Only comps sold on/after.' },
      min_sf: { type: 'integer' },
      max_sf: { type: 'integer' },
      limit: {
        type: 'integer',
        description: 'Max rows. Defaults to 20, capped at 100.',
        minimum: 1,
        maximum: 100,
      },
    },
    additionalProperties: false,
  },

  async handler(
    args: {
      market?: string;
      property_type?: string;
      sold_after?: string;
      min_sf?: number;
      max_sf?: number;
      limit?: number;
    },
    _token: AuthedToken
  ) {
    const limit = Math.min(args.limit ?? 20, 100);
    const sb = getServiceClient();

    let query = sb
      .from('sales_comps')
      .select(
        'id, property_name, building_address, market, property_type, building_type, ' +
        'sale_date, sale_price, price_psf, cap_rate, noi, building_sf, land_acres, ' +
        'year_built, occupancy_pct, buyer, seller, confidence, source'
      )
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
