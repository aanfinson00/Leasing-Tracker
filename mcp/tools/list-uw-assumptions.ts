// =============================================================================
// Tool: list_uw_assumptions
//
// Returns rows from uw_assumptions — named UW assumption sets like
// "2H25 Reval UW" used as comparison baseline in the Lease Calculator.
// =============================================================================

import { z } from 'zod';
import { getServiceClient } from '../db.js';
import type { AuthedToken } from '../auth.js';
import { toMcpInputSchema } from '../lib/zod-input.js';

const argsSchema = z
  .object({
    assumption_set: z.string().describe('Filter by set name (default "2H25 Reval UW").').optional(),
    project_uuid: z.string().uuid().describe('Filter to rows linked to a specific project.').optional(),
    project_name_raw: z.string().describe('Filter by raw project name (substring, case-insensitive).').optional(),
    limit: z.number().int().min(1).max(500).describe('Max rows. Default 100, cap 500.').optional(),
  })
  .strict();

type Args = z.infer<typeof argsSchema>;

export const listUwAssumptionsTool = {
  name: 'list_uw_assumptions',
  description:
    'List UW assumption rows from a named set (default "2H25 Reval UW"). ' +
    'Each row holds GLCP-style per-tenant/per-suite assumptions: trended rent, ' +
    'lease term, free rent, TIs, LCs, escalations, status (LEASE / SPEC). Use to ' +
    'pull the comparison baseline when underwriting a prospect.',
  inputSchema: toMcpInputSchema(argsSchema),

  async handler(args: Args, _token: AuthedToken) {
    const limit = Math.min(args.limit ?? 100, 500);
    const sb = getServiceClient();
    let q = sb
      .from('uw_assumptions')
      .select('*')
      .eq('assumption_set', args.assumption_set ?? '2H25 Reval UW')
      .order('code', { ascending: true })
      .limit(limit);
    if (args.project_uuid) q = q.eq('project_uuid', args.project_uuid);
    if (args.project_name_raw) q = q.ilike('project_name_raw', `%${args.project_name_raw}%`);
    const { data, error } = await q;
    if (error) throw new Error(`list_uw_assumptions failed: ${error.message}`);
    return { count: data?.length ?? 0, assumptions: data ?? [] };
  },
} as const;
