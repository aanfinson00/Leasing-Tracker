// =============================================================================
// Tool: list_buildings
//
// Read-only. Buildings belong to a project (project_id == deals.deal_id).
// Use when the user asks "what buildings are on deal X" or wants building
// IDs for follow-up rent-roll queries.
// =============================================================================

import { getServiceClient } from '../db';
import type { AuthedToken } from '../auth';

export const listBuildingsTool = {
  name: 'list_buildings',
  description:
    'List buildings, optionally filtered by project_id (a 4-digit deal_id like ' +
    '"5001"). Returns id, name, project, ordinal, bay count — enough to feed into ' +
    'list_rent_roll(building_id=...) for follow-up queries.',
  inputSchema: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: '4-digit deal_id (e.g. "5001"). Omit for all buildings.',
      },
      limit: {
        type: 'integer',
        description: 'Max rows. Defaults to 50, capped at 200.',
        minimum: 1,
        maximum: 200,
      },
    },
    additionalProperties: false,
  },

  async handler(args: { project_id?: string; limit?: number }, _token: AuthedToken) {
    const limit = Math.min(args.limit ?? 50, 200);
    const sb = getServiceClient();

    let query = sb
      .from('buildings')
      .select(
        'id, project_id, name, building_ordinal, bay_count, height_ft, ' +
        'width_ft, depth_ft, center_lat, center_lng, created_at'
      )
      .order('project_id', { ascending: true })
      .order('building_ordinal', { ascending: true, nullsFirst: false })
      .limit(limit);

    if (args.project_id) query = query.eq('project_id', args.project_id);

    const { data, error } = await query;
    if (error) throw new Error(`list_buildings failed: ${error.message}`);

    return { count: data?.length ?? 0, buildings: data ?? [] };
  },
} as const;
