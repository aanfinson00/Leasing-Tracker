// =============================================================================
// Tool: find_contact
// Read-only. Search the contacts table by name, company, or email.
// Returns up to 20; flat phones/emails arrays are surfaced as-is from JSONB.
// =============================================================================

import { getServiceClient } from '../db';
import type { AuthedToken } from '../auth';

interface FindContactArgs {
  query: string;
  contactType?: string;
  limit?: number;
}

export const findContactTool = {
  name: 'find_contact',
  description:
    'Search contacts by name (first or last), company, or email. Use when the user ' +
    'mentions someone by name and you need their record — phone / email / company / role. ' +
    'Returns the matching contacts with all channels (phones + emails) included.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        minLength: 1,
        description: 'Substring matched against first_name / last_name / company_name. Required.',
      },
      contactType: {
        type: 'string',
        enum: ['Owner', 'Broker', 'Attorney', 'Title Agent', 'Consultant', 'GC', 'Architect', 'Other'],
        description: 'Optional filter by contact category.',
      },
      limit: { type: 'integer', minimum: 1, maximum: 50, description: 'Defaults to 20.' },
    },
    required: ['query'],
    additionalProperties: false,
  },

  async handler(args: FindContactArgs, _token: AuthedToken) {
    if (!args.query?.trim()) throw new Error('query is required');
    const limit = Math.min(args.limit ?? 20, 50);
    const sb = getServiceClient();
    const p = `%${args.query}%`;

    let q = sb
      .from('contacts')
      .select('id, contact_type, first_name, last_name, company_name, title, phones, emails, notes, updated_at')
      .or(`first_name.ilike.${p},last_name.ilike.${p},company_name.ilike.${p}`)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (args.contactType) q = q.eq('contact_type', args.contactType);

    const { data, error } = await q;
    if (error) throw new Error(`find_contact failed: ${error.message}`);

    // Phones/emails JSONB columns might come back as strings or arrays
    // depending on storage. Normalize to arrays.
    const norm = (data ?? []).map((c) => ({
      ...c,
      phones: Array.isArray(c.phones) ? c.phones : [],
      emails: Array.isArray(c.emails) ? c.emails : [],
    }));

    return { count: norm.length, contacts: norm };
  },
} as const;
