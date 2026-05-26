import { supabase } from '../supabase';
import type { SalesComp } from '../../types';
import { SalesCompSchema } from '../../types';
import { salesCompToRow, rowToSalesComp, type SalesCompRow } from './mappers';

const TABLE = 'sales_comps';

export async function listSalesComps(): Promise<SalesComp[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('sale_date', { ascending: false, nullsFirst: false });
  if (error) {
    console.warn('sales_comps query failed (table may not exist):', error.message);
    return [];
  }
  return (data as SalesCompRow[])
    .map((r) => {
      const parsed = SalesCompSchema.safeParse(rowToSalesComp(r));
      if (!parsed.success) {
        console.warn('Dropping unparsable sales comp row:', r, parsed.error.format());
        return null;
      }
      return parsed.data;
    })
    .filter((c): c is SalesComp => c !== null);
}

export async function upsertSalesComp(comp: SalesComp): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert(salesCompToRow(comp));
  if (error) throw error;
}

export async function deleteSalesComp(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

export interface SalesCompsRealtimeHandlers {
  onUpsert?: (c: SalesComp) => void;
  onDelete?: (id: string) => void;
}

export function subscribeSalesComps(
  handlers: SalesCompsRealtimeHandlers
): () => void {
  const channel = supabase
    .channel('sales-comps-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE },
      (payload) => {
        if (
          (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') &&
          handlers.onUpsert
        ) {
          const parsed = SalesCompSchema.safeParse(
            rowToSalesComp(payload.new as SalesCompRow)
          );
          if (parsed.success) handlers.onUpsert(parsed.data);
        } else if (payload.eventType === 'DELETE' && handlers.onDelete) {
          const old = payload.old as Partial<SalesCompRow>;
          if (old.id) handlers.onDelete(old.id);
        }
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
