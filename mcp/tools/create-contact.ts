// =============================================================================
// Tool: create_contact
// Insert a contact with phones + emails as channel arrays.
// =============================================================================

import { randomUUID } from 'node:crypto';
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

const CHANNEL_LABELS = ['mobile', 'work', 'home', 'other'] as const;

const channelSchema = z.object({
  label: z.enum(CHANNEL_LABELS),
  value: z.string(),
  isPrimary: z.boolean().optional(),
});

const argsSchema = z
  .object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    companyName: z.string().optional(),
    contactType: z.enum(CONTACT_TYPES).describe('Defaults to "Other".').optional(),
    title: z.string().optional(),
    phones: z.array(channelSchema).optional(),
    emails: z.array(channelSchema).optional(),
    notes: z.string().optional(),
  })
  .strict();

type Args = z.infer<typeof argsSchema>;
type Channel = z.infer<typeof channelSchema>;

function normalizeChannels(input: Channel[] | undefined): Channel[] {
  if (!input || input.length === 0) return [];
  const cleaned = input
    .filter((c) => c?.value?.trim())
    .map((c) => ({ label: c.label, value: c.value.trim(), isPrimary: !!c.isPrimary }));
  if (cleaned.length === 0) return [];
  if (!cleaned.some((c) => c.isPrimary)) cleaned[0].isPrimary = true;
  return cleaned;
}

export const createContactTool = {
  name: 'create_contact',
  description:
    'Create a contact. At minimum supply one of firstName / lastName / companyName ' +
    'so the record is searchable. Phones + emails accept multiple channels per person.',
  inputSchema: toMcpInputSchema(argsSchema),

  async handler(args: Args, _token: AuthedToken) {
    if (!args.firstName && !args.lastName && !args.companyName) {
      throw new Error('Supply at least one of firstName / lastName / companyName.');
    }

    const row = {
      id: randomUUID(),
      contact_type: args.contactType ?? 'Other',
      first_name: args.firstName ?? null,
      last_name: args.lastName ?? null,
      company_name: args.companyName ?? null,
      title: args.title ?? null,
      phones: normalizeChannels(args.phones),
      emails: normalizeChannels(args.emails),
      notes: args.notes ?? null,
    };

    const sb = getServiceClient();
    const { data, error } = await sb.from('contacts').insert(row).select('*').single();
    if (error) throw new Error(`Insert failed: ${error.message}`);

    return { ok: true, contact: data };
  },
} as const;
