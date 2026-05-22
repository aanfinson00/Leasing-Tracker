import { supabase } from '../supabase';
import type { OnboardingChecklist } from '../../types';
import { OnboardingChecklistSchema } from '../../types';
import { onboardingToRow, rowToOnboarding, type OnboardingRow } from './mappers';

const TABLE = 'onboarding_checklists';

export async function listOnboardings(): Promise<OnboardingChecklist[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as OnboardingRow[]).map((r) => {
    const parsed = OnboardingChecklistSchema.safeParse(rowToOnboarding(r));
    if (!parsed.success) {
      console.warn('Dropping unparsable onboarding row:', r, parsed.error.format());
      return null;
    }
    return parsed.data;
  }).filter((o): o is OnboardingChecklist => o !== null);
}

export async function upsertOnboarding(checklist: OnboardingChecklist): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert(onboardingToRow(checklist));
  if (error) throw error;
}

export async function bulkUpsertOnboardings(checklists: OnboardingChecklist[]): Promise<void> {
  if (checklists.length === 0) return;
  const { error } = await supabase.from(TABLE).upsert(checklists.map(onboardingToRow));
  if (error) throw error;
}

export async function deleteOnboarding(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

export async function clearOnboardings(): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw error;
}

export interface OnboardingsRealtimeHandlers {
  onUpsert?: (checklist: OnboardingChecklist) => void;
  onDelete?: (id: string) => void;
}

export function subscribeOnboardings(handlers: OnboardingsRealtimeHandlers): () => void {
  const channel = supabase
    .channel('onboardings-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE },
      (payload) => {
        if (
          (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') &&
          handlers.onUpsert
        ) {
          const parsed = OnboardingChecklistSchema.safeParse(
            rowToOnboarding(payload.new as OnboardingRow)
          );
          if (parsed.success) handlers.onUpsert(parsed.data);
        } else if (payload.eventType === 'DELETE' && handlers.onDelete) {
          const old = payload.old as Partial<OnboardingRow>;
          if (old.id) handlers.onDelete(old.id);
        }
      }
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
