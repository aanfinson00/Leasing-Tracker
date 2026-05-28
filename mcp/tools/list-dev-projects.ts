// =============================================================================
// Tool: list_dev_projects
// Read-only. The development pipeline.
// =============================================================================

import { getServiceClient } from '../db';
import type { AuthedToken } from '../auth';

const DEV_PHASES = [
  'Site Selection',
  'Entitlement',
  'Design',
  'Construction',
  'Lease-Up',
  'Delivered',
  'On Hold',
  'Cancelled',
] as const;

interface ListDevProjectsArgs {
  phase?: typeof DEV_PHASES[number];
  search?: string;
  limit?: number;
}

export const listDevProjectsTool = {
  name: 'list_dev_projects',
  description:
    'List development projects. Use when the user asks about active development, ' +
    'site selection, construction status, or delivery timelines. Filter by phase ' +
    'or search across project_name / address / market / pm_name.',
  inputSchema: {
    type: 'object',
    properties: {
      phase: { type: 'string', enum: [...DEV_PHASES] },
      search: { type: 'string' },
      limit: { type: 'integer', minimum: 1, maximum: 100, description: 'Defaults to 20.' },
    },
    additionalProperties: false,
  },

  async handler(args: ListDevProjectsArgs, _token: AuthedToken) {
    const limit = Math.min(args.limit ?? 20, 100);
    const sb = getServiceClient();
    let q = sb
      .from('development_projects')
      .select(
        'id, project_name, address, market, submarket, county, city, phase, ' +
        'total_sf, acres, building_count, start_date, expected_delivery_date, ' +
        'actual_delivery_date, total_budget, spent_to_date, pm_name, gc_name, ' +
        'risk_level, status_summary, site_setter_url, updated_at'
      )
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (args.phase) q = q.eq('phase', args.phase);
    if (args.search) {
      const p = `%${args.search}%`;
      q = q.or(`project_name.ilike.${p},address.ilike.${p},market.ilike.${p},pm_name.ilike.${p}`);
    }

    const { data, error } = await q;
    if (error) throw new Error(`list_dev_projects failed: ${error.message}`);
    return { count: data?.length ?? 0, dev_projects: data ?? [] };
  },
} as const;
