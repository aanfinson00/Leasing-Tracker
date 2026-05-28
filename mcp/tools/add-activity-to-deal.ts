// =============================================================================
// Tool: add_activity_to_deal
//
// Append an activity row tied to a deal. The activity log is the running
// journal under each deal's drawer — calls, meetings, emails, status changes.
//
// Use cases that justify a dedicated MCP tool (vs. update_deal's notes field):
//   - Logging a phone call: type='call', summary='Talked to Sarah Chen…'
//   - Capturing inbound email: type='email-in', summary, link to thread
//   - Recording status flip rationale: type='status-change', summary
//
// The `activities` table is a generic parent_type / parent_id store — this
// tool just fixes parent_type='deal'. Sessions later can add equivalents
// for rentroll / dev_project / acq_target.
// =============================================================================

import { randomUUID } from 'node:crypto';
import { getServiceClient } from '../db';
import type { AuthedToken } from '../auth';

const ACTIVITY_TYPES = [
  'note',
  'email-out',
  'email-in',
  'call',
  'meeting',
  'status-change',
] as const;

interface AddActivityArgs {
  dealId: string;
  summary: string;
  type?: typeof ACTIVITY_TYPES[number];
  date?: string;       // ISO YYYY-MM-DD; defaults to today
  link?: string;       // e.g. Gmail thread URL
  author?: string;     // free-text byline; defaults to the token's name
}

export const addActivityToDealTool = {
  name: 'add_activity_to_deal',
  description:
    'Append an activity entry to a deal\'s journal. Use for call summaries, ' +
    'meeting notes, email logs, or anything you want to surface in the deal\'s ' +
    'Activity Log. For minor "what\'s the status now" fields, prefer update_deal ' +
    'with the notes or currentSummary field instead.',
  inputSchema: {
    type: 'object',
    properties: {
      dealId: { type: 'string', description: 'DB uuid of the deal — use list_deals to find it.' },
      summary: { type: 'string', minLength: 1, description: 'The activity body. Required.' },
      type: { type: 'string', enum: [...ACTIVITY_TYPES], description: 'Defaults to "note".' },
      date: { type: 'string', description: 'ISO YYYY-MM-DD. Defaults to today.' },
      link: { type: 'string', description: 'Optional URL (e.g. Gmail thread, Teams message).' },
      author: { type: 'string', description: 'Free-text byline. Defaults to the MCP token name.' },
    },
    required: ['dealId', 'summary'],
    additionalProperties: false,
  },

  async handler(args: AddActivityArgs, token: AuthedToken) {
    if (!args.dealId) throw new Error('dealId is required');
    if (!args.summary || !args.summary.trim()) throw new Error('summary is required');

    const sb = getServiceClient();

    // Confirm the deal exists before we insert — otherwise we'd write
    // orphan activity rows. Cheap because dealId is the primary key.
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

    const { data, error } = await sb.from('activities').insert(row).select().single();
    if (error) {
      throw new Error(`Activity insert failed: ${error.message}`);
    }

    return {
      ok: true,
      activity: data,
      deal: { id: deal.id, name: deal.deal_name },
    };
  },
} as const;
