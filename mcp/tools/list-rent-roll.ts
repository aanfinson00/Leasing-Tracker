// =============================================================================
// Tool: list_rent_roll
//
// Read-only. Filtered slice of the rent_roll table — the in-place / signed
// leases. Use this when the user asks about tenants, current occupancy,
// upcoming expirations, or a specific space.
// =============================================================================

import { getServiceClient } from '../db';
import type { AuthedToken } from '../auth';

export const listRentRollTool = {
  name: 'list_rent_roll',
  description:
    'List rent-roll rows (in-place leases) from the Leasing-Tracker. Use when the ' +
    'user asks about current tenants, occupied/vacant spaces, lease expirations, ' +
    'or rent at a specific building/suite. Returns up to 25 rows ordered by lease ' +
    'end date ascending (so expiring leases surface first).',
  inputSchema: {
    type: 'object',
    properties: {
      deal_id: {
        type: 'string',
        description: 'Filter to one project (4-digit deal_id like "5001"). Omit for all.',
      },
      building_id: {
        type: 'string',
        description: 'Filter to one building (UUID). Omit for all.',
      },
      occupied: {
        type: 'boolean',
        description: 'true = occupied only, false = vacant only, omit = both.',
      },
      tenant_search: {
        type: 'string',
        description:
          'Case-insensitive substring match against tenant_name. Omit to skip.',
      },
      expiring_before: {
        type: 'string',
        description: 'ISO date (YYYY-MM-DD). Filter to leases expiring on/before this date.',
      },
      limit: {
        type: 'integer',
        description: 'Max rows. Defaults to 25, capped at 100.',
        minimum: 1,
        maximum: 100,
      },
    },
    additionalProperties: false,
  },

  async handler(
    args: {
      deal_id?: string;
      building_id?: string;
      occupied?: boolean;
      tenant_search?: string;
      expiring_before?: string;
      limit?: number;
    },
    _token: AuthedToken
  ) {
    const limit = Math.min(args.limit ?? 25, 100);
    const sb = getServiceClient();

    let query = sb
      .from('rent_roll')
      .select(
        'id, deal_id, deal_name, building_id, building, space_id, market, ' +
        'tenant_name, tenant_rating, occupied, leasable_sf, lease_start, lease_end, ' +
        'lease_term_months, free_rent_months, annual_rent_bumps_pct, ti_per_sf, ' +
        'starting_annual_rent_psf, current_summary'
      )
      .order('lease_end', { ascending: true, nullsFirst: false })
      .limit(limit);

    if (args.deal_id) query = query.eq('deal_id', args.deal_id);
    if (args.building_id) query = query.eq('building_id', args.building_id);
    if (typeof args.occupied === 'boolean') query = query.eq('occupied', args.occupied);
    if (args.tenant_search) query = query.ilike('tenant_name', `%${args.tenant_search}%`);
    if (args.expiring_before) query = query.lte('lease_end', args.expiring_before);

    const { data, error } = await query;
    if (error) throw new Error(`list_rent_roll failed: ${error.message}`);

    return { count: data?.length ?? 0, rows: data ?? [] };
  },
} as const;
