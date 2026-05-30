// =============================================================================
// Tool: list_tenants
// Read-only. Search rent_roll rows; filter by occupancy or building/space.
// =============================================================================

import { z } from 'zod';
import { getServiceClient } from '../db';
import type { AuthedToken } from '../auth';
import { toMcpInputSchema } from '../lib/zod-input';

const argsSchema = z
  .object({
    occupied: z.enum(['yes', 'no', 'all']).describe('Filter by occupancy. Defaults to "all".').optional(),
    search: z.string().describe('Substring matched against tenant_name / building / space_id (case-insensitive).').optional(),
    building: z.string().describe('Filter to a specific building name (exact match).').optional(),
    limit: z.number().int().min(1).max(100).describe('Defaults to 20.').optional(),
  })
  .strict();

type Args = z.infer<typeof argsSchema>;

export const listTenantsTool = {
  name: 'list_tenants',
  description:
    'List rows from the rent roll (current tenants + vacant spaces). Use when ' +
    'the user asks about tenants, occupancy, lease expirations, or wants to find ' +
    'a tenant by name. Default occupied=all so vacant spaces are included; pass ' +
    'occupied=yes for just the active tenants.',
  inputSchema: toMcpInputSchema(argsSchema),

  async handler(args: Args, _token: AuthedToken) {
    const limit = Math.min(args.limit ?? 20, 100);
    const sb = getServiceClient();

    let query = sb
      .from('rent_roll')
      .select('*')
      .order('lease_end', { ascending: true, nullsFirst: false })
      .limit(limit);

    if (args.occupied === 'yes') query = query.eq('occupied', true);
    if (args.occupied === 'no') query = query.eq('occupied', false);
    if (args.building) query = query.eq('building', args.building);
    if (args.search) {
      const p = `%${args.search}%`;
      query = query.or(`tenant_name.ilike.${p},building.ilike.${p},space_id.ilike.${p}`);
    }

    const { data, error } = await query;
    if (error) throw new Error(`list_tenants failed: ${error.message}`);

    return { count: data?.length ?? 0, tenants: data ?? [] };
  },
} as const;
