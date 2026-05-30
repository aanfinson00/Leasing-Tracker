// =============================================================================
// Tool: add_activity_to_deal
// Append an activity row tied to a deal. parent_type fixed to 'deal'.
// =============================================================================

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getServiceClient } from '../db';
import type { AuthedToken } from '../auth';
import { toMcpInputSchema } from '../lib/zod-input';

const ACTIVITY_TYPES = [
  'note',
  'email-out',
  'email-in',
  'call',
  'meeting',
  'status-change',
] as const;

const argsSchema = z
  .object({
    dealId: z.string().describe('DB uuid of the deal — use list_deals to find it.'),
    summary: z.string().min(1).describe('The activity body. Required.'),
    type: z.enum(ACTIVITY_TYPES).describe('Defaults to "note".').optional(),
    date: z.string().describe('ISO YYYY-MM-DD. Defaults to today.').optional(),
    link: z.string().describe('Optional URL (e.g. Gmail thread, Teams message).').optional(),
    author: z.string().describe('Free-text byline. Defaults to "MCP · <tokenName>".').optional(),
  })
  .strict();

type Args = z.infer<typeof argsSchema>;

export const addActivityToDealTool = {
  name: 'add_activity_to_deal',
  description:
    'Append an activity entry to a deal\'s journal. Use for call summaries, ' +
    'meeting notes, email logs. For minor "what\'s the status now" fields, prefer ' +
    'update_deal with the notes or currentSummary field instead.',
  inputSchema: toMcpInputSchema(argsSchema),

  async handler(args: Args, token: AuthedToken) {
    const sb = getServiceClient();

    const { data: deal, error: dealErr } = await sb
      .from('deals')
      .select('id, deal_name')
      .eq('id', args.dealId)
      .maybeSingle();
    if (dealErr) throw new Error(`Deal lookup failed: ${dealErr.message}`);
    if (!deal) throw new Error(`No deal with id "${args.dealId}".`);

    const row = {
      id: randomUUID(),
      parent_type: 'deal' as const,
      parent_id: args.dealId,
      date: args.date ?? new Date().toISOString().slice(0, 10),
      type: args.type ?? 'note',
      summary: args.summary.trim(),
      link: args.link ?? null,
      author: args.author ?? `MCP · ${token.name}`,
    };

    const { data, error } = await sb.from('activities').insert(row).select('*').single();
    if (error) throw new Error(`Activity insert failed: ${error.message}`);

    return { ok: true, activity: data, deal: { id: deal.id, name: deal.deal_name } };
  },
} as const;
