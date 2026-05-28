// =============================================================================
// Tool: list_acquisitions
// Read-only. The acquisitions pipeline (acquisition_targets).
// =============================================================================

import { getServiceClient } from '../db';
import type { AuthedToken } from '../auth';

const ACQ_STATUSES = [
  'Sourcing',
  'Pursuing',
  'LOI',
  'PSA',
  'Closing',
  'Closed',
  'Lost',
  'On Hold',
] as const;

interface ListAcquisitionsArgs {
  status?: typeof ACQ_STATUSES[number];
  search?: string;
  limit?: number;
}

export const listAcquisitionsTool = {
  name: 'list_acquisitions',
  description:
    'List rows from the Acquisitions Pipeline (acquisition_targets). Use when ' +
    'the user asks about deals you\'re trying to buy. Filter by status or search ' +
    'across target_name / address / market.',
  inputSchema: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: [...ACQ_STATUSES] },
      search: { type: 'string' },
      limit: { type: 'integer', minimum: 1, maximum: 100, description: 'Defaults to 20.' },
    },
    additionalProperties: false,
  },

  async handler(args: ListAcquisitionsArgs, _token: AuthedToken) {
    const limit = Math.min(args.limit ?? 20, 100);
    const sb = getServiceClient();
    let q = sb
      .from('acquisition_targets')
      .select(
        'id, target_name, address, market, submarket, county, city, ' +
        'status, property_type, acres, building_count, total_sf, ' +
        'asking_price, our_offer, earnest_money, underwritten_irr, ' +
        'underwritten_eqty_multiple, first_contacted_date, loi_date, ' +
        'psa_date, expected_closing_date, actual_closing_date, ' +
        'risk_level, status_summary, updated_at'
      )
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (args.status) q = q.eq('status', args.status);
    if (args.search) {
      const p = `%${args.search}%`;
      q = q.or(`target_name.ilike.${p},address.ilike.${p},market.ilike.${p}`);
    }

    const { data, error } = await q;
    if (error) throw new Error(`list_acquisitions failed: ${error.message}`);
    return { count: data?.length ?? 0, acquisitions: data ?? [] };
  },
} as const;
