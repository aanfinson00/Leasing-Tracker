// =============================================================================
// Tool: list_dispositions
// Read-only. The dispositions pipeline (disposition_listings).
// =============================================================================

import { z } from 'zod';
import { getServiceClient } from '../db.js';
import type { AuthedToken } from '../auth.js';
import { toMcpInputSchema } from '../lib/zod-input.js';

const DISPO_STATUSES = [
  'Considering',
  'Underwriting',
  'Marketing',
  'Under Contract',
  'Closed',
  'Pulled',
  'On Hold',
] as const;

const argsSchema = z
  .object({
    status: z.enum(DISPO_STATUSES).optional(),
    search: z.string().optional(),
    limit: z.number().int().min(1).max(100).describe('Defaults to 20.').optional(),
  })
  .strict();

type Args = z.infer<typeof argsSchema>;

export const listDispositionsTool = {
  name: 'list_dispositions',
  description:
    'List rows from the Disposition Tracking pipeline (disposition_listings). ' +
    'Use when the user asks about assets being sold. Filter by status or search ' +
    'across asset_name / address / market.',
  inputSchema: toMcpInputSchema(argsSchema),

  async handler(args: Args, _token: AuthedToken) {
    const limit = Math.min(args.limit ?? 20, 100);
    const sb = getServiceClient();
    let q = sb
      .from('disposition_listings')
      .select('*')
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (args.status) q = q.eq('status', args.status);
    if (args.search) {
      const p = `%${args.search}%`;
      q = q.or(`asset_name.ilike.${p},address.ilike.${p},market.ilike.${p}`);
    }

    const { data, error } = await q;
    if (error) throw new Error(`list_dispositions failed: ${error.message}`);
    return { count: data?.length ?? 0, dispositions: data ?? [] };
  },
} as const;
