// =============================================================================
// Tool: search
//
// Free-text search across deals, rent_roll tenants, and building names.
// Returns at most 5 hits per source. Use when the user mentions a name
// without context ("what's the deal with Acme?" / "find the Smith lease").
// =============================================================================

import { getServiceClient } from '../db';
import type { AuthedToken } from '../auth';

export const searchTool = {
  name: 'search',
  description:
    'Free-text search across deal names, prospect/tenant names, broker reps, and ' +
    'building names. Returns up to 5 hits per source. Use when the user mentions ' +
    'an entity by name and you need to find what it refers to before drilling in.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search string (case-insensitive substring).' },
    },
    required: ['query'],
    additionalProperties: false,
  },

  async handler(args: { query: string }, _token: AuthedToken) {
    const q = args.query.trim();
    if (!q) throw new Error('search: query must not be empty');
    const pat = `%${q}%`;
    const sb = getServiceClient();

    const [dealsRes, tenantsRes, buildingsRes] = await Promise.all([
      sb
        .from('deals')
        .select('id, deal_id, deal_name, prospect_tenant, broker_rep, status')
        .or(
          `deal_name.ilike.${pat},prospect_tenant.ilike.${pat},broker_rep.ilike.${pat}`
        )
        .limit(5),
      sb
        .from('rent_roll')
        .select('id, tenant_name, building, space_id, lease_end, occupied')
        .ilike('tenant_name', pat)
        .limit(5),
      sb
        .from('buildings')
        .select('id, project_id, name, building_ordinal')
        .ilike('name', pat)
        .limit(5),
    ]);

    if (dealsRes.error) throw new Error(`search deals failed: ${dealsRes.error.message}`);
    if (tenantsRes.error) throw new Error(`search tenants failed: ${tenantsRes.error.message}`);
    if (buildingsRes.error) throw new Error(`search buildings failed: ${buildingsRes.error.message}`);

    return {
      query: q,
      deals: dealsRes.data ?? [],
      rent_roll: tenantsRes.data ?? [],
      buildings: buildingsRes.data ?? [],
    };
  },
} as const;
