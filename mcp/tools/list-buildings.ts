// =============================================================================
// Tool: list_buildings
// =============================================================================

import { z } from 'zod';
import { getServiceClient } from '../db';
import type { AuthedToken } from '../auth';
import { toMcpInputSchema } from '../lib/zod-input';

const argsSchema = z
  .object({
    project_id: z.string().describe('4-digit deal_id (e.g. "5001"). Omit for all buildings.').optional(),
    limit: z.number().int().min(1).max(200).describe('Max rows. Defaults to 50, capped at 200.').optional(),
  })
  .strict();

type Args = z.infer<typeof argsSchema>;

export const listBuildingsTool = {
  name: 'list_buildings',
  description:
    'List buildings, optionally filtered by project_id (a 4-digit deal_id like ' +
    '"5001"). Returns all columns so id, ordinal, and bay layout are available ' +
    'to feed into list_rent_roll(building_id=...) for follow-up queries.',
  inputSchema: toMcpInputSchema(argsSchema),

  async handler(args: Args, _token: AuthedToken) {
    const limit = Math.min(args.limit ?? 50, 200);
    const sb = getServiceClient();

    let query = sb
      .from('buildings')
      .select('*')
      .order('project_id', { ascending: true })
      .order('building_ordinal', { ascending: true, nullsFirst: false })
      .limit(limit);

    if (args.project_id) query = query.eq('project_id', args.project_id);

    const { data, error } = await query;
    if (error) throw new Error(`list_buildings failed: ${error.message}`);

    return { count: data?.length ?? 0, buildings: data ?? [] };
  },
} as const;
