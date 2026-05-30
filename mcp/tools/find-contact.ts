// =============================================================================
// Tool: find_contact
// Read-only. Search contacts by name, company, or company.
// =============================================================================

import { z } from 'zod';
import { getServiceClient } from '../db';
import type { AuthedToken } from '../auth';
import { toMcpInputSchema } from '../lib/zod-input';

const CONTACT_TYPES = [
  'Owner',
  'Broker',
  'Attorney',
  'Title Agent',
  'Consultant',
  'GC',
  'Architect',
  'Other',
] as const;

const argsSchema = z
  .object({
    query: z.string().min(1).describe('Substring matched against first_name / last_name / company_name. Required.'),
    contactType: z.enum(CONTACT_TYPES).describe('Optional filter by contact category.').optional(),
    limit: z.number().int().min(1).max(50).describe('Defaults to 20.').optional(),
  })
  .strict();

type Args = z.infer<typeof argsSchema>;

export const findContactTool = {
  name: 'find_contact',
  description:
    'Search contacts by name (first or last) or company. Use when the user mentions ' +
    'someone by name and you need their record — phone / email / company / role.',
  inputSchema: toMcpInputSchema(argsSchema),

  async handler(args: Args, _token: AuthedToken) {
    const limit = Math.min(args.limit ?? 20, 50);
    const sb = getServiceClient();
    const p = `%${args.query}%`;

    let q = sb
      .from('contacts')
      .select('*')
      .or(`first_name.ilike.${p},last_name.ilike.${p},company_name.ilike.${p}`)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (args.contactType) q = q.eq('contact_type', args.contactType);

    const { data, error } = await q;
    if (error) throw new Error(`find_contact failed: ${error.message}`);

    const norm = (data ?? []).map((c) => ({
      ...c,
      phones: Array.isArray(c.phones) ? c.phones : [],
      emails: Array.isArray(c.emails) ? c.emails : [],
    }));

    return { count: norm.length, contacts: norm };
  },
} as const;
