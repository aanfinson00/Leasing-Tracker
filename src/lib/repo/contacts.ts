import { supabase } from '../supabase';
import type { Contact } from '../../types';
import { ContactSchema } from '../../types';
import { contactToRow, rowToContact, type ContactRow } from './mappers';

const TABLE = 'contacts';

export async function listContacts(): Promise<Contact[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('last_name', { ascending: true, nullsFirst: false })
    .order('first_name', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data as ContactRow[])
    .map((r) => {
      const parsed = ContactSchema.safeParse(rowToContact(r));
      if (!parsed.success) {
        console.warn('Dropping unparsable contact row:', r, parsed.error.format());
        return null;
      }
      return parsed.data;
    })
    .filter((c): c is Contact => c !== null);
}

export async function upsertContact(c: Contact): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert(contactToRow(c));
  if (error) throw error;
}

export async function deleteContact(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

export interface ContactsRealtimeHandlers {
  onUpsert?: (c: Contact) => void;
  onDelete?: (id: string) => void;
}

export function subscribeContacts(handlers: ContactsRealtimeHandlers): () => void {
  const channel = supabase
    .channel('contacts-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, (payload) => {
      if (
        (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') &&
        handlers.onUpsert
      ) {
        const parsed = ContactSchema.safeParse(rowToContact(payload.new as ContactRow));
        if (parsed.success) handlers.onUpsert(parsed.data);
      } else if (payload.eventType === 'DELETE' && handlers.onDelete) {
        const old = payload.old as Partial<ContactRow>;
        if (old.id) handlers.onDelete(old.id);
      }
    })
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
