import { supabase } from '../supabase';
import type { AMPendingItem } from '../../types';
import { AMPendingItemSchema } from '../../types';
import {
  amPendingItemToRow,
  rowToAMPendingItem,
  type AMPendingItemRow,
} from './mappers';

const TABLE = 'am_pending_items';

export async function listAMPendingItems(): Promise<AMPendingItem[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('due_date', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data as AMPendingItemRow[])
    .map((r) => {
      const parsed = AMPendingItemSchema.safeParse(rowToAMPendingItem(r));
      if (!parsed.success) {
        console.warn('Dropping unparsable AM item row:', r, parsed.error.format());
        return null;
      }
      return parsed.data;
    })
    .filter((i): i is AMPendingItem => i !== null);
}

export async function upsertAMPendingItem(item: AMPendingItem): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert(amPendingItemToRow(item));
  if (error) throw error;
}

export async function deleteAMPendingItem(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

export interface AMPendingItemsRealtimeHandlers {
  onUpsert?: (i: AMPendingItem) => void;
  onDelete?: (id: string) => void;
}

export function subscribeAMPendingItems(
  handlers: AMPendingItemsRealtimeHandlers
): () => void {
  const channel = supabase
    .channel('am-pending-items-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE },
      (payload) => {
        if (
          (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') &&
          handlers.onUpsert
        ) {
          const parsed = AMPendingItemSchema.safeParse(
            rowToAMPendingItem(payload.new as AMPendingItemRow)
          );
          if (parsed.success) handlers.onUpsert(parsed.data);
        } else if (payload.eventType === 'DELETE' && handlers.onDelete) {
          const old = payload.old as Partial<AMPendingItemRow>;
          if (old.id) handlers.onDelete(old.id);
        }
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
