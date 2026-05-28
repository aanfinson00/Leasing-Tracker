// =============================================================================
// Tool: list_tenants
// Read-only. Search rent_roll rows; filter by occupancy or building/space.
// =============================================================================

import { getServiceClient } from '../db';
import type { AuthedToken } from '../auth';

interface ListTenantsArgs {
  occupied?: 'yes' | 'no' | 'all';
  search?: string;
  building?: string;
  limit?: number;
}

export const listTenantsTool = {
  name: 'list_tenants',
  description:
    'List rows from the rent roll (current tenants + vacant spaces). Use when ' +
    'the user asks about tenants, occupancy, lease expirations, or wants to find ' +
    'a tenant by name. Default occupied=all so vacant spaces are included; pass ' +
    'occupied=yes for just the active tenants.',
  inputSchema: {
    type: 'object',
    properties: {
      occupied: {
        type: 'string',
        enum: ['yes', 'no', 'all'],
        description: 'Filter by occupancy. Defaults to "all".',
      },
      search: {
        type: 'string',
        description: 'Substring matched against tenant_name / building / space_id (case-insensitive).',
      },
      building: {
        type: 'string',
        description: 'Filter to a specific building name (exact match).',
      },
      limit: { type: 'integer', minimum: 1, maximum: 100, description: 'Defaults to 20.' },
    },
    additionalProperties: false,
  },

  async handler(args: ListTenantsArgs, _token: AuthedToken) {
    const limit = Math.min(args.limit ?? 20, 100);
    const sb = getServiceClient();

    let query = sb
      .from('rent_roll')
      .select(
        'id, tenant_name, building, space_id, occupied, leasable_sf, ' +
        'lease_start, lease_term_months, lease_end, starting_annual_rent_psf, ' +
        'free_rent_months, security_deposit, rent_commencement_date, tenant_rating, ' +
        'market, property_type, uw_basis'
      )
      .order('lease_end', { ascending: true, nullsFirst: false })
      .limit(limit);

    if (args.occupied === 'yes') query = query.eq('occupied', true);
    if (args.occupied === 'no') query = query.eq('occupied', false);
    if (args.building) query = query.eq('building', args.building);
    if (args.search) {
      const p = `%${args.search}%`;
      query = query.or(`tenant_name.ilike.${p},building.ilike.${p},space_id.ilike.${p}`);
    }

    const { data, error } = await query;
    if (error) throw new Error(`list_tenants failed: ${error.message}`);

    return { count: data?.length ?? 0, tenants: data ?? [] };
  },
} as const;
