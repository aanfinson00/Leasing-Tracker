import { supabase } from '../supabase';
import type { PropertyTaxAppeal } from '../../types';
import { PropertyTaxAppealSchema } from '../../types';
import {
  propertyTaxAppealToRow,
  rowToPropertyTaxAppeal,
  type PropertyTaxAppealRow,
} from './mappers';

const TABLE = 'property_tax_appeals';

export async function listPropertyTaxAppeals(): Promise<PropertyTaxAppeal[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('tax_year', { ascending: false });
  if (error) throw error;
  return (data as PropertyTaxAppealRow[])
    .map((r) => {
      const parsed = PropertyTaxAppealSchema.safeParse(rowToPropertyTaxAppeal(r));
      if (!parsed.success) {
        console.warn('Dropping unparsable appeal row:', r, parsed.error.format());
        return null;
      }
      return parsed.data;
    })
    .filter((a): a is PropertyTaxAppeal => a !== null);
}

export async function upsertPropertyTaxAppeal(appeal: PropertyTaxAppeal): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert(propertyTaxAppealToRow(appeal));
  if (error) throw error;
}

export async function deletePropertyTaxAppeal(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

export interface PropertyTaxAppealsRealtimeHandlers {
  onUpsert?: (appeal: PropertyTaxAppeal) => void;
  onDelete?: (id: string) => void;
}

export function subscribePropertyTaxAppeals(
  handlers: PropertyTaxAppealsRealtimeHandlers
): () => void {
  const channel = supabase
    .channel('property-tax-appeals-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE },
      (payload) => {
        if (
          (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') &&
          handlers.onUpsert
        ) {
          const parsed = PropertyTaxAppealSchema.safeParse(
            rowToPropertyTaxAppeal(payload.new as PropertyTaxAppealRow)
          );
          if (parsed.success) handlers.onUpsert(parsed.data);
        } else if (payload.eventType === 'DELETE' && handlers.onDelete) {
          const old = payload.old as Partial<PropertyTaxAppealRow>;
          if (old.id) handlers.onDelete(old.id);
        }
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
