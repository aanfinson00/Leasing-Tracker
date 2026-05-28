// =============================================================================
// Tool: list_dispositions
// Read-only. The dispositions pipeline (disposition_listings).
// =============================================================================

import { getServiceClient } from '../db';
import type { AuthedToken } from '../auth';

const DISPO_STATUSES = [
  'Considering',
  'Underwriting',
  'Marketing',
  'Under Contract',
  'Closed',
  'Pulled',
  'On Hold',
] as const;

interface ListDispositionsArgs {
  status?: typeof DISPO_STATUSES[number];
  search?: string;
  limit?: number;
}

export const listDispositionsTool = {
  name: 'list_dispositions',
  description:
    'List rows from the Disposition Tracking pipeline (disposition_listings). ' +
    'Use when the user asks about assets being sold. Filter by status or search ' +
    'across asset_name / address / market.',
  inputSchema: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: [...DISPO_STATUSES] },
      search: { type: 'string' },
      limit: { type: 'integer', minimum: 1, maximum: 100, description: 'Defaults to 20.' },
    },
    additionalProperties: false,
  },

  async handler(args: ListDispositionsArgs, _token: AuthedToken) {
    const limit = Math.min(args.limit ?? 20, 100);
    const sb = getServiceClient();
    let q = sb
      .from('disposition_listings')
      .select(
        'id, asset_name, address, market, submarket, county, city, ' +
        'status, property_type, total_sf, acres, occupancy_pct, ' +
        'trailing_noi, forward_noi, list_price, list_cap_pct, ' +
        'achieved_price, achieved_cap_pct, net_proceeds, broker_commission_pct, ' +
        'list_date, bids_due_date, loi_executed_date, psa_executed_date, ' +
        'expected_closing_date, actual_closing_date, risk_level, ' +
        'status_summary, updated_at'
      )
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (args.status) q = q.eq('status', args.status);
    if (args.search) {
      const p = `%${args.search}%`;
      q = q.or(`asset_name.ilike.${p},address.ilike.${p},market.ilike.${p}`);
    }

    const { data, error } = await q;
    if (error) throw new Error(`list_dispositions failed: ${error.message}`);
    return { count: data?.length ?? 0, dispositions: data ?? [] };
  },
} as const;
