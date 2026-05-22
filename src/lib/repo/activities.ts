import { supabase } from '../supabase';
import type { ActivityEntry } from '../../types';
import { ActivityEntrySchema } from '../../types';
import { activityToRow, rowToActivity, type ActivityRow } from './mappers';

const TABLE = 'activities';

export async function listActivities(): Promise<ActivityEntry[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as ActivityRow[]).map((r) => {
    const parsed = ActivityEntrySchema.safeParse(rowToActivity(r));
    if (!parsed.success) {
      console.warn('Dropping unparsable activity row:', r, parsed.error.format());
      return null;
    }
    return parsed.data;
  }).filter((a): a is ActivityEntry => a !== null);
}

export async function insertActivity(entry: ActivityEntry): Promise<void> {
  const { error } = await supabase.from(TABLE).insert(activityToRow(entry));
  if (error) throw error;
}

// Re-parenting an activity (e.g. when a Prospect promotes to Rent Roll)
// needs an in-place update. Upsert by id keeps the original created_at.
export async function upsertActivity(entry: ActivityEntry): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert(activityToRow(entry));
  if (error) throw error;
}

export async function bulkInsertActivities(entries: ActivityEntry[]): Promise<void> {
  if (entries.length === 0) return;
  const { error } = await supabase.from(TABLE).insert(entries.map(activityToRow));
  if (error) throw error;
}

export async function deleteActivity(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

export async function clearActivities(): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw error;
}

export interface ActivitiesRealtimeHandlers {
  onInsert?: (entry: ActivityEntry) => void;
  onDelete?: (id: string) => void;
}

export function subscribeActivities(handlers: ActivitiesRealtimeHandlers): () => void {
  const channel = supabase
    .channel('activities-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE },
      (payload) => {
        if (payload.eventType === 'INSERT' && handlers.onInsert) {
          const parsed = ActivityEntrySchema.safeParse(rowToActivity(payload.new as ActivityRow));
          if (parsed.success) handlers.onInsert(parsed.data);
        } else if (payload.eventType === 'DELETE' && handlers.onDelete) {
          const old = payload.old as Partial<ActivityRow>;
          if (old.id) handlers.onDelete(old.id);
        }
      }
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
