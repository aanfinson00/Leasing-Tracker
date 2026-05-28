// =============================================================================
// Tool: create_contact
//
// Insert a contact row. Phones/emails are channel arrays so the same person
// can have a mobile + office number. The simplest call: just firstName +
// lastName + companyName + one email — Claude tends to know that much from
// any signature block.
// =============================================================================

import { randomUUID } from 'node:crypto';
import { getServiceClient } from '../db';
import type { AuthedToken } from '../auth';

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

interface Channel {
  label: typeof CHANNEL_LABELS[number];
  value: string;
  isPrimary?: boolean;
}

interface CreateContactArgs {
  firstName?: string;
  lastName?: string;
  companyName?: string;
  contactType?: typeof CONTACT_TYPES[number];
  title?: string;
  phones?: Channel[];
  emails?: Channel[];
  notes?: string;
}

function normalizeChannels(input: Channel[] | undefined): Channel[] {
  if (!input || input.length === 0) return [];
  // Ensure exactly one primary; default first row as primary if none flagged.
  const cleaned = input
    .filter((c) => c && c.value?.trim())
    .map((c) => ({
      label: (CHANNEL_LABELS as readonly string[]).includes(c.label) ? c.label : 'other',
      value: c.value.trim(),
      isPrimary: !!c.isPrimary,
    })) as Channel[];
  if (cleaned.length === 0) return [];
  if (!cleaned.some((c) => c.isPrimary)) cleaned[0].isPrimary = true;
  return cleaned;
}

export const createContactTool = {
  name: 'create_contact',
  description:
    'Create a contact. At minimum supply one of firstName / lastName / companyName ' +
    'so the record is searchable. Phones + emails accept multiple channels per ' +
    'person — pass them as arrays of { label, value } objects.',
  inputSchema: {
    type: 'object',
    properties: {
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      companyName: { type: 'string' },
      contactType: { type: 'string', enum: [...CONTACT_TYPES], description: 'Defaults to "Other".' },
      title: { type: 'string' },
      phones: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string', enum: [...CHANNEL_LABELS] },
            value: { type: 'string' },
            isPrimary: { type: 'boolean' },
          },
          required: ['label', 'value'],
        },
      },
      emails: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string', enum: [...CHANNEL_LABELS] },
            value: { type: 'string' },
            isPrimary: { type: 'boolean' },
          },
          required: ['label', 'value'],
        },
      },
      notes: { type: 'string' },
    },
    additionalProperties: false,
  },

  async handler(args: CreateContactArgs, _token: AuthedToken) {
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
    const { data, error } = await sb.from('contacts').insert(row).select().single();
    if (error) throw new Error(`Insert failed: ${error.message}`);

    return { ok: true, contact: data };
  },
} as const;
