// =============================================================================
// Tool: list_dev_projects
// Read-only. The development pipeline.
// =============================================================================

import { z } from 'zod';
import { getServiceClient } from '../db.js';
import type { AuthedToken } from '../auth.js';
import { toMcpInputSchema } from '../lib/zod-input.js';

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

const argsSchema = z
  .object({
    phase: z.enum(DEV_PHASES).optional(),
    search: z.string().optional(),
    limit: z.number().int().min(1).max(100).describe('Defaults to 20.').optional(),
  })
  .strict();

type Args = z.infer<typeof argsSchema>;

export const listDevProjectsTool = {
  name: 'list_dev_projects',
  description:
    'List development projects. Use when the user asks about active development, ' +
    'site selection, construction status, or delivery timelines. Filter by phase ' +
    'or search across project_name / address / market / pm_name.',
  inputSchema: toMcpInputSchema(argsSchema),

  async handler(args: Args, _token: AuthedToken) {
    const limit = Math.min(args.limit ?? 20, 100);
    const sb = getServiceClient();
    let q = sb
      .from('development_projects')
      .select('*')
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
