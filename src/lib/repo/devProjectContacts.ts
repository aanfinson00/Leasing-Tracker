import { supabase } from '../supabase';
import type { DevProjectContact } from '../../types';
import { DevProjectContactSchema } from '../../types';
import {
  devProjectContactToRow,
  rowToDevProjectContact,
  type DevProjectContactRow,
} from './mappers';

const TABLE = 'dev_project_contacts';

export async function listDevProjectContacts(): Promise<DevProjectContact[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as DevProjectContactRow[])
    .map((r) => {
      const parsed = DevProjectContactSchema.safeParse(rowToDevProjectContact(r));
      if (!parsed.success) {
        console.warn('Dropping unparsable dev_project_contact row:', r, parsed.error.format());
        return null;
      }
      return parsed.data;
    })
    .filter((r): r is DevProjectContact => r !== null);
}

export async function upsertDevProjectContact(r: DevProjectContact): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert(devProjectContactToRow(r));
  if (error) throw error;
}

export async function deleteDevProjectContact(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

export interface DevProjectContactsRealtimeHandlers {
  onUpsert?: (r: DevProjectContact) => void;
  onDelete?: (id: string) => void;
}

export function subscribeDevProjectContacts(
  handlers: DevProjectContactsRealtimeHandlers
): () => void {
  const channel = supabase
    .channel('dev-project-contacts-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, (payload) => {
      if (
        (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') &&
        handlers.onUpsert
      ) {
        const parsed = DevProjectContactSchema.safeParse(
          rowToDevProjectContact(payload.new as DevProjectContactRow)
        );
        if (parsed.success) handlers.onUpsert(parsed.data);
      } else if (payload.eventType === 'DELETE' && handlers.onDelete) {
        const old = payload.old as Partial<DevProjectContactRow>;
        if (old.id) handlers.onDelete(old.id);
      }
    })
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
