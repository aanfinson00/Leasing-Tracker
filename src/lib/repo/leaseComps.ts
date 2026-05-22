import { supabase } from '../supabase';
import type { LeaseComp } from '../../types';
import { LeaseCompSchema } from '../../types';
import { leaseCompToRow, rowToLeaseComp, type LeaseCompRow } from './mappers';

const TABLE = 'lease_comps';

export async function listLeaseComps(): Promise<LeaseComp[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('signed_date', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data as LeaseCompRow[])
    .map((r) => {
      const parsed = LeaseCompSchema.safeParse(rowToLeaseComp(r));
      if (!parsed.success) {
        console.warn('Dropping unparsable lease comp row:', r, parsed.error.format());
        return null;
      }
      return parsed.data;
    })
    .filter((c): c is LeaseComp => c !== null);
}

export async function upsertLeaseComp(comp: LeaseComp): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert(leaseCompToRow(comp));
  if (error) throw error;
}

export async function deleteLeaseComp(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

export interface LeaseCompsRealtimeHandlers {
  onUpsert?: (c: LeaseComp) => void;
  onDelete?: (id: string) => void;
}

export function subscribeLeaseComps(
  handlers: LeaseCompsRealtimeHandlers
): () => void {
  const channel = supabase
    .channel('lease-comps-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE },
      (payload) => {
        if (
          (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') &&
          handlers.onUpsert
        ) {
          const parsed = LeaseCompSchema.safeParse(
            rowToLeaseComp(payload.new as LeaseCompRow)
          );
          if (parsed.success) handlers.onUpsert(parsed.data);
        } else if (payload.eventType === 'DELETE' && handlers.onDelete) {
          const old = payload.old as Partial<LeaseCompRow>;
          if (old.id) handlers.onDelete(old.id);
        }
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
