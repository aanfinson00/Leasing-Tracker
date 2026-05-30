// =============================================================================
// Tool: list_acquisitions
// Read-only. The acquisitions pipeline (acquisition_targets).
// =============================================================================

import { z } from 'zod';
import { getServiceClient } from '../db.js';
import type { AuthedToken } from '../auth.js';
import { toMcpInputSchema } from '../lib/zod-input.js';

const ACQ_STATUSES = [
  'Sourcing',
  'Pursuing',
  'LOI',
  'PSA',
  'Closing',
  'Closed',
  'Lost',
  'On Hold',
] as const;

const argsSchema = z
  .object({
    status: z.enum(ACQ_STATUSES).optional(),
    search: z.string().optional(),
    limit: z.number().int().min(1).max(100).describe('Defaults to 20.').optional(),
  })
  .strict();

type Args = z.infer<typeof argsSchema>;

export const listAcquisitionsTool = {
  name: 'list_acquisitions',
  description:
    'List rows from the Acquisitions Pipeline (acquisition_targets). Use when ' +
    'the user asks about deals you\'re trying to buy. Filter by status or search ' +
    'across target_name / address / market.',
  inputSchema: toMcpInputSchema(argsSchema),

  async handler(args: Args, _token: AuthedToken) {
    const limit = Math.min(args.limit ?? 20, 100);
    const sb = getServiceClient();
    let q = sb
      .from('acquisition_targets')
      .select('*')
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (args.status) q = q.eq('status', args.status);
    if (args.search) {
      const p = `%${args.search}%`;
      q = q.or(`target_name.ilike.${p},address.ilike.${p},market.ilike.${p}`);
    }

    const { data, error } = await q;
    if (error) throw new Error(`list_acquisitions failed: ${error.message}`);
    return { count: data?.length ?? 0, acquisitions: data ?? [] };
  },
} as const;
