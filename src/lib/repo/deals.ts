import { supabase } from '../supabase';
import type { Deal } from '../../types';
import { DealSchema } from '../../types';
import { dealToRow, rowToDeal, type DealRow } from './mappers';

const TABLE = 'deals';

export async function listDeals(): Promise<Deal[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as DealRow[]).map((r) => {
    const parsed = DealSchema.safeParse(rowToDeal(r));
    if (!parsed.success) {
      console.warn('Dropping unparsable deal row:', r, parsed.error.format());
      return null;
    }
    return parsed.data;
  }).filter((d): d is Deal => d !== null);
}

export async function upsertDeal(deal: Deal): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert(dealToRow(deal));
  if (error) throw error;
}

export async function bulkUpsertDeals(deals: Deal[]): Promise<void> {
  if (deals.length === 0) return;
  const { error } = await supabase.from(TABLE).upsert(deals.map(dealToRow));
  if (error) throw error;
}

export async function deleteDeal(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

export async function clearDeals(): Promise<void> {
  // `neq` against a value no row can match — safer than `delete()` without
  // a filter, which Supabase rejects by default.
  const { error } = await supabase.from(TABLE).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw error;
}

export interface DealsRealtimeHandlers {
  onInsert?: (deal: Deal) => void;
  onUpdate?: (deal: Deal) => void;
  onDelete?: (id: string) => void;
}

export function subscribeDeals(handlers: DealsRealtimeHandlers): () => void {
  const channel = supabase
    .channel('deals-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE },
      (payload) => {
        if (payload.eventType === 'INSERT' && handlers.onInsert) {
          const parsed = DealSchema.safeParse(rowToDeal(payload.new as DealRow));
          if (parsed.success) handlers.onInsert(parsed.data);
        } else if (payload.eventType === 'UPDATE' && handlers.onUpdate) {
          const parsed = DealSchema.safeParse(rowToDeal(payload.new as DealRow));
          if (parsed.success) handlers.onUpdate(parsed.data);
        } else if (payload.eventType === 'DELETE' && handlers.onDelete) {
          const old = payload.old as Partial<DealRow>;
          if (old.id) handlers.onDelete(old.id);
        }
      }
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
