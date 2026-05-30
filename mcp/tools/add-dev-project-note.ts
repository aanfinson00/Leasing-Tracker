// =============================================================================
// Tool: add_dev_project_note
// Append a note to dev_project_notes. Mirrors add_activity_to_deal pattern.
// =============================================================================

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getServiceClient } from '../db.js';
import type { AuthedToken } from '../auth.js';
import { toMcpInputSchema } from '../lib/zod-input.js';

const NOTE_TYPES = [
  'General',
  'Call Log',
  'Meeting',
  'Site Visit',
  'Research',
  'Feasibility',
] as const;

const argsSchema = z
  .object({
    devProjectId: z.string().describe('DB uuid of the dev project. Use list_dev_projects to find it.'),
    content: z.string().min(1).describe('The note body. Required.'),
    noteType: z.enum(NOTE_TYPES).describe('Defaults to "General".').optional(),
    eventDate: z.string().describe('ISO YYYY-MM-DD. Defaults to today.').optional(),
    link: z.string().describe('Optional URL (e.g. Teams thread, SharePoint doc).').optional(),
    author: z.string().describe('Free-text byline. Defaults to "MCP · <tokenName>".').optional(),
  })
  .strict();

type Args = z.infer<typeof argsSchema>;

export const addDevProjectNoteTool = {
  name: 'add_dev_project_note',
  description:
    'Append a note to a development project\'s activity log. Use for site-visit ' +
    'summaries, PM/GC status updates, design-review meeting notes, or feasibility findings.',
  inputSchema: toMcpInputSchema(argsSchema),

  async handler(args: Args, token: AuthedToken) {
    const sb = getServiceClient();

    const { data: proj, error: pErr } = await sb
      .from('development_projects')
      .select('id, project_name')
      .eq('id', args.devProjectId)
      .maybeSingle();
    if (pErr) throw new Error(`Lookup failed: ${pErr.message}`);
    if (!proj) throw new Error(`No development project with id "${args.devProjectId}".`);

    const row = {
      id: randomUUID(),
      dev_project_id: args.devProjectId,
      note_type: args.noteType ?? 'General',
      event_date: args.eventDate ?? new Date().toISOString().slice(0, 10),
      content: args.content.trim(),
      link: args.link ?? null,
      author: args.author ?? `MCP · ${token.name}`,
    };

    const { data, error } = await sb.from('dev_project_notes').insert(row).select('*').single();
    if (error) throw new Error(`Insert failed: ${error.message}`);

    return { ok: true, note: data, dev_project: { id: proj.id, name: proj.project_name } };
  },
} as const;
