// =============================================================================
// Tool: update_space
// =============================================================================

import { z } from 'zod';
import { getServiceClient } from '../db.js';
import type { AuthedToken } from '../auth.js';
import { toMcpInputSchema } from '../lib/zod-input.js';

// Mirrors SpacePositionEnum in src/types.ts. Kept literal so the Zod
// schema validates input at the MCP boundary without importing app code.
const POSITION_VALUES = [
  'Whole Building',
  'Center',
  'N End', 'N Middle',
  'S End', 'S Middle',
  'E End', 'E Middle',
  'W End', 'W Middle',
  'NE End', 'NE Middle',
  'NW End', 'NW Middle',
  'SE End', 'SE Middle',
  'SW End', 'SW Middle',
] as const;

const argsSchema = z
  .object({
    id: z.string().uuid().describe('UUID of the space row.'),
    position: z.enum(POSITION_VALUES).nullable().describe(
      'Position within the building. Set to null to clear.'
    ).optional(),
    area_sf: z.number().positive().nullable().describe('Leasable area in square feet.').optional(),
    code: z.string().nullable().describe('Display code (legacy text id, e.g. "5001-B01-S03").').optional(),
    occupied: z.boolean().describe('Is the space currently occupied?').optional(),
    metadata: z.record(z.string(), z.unknown()).describe(
      'Free-form jsonb. REPLACES the entire metadata object — merge client-side first if you want to add/update keys.'
    ).optional(),
  })
  .strict();

type Args = z.infer<typeof argsSchema>;

const MAP: Record<string, string> = {
  position: 'position',
  area_sf: 'area_sf',
  code: 'code',
  occupied: 'occupied',
  metadata: 'metadata',
};

export const updateSpaceTool = {
  name: 'update_space',
  description:
    'Patch one space row. Use to assign a position (N End / NE Middle / etc.), ' +
    'set area_sf, toggle occupied, or write metadata. Identify the row first ' +
    'via list_spaces. Only fields you pass are touched; omit to leave alone. ' +
    'Note: metadata is REPLACED (not merged) — pass the full desired object.',
  inputSchema: toMcpInputSchema(argsSchema),

  async handler(args: Args, _token: AuthedToken) {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const [key, col] of Object.entries(MAP)) {
      if (key in args) patch[col] = (args as Record<string, unknown>)[key];
    }
    if (Object.keys(patch).length === 1) {
      throw new Error('update_space: no fields to update — pass at least one column');
    }

    const sb = getServiceClient();
    const { data, error } = await sb
      .from('spaces')
      .update(patch)
      .eq('id', args.id)
      .select('*')
      .single();
    if (error) throw new Error(`update_space failed: ${error.message}`);
    if (!data) throw new Error(`space ${args.id} not found`);

    return { updated: data, patched_fields: Object.keys(patch).filter((k) => k !== 'updated_at') };
  },
} as const;
