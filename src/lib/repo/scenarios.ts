import { supabase } from '../supabase';
import type { Scenario } from '../../types';
import { ScenarioSchema } from '../../types';
import { scenarioToRow, rowToScenario, type ScenarioRow } from './mappers';

const TABLE = 'scenarios';

export async function listScenariosForDeal(dealId: string): Promise<Scenario[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as ScenarioRow[]).map((r) => {
    const parsed = ScenarioSchema.safeParse(rowToScenario(r));
    if (!parsed.success) {
      console.warn('Dropping unparsable scenario row:', r, parsed.error.format());
      return null;
    }
    return parsed.data;
  }).filter((s): s is Scenario => s !== null);
}

export async function upsertScenario(scenario: Scenario): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert(scenarioToRow(scenario));
  if (error) throw error;
}

export async function deleteScenario(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

export interface ScenariosRealtimeHandlers {
  onUpsert?: (scenario: Scenario) => void;
  onDelete?: (id: string) => void;
}

// Subscribes to ALL scenario changes (not filtered by deal). Callers
// filter in their handler — keeps the channel count down vs. one
// channel per deal.
export function subscribeScenarios(handlers: ScenariosRealtimeHandlers): () => void {
  const channel = supabase
    .channel('scenarios-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE },
      (payload) => {
        if (
          (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') &&
          handlers.onUpsert
        ) {
          const parsed = ScenarioSchema.safeParse(
            rowToScenario(payload.new as ScenarioRow)
          );
          if (parsed.success) handlers.onUpsert(parsed.data);
        } else if (payload.eventType === 'DELETE' && handlers.onDelete) {
          const old = payload.old as Partial<ScenarioRow>;
          if (old.id) handlers.onDelete(old.id);
        }
      }
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
