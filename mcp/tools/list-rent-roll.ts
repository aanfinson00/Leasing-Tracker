// =============================================================================
// Tool: list_rent_roll
// =============================================================================

import { z } from 'zod';
import { getServiceClient } from '../db.js';
import type { AuthedToken } from '../auth.js';
import { toMcpInputSchema } from '../lib/zod-input.js';

const argsSchema = z
  .object({
    deal_id: z.string().describe('Filter to one project (4-digit deal_id like "5001"). Omit for all.').optional(),
    building_id: z.string().describe('Filter to one building (UUID). Omit for all.').optional(),
    occupied: z.boolean().describe('true = occupied only, false = vacant only, omit = both.').optional(),
    tenant_search: z.string().describe('Case-insensitive substring match against tenant_name. Omit to skip.').optional(),
    expiring_before: z.string().describe('ISO date (YYYY-MM-DD). Filter to leases expiring on/before this date.').optional(),
    limit: z.number().int().min(1).max(100).describe('Max rows. Defaults to 25, capped at 100.').optional(),
  })
  .strict();

type Args = z.infer<typeof argsSchema>;

export const listRentRollTool = {
  name: 'list_rent_roll',
  description:
    'List rent-roll rows (in-place leases). Use when the user asks about current ' +
    'tenants, occupied/vacant spaces, lease expirations, or rent at a specific ' +
    'building/suite. Ordered by lease end date ascending (expiring leases first).',
  inputSchema: toMcpInputSchema(argsSchema),

  async handler(args: Args, _token: AuthedToken) {
    const limit = Math.min(args.limit ?? 25, 100);
    const sb = getServiceClient();

    let query = sb
      .from('rent_roll')
      .select('*')
      .order('lease_end', { ascending: true, nullsFirst: false })
      .limit(limit);

    if (args.deal_id) query = query.eq('deal_id', args.deal_id);
    if (args.building_id) query = query.eq('building_id', args.building_id);
    if (typeof args.occupied === 'boolean') query = query.eq('occupied', args.occupied);
    if (args.tenant_search) query = query.ilike('tenant_name', `%${args.tenant_search}%`);
    if (args.expiring_before) query = query.lte('lease_end', args.expiring_before);

    const { data, error } = await query;
    if (error) throw new Error(`list_rent_roll failed: ${error.message}`);

    return { count: data?.length ?? 0, rows: data ?? [] };
  },
} as const;
