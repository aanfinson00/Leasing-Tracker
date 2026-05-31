// =============================================================================
// Tool: list_spaces
// =============================================================================

import { z } from 'zod';
import { getServiceClient } from '../db.js';
import type { AuthedToken } from '../auth.js';
import { toMcpInputSchema } from '../lib/zod-input.js';

const argsSchema = z
  .object({
    building_uuid: z.string().uuid().describe('Filter to spaces in a single building. Omit for all spaces.').optional(),
    project_uuid: z.string().uuid().describe('Filter to spaces in all buildings under a project. Omit if building_uuid is given.').optional(),
    only_leasable: z.boolean().describe('If true, exclude un-split parent spaces that have subdivision children.').optional(),
    limit: z.number().int().min(1).max(500).describe('Max rows. Defaults to 100, capped at 500.').optional(),
  })
  .strict();

type Args = z.infer<typeof argsSchema>;

interface SpaceRow {
  id: string;
  building_uuid: string;
  parent_space_uuid: string | null;
  [k: string]: unknown;
}

export const listSpacesTool = {
  name: 'list_spaces',
  description:
    'List spaces (leasable units within buildings). Filter by building_uuid or ' +
    'project_uuid (resolved via buildings.project_uuid join). Returns position, ' +
    'area_sf, bay_index, parent_space_uuid (set on subdivision children), code, ' +
    'occupied flag, and metadata. Set only_leasable=true to hide un-split parent ' +
    'spaces that have children.',
  inputSchema: toMcpInputSchema(argsSchema),

  async handler(args: Args, _token: AuthedToken) {
    const limit = Math.min(args.limit ?? 100, 500);
    const sb = getServiceClient();

    let buildingFilter: string[] | null = null;
    if (args.project_uuid) {
      const { data: bldgs, error: bldgErr } = await sb
        .from('buildings')
        .select('id')
        .eq('project_uuid', args.project_uuid);
      if (bldgErr) throw new Error(`list_spaces buildings lookup failed: ${bldgErr.message}`);
      buildingFilter = (bldgs ?? []).map((b) => (b as { id: string }).id);
      if (buildingFilter.length === 0) {
        return { count: 0, spaces: [] };
      }
    }

    let query = sb
      .from('spaces')
      .select('*')
      .order('bay_index', { ascending: true, nullsFirst: false })
      .order('code', { ascending: true })
      .limit(limit);

    if (args.building_uuid) query = query.eq('building_uuid', args.building_uuid);
    if (buildingFilter) query = query.in('building_uuid', buildingFilter);

    const { data, error } = await query;
    if (error) throw new Error(`list_spaces failed: ${error.message}`);

    let rows = (data ?? []) as SpaceRow[];

    if (args.only_leasable && rows.length > 0) {
      // Hide parents that have children (the children supersede them in
      // leasing). A row is "un-split parent with children" when another
      // row in the same set has parent_space_uuid === this row's id.
      const parentIdsWithChildren = new Set(
        rows.filter((r) => r.parent_space_uuid).map((r) => r.parent_space_uuid as string)
      );
      rows = rows.filter((r) => !parentIdsWithChildren.has(r.id));
    }

    return { count: rows.length, spaces: rows };
  },
} as const;
