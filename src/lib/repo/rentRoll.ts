import { supabase } from '../supabase';
import type { RentRollRow } from '../../types';
import { RentRollRowSchema } from '../../types';
import { rentRollToRow, rowToRentRoll, type RentRollDbRow } from './mappers';

const TABLE = 'rent_roll';

export async function listRentRoll(): Promise<RentRollRow[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as RentRollDbRow[]).map((r) => {
    const parsed = RentRollRowSchema.safeParse(rowToRentRoll(r));
    if (!parsed.success) {
      console.warn('Dropping unparsable rent_roll row:', r, parsed.error.format());
      return null;
    }
    return parsed.data;
  }).filter((r): r is RentRollRow => r !== null);
}

export async function upsertRentRoll(row: RentRollRow): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert(rentRollToRow(row));
  if (error) throw error;
}

export async function bulkUpsertRentRoll(rows: RentRollRow[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase.from(TABLE).upsert(rows.map(rentRollToRow));
  if (error) throw error;
}

export async function deleteRentRoll(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

export async function clearRentRoll(): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw error;
}

export interface RentRollRealtimeHandlers {
  onInsert?: (row: RentRollRow) => void;
  onUpdate?: (row: RentRollRow) => void;
  onDelete?: (id: string) => void;
}

export function subscribeRentRoll(handlers: RentRollRealtimeHandlers): () => void {
  const channel = supabase
    .channel('rent-roll-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE },
      (payload) => {
        if (payload.eventType === 'INSERT' && handlers.onInsert) {
          const parsed = RentRollRowSchema.safeParse(rowToRentRoll(payload.new as RentRollDbRow));
          if (parsed.success) handlers.onInsert(parsed.data);
        } else if (payload.eventType === 'UPDATE' && handlers.onUpdate) {
          const parsed = RentRollRowSchema.safeParse(rowToRentRoll(payload.new as RentRollDbRow));
          if (parsed.success) handlers.onUpdate(parsed.data);
        } else if (payload.eventType === 'DELETE' && handlers.onDelete) {
          const old = payload.old as Partial<RentRollDbRow>;
          if (old.id) handlers.onDelete(old.id);
        }
      }
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
