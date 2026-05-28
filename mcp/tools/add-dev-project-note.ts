// =============================================================================
// Tool: add_dev_project_note
//
// The Dev Pipeline equivalent of add_activity_to_deal. Writes a row into
// dev_project_notes — the "Activity Log" surface inside the Dev Project
// drawer (Call Log / Meeting / Site Visit / Research / Feasibility / General).
// =============================================================================

import { randomUUID } from 'node:crypto';
import { getServiceClient } from '../db';
import type { AuthedToken } from '../auth';

const NOTE_TYPES = [
  'General',
  'Call Log',
  'Meeting',
  'Site Visit',
  'Research',
  'Feasibility',
] as const;

interface AddDevProjectNoteArgs {
  devProjectId: string;
  content: string;
  noteType?: typeof NOTE_TYPES[number];
  eventDate?: string;   // ISO YYYY-MM-DD
  link?: string;
  author?: string;
}

export const addDevProjectNoteTool = {
  name: 'add_dev_project_note',
  description:
    'Append a note to a development project\'s activity log. Use for site-visit ' +
    'summaries, PM/GC status updates, design-review meeting notes, or feasibility ' +
    'research findings. The noteType drives the badge color in the drawer.',
  inputSchema: {
    type: 'object',
    properties: {
      devProjectId: { type: 'string', description: 'DB uuid of the dev project. Use list_dev_projects to find it.' },
      content: { type: 'string', minLength: 1, description: 'The note body. Required.' },
      noteType: { type: 'string', enum: [...NOTE_TYPES], description: 'Defaults to "General".' },
      eventDate: { type: 'string', description: 'ISO YYYY-MM-DD. Defaults to today.' },
      link: { type: 'string', description: 'Optional URL (e.g. Teams thread, SharePoint doc).' },
      author: { type: 'string', description: 'Free-text byline. Defaults to the MCP token name.' },
    },
    required: ['devProjectId', 'content'],
    additionalProperties: false,
  },

  async handler(args: AddDevProjectNoteArgs, token: AuthedToken) {
    if (!args.devProjectId) throw new Error('devProjectId is required');
    if (!args.content?.trim()) throw new Error('content is required');

    const sb = getServiceClient();

    // Verify parent exists — avoid orphan note rows.
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

    const { data, error } = await sb.from('dev_project_notes').insert(row).select().single();
    if (error) throw new Error(`Insert failed: ${error.message}`);

    return {
      ok: true,
      note: data,
      dev_project: { id: proj.id, name: proj.project_name },
    };
  },
} as const;
