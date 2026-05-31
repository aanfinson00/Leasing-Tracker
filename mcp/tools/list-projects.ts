// =============================================================================
// Tool: list_projects
// =============================================================================

import { z } from 'zod';
import { getServiceClient } from '../db.js';
import type { AuthedToken } from '../auth.js';
import { toMcpInputSchema } from '../lib/zod-input.js';

const argsSchema = z
  .object({
    project_code: z.string().describe('Filter by project_code (e.g. "50"). Omit for all.').optional(),
    market: z.string().describe('Filter by market label (case-insensitive).').optional(),
    limit: z.number().int().min(1).max(200).describe('Max rows. Defaults to 50, capped at 200.').optional(),
  })
  .strict();

type Args = z.infer<typeof argsSchema>;

export const listProjectsTool = {
  name: 'list_projects',
  description:
    'List all projects (top of the hierarchy: Project → Buildings → Spaces). ' +
    'Returns all columns including project_code, name, address, market, lat/lng, ' +
    'and metadata. Use to discover the project_uuid that scopes other queries, ' +
    'or to get a quick portfolio inventory.',
  inputSchema: toMcpInputSchema(argsSchema),

  async handler(args: Args, _token: AuthedToken) {
    const limit = Math.min(args.limit ?? 50, 200);
    const sb = getServiceClient();

    let query = sb
      .from('projects')
      .select('*')
      .order('project_code', { ascending: true })
      .limit(limit);

    if (args.project_code) query = query.eq('project_code', args.project_code);
    if (args.market) query = query.ilike('market', args.market);

    const { data, error } = await query;
    if (error) throw new Error(`list_projects failed: ${error.message}`);

    return { count: data?.length ?? 0, projects: data ?? [] };
  },
} as const;
