import { supabase } from '../supabase';
import type { DevProjectNote } from '../../types';
import { DevProjectNoteSchema } from '../../types';
import {
  devProjectNoteToRow,
  rowToDevProjectNote,
  type DevProjectNoteRow,
} from './mappers';

const TABLE = 'dev_project_notes';

export async function listDevProjectNotes(): Promise<DevProjectNote[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as DevProjectNoteRow[])
    .map((r) => {
      const parsed = DevProjectNoteSchema.safeParse(rowToDevProjectNote(r));
      if (!parsed.success) {
        console.warn('Dropping unparsable dev_project_note row:', r, parsed.error.format());
        return null;
      }
      return parsed.data;
    })
    .filter((n): n is DevProjectNote => n !== null);
}

export async function upsertDevProjectNote(n: DevProjectNote): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert(devProjectNoteToRow(n));
  if (error) throw error;
}

export async function deleteDevProjectNote(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

export interface DevProjectNotesRealtimeHandlers {
  onUpsert?: (n: DevProjectNote) => void;
  onDelete?: (id: string) => void;
}

export function subscribeDevProjectNotes(
  handlers: DevProjectNotesRealtimeHandlers
): () => void {
  const channel = supabase
    .channel('dev-project-notes-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, (payload) => {
      if (
        (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') &&
        handlers.onUpsert
      ) {
        const parsed = DevProjectNoteSchema.safeParse(
          rowToDevProjectNote(payload.new as DevProjectNoteRow)
        );
        if (parsed.success) handlers.onUpsert(parsed.data);
      } else if (payload.eventType === 'DELETE' && handlers.onDelete) {
        const old = payload.old as Partial<DevProjectNoteRow>;
        if (old.id) handlers.onDelete(old.id);
      }
    })
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
