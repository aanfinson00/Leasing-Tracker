// =============================================================================
// Tool: list_lease_comps
//
// Read-only. Comparable lease transactions — for benchmarking proposed rents
// or sizing market for an upcoming negotiation.
// =============================================================================

import { getServiceClient } from '../db';
import type { AuthedToken } from '../auth';

export const listLeaseCompsTool = {
  name: 'list_lease_comps',
  description:
    'List lease comps for benchmarking. Use when the user wants to check market ' +
    'rents for a particular market / property type / size range, or when ' +
    'underwriting a new prospect. Ordered by signed_date descending.',
  inputSchema: {
    type: 'object',
    properties: {
      market: { type: 'string', description: 'Filter to a market (substring match).' },
      property_type: { type: 'string' },
      signed_after: { type: 'string', description: 'YYYY-MM-DD. Only comps signed on/after.' },
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
      signed_after?: string;
      min_sf?: number;
      max_sf?: number;
      limit?: number;
    },
    _token: AuthedToken
  ) {
    const limit = Math.min(args.limit ?? 20, 100);
    const sb = getServiceClient();

    let query = sb
      .from('lease_comps')
      .select(
        'id, property_name, building_address, market, property_type, building_type, ' +
        'tenant_name, tenant_industry, transaction_type, signed_date, lease_sf, ' +
        'base_rent_psf, effective_rent_psf, rent_type, term_months, free_rent_months, ' +
        'ti_psf, escalation_pct, confidence, source'
      )
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
