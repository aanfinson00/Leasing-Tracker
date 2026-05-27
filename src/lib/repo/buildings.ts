import { supabase } from '../supabase';
import type { Building } from '../../types';
import { BuildingSchema } from '../../types';
import { buildingToRow, rowToBuilding, type BuildingRow } from './mappers';

const TABLE = 'buildings';

export async function listBuildingsForProject(projectId: string): Promise<Building[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as BuildingRow[]).map((r) => {
    const parsed = BuildingSchema.safeParse(rowToBuilding(r));
    if (!parsed.success) {
      console.warn('Dropping unparsable building row:', r, parsed.error.format());
      return null;
    }
    return parsed.data;
  }).filter((b): b is Building => b !== null);
}

/** All buildings across all projects — for the global map render. */
export async function listAllBuildings(): Promise<Building[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as BuildingRow[]).map((r) => {
    const parsed = BuildingSchema.safeParse(rowToBuilding(r));
    if (!parsed.success) {
      console.warn('Dropping unparsable building row:', r, parsed.error.format());
      return null;
    }
    return parsed.data;
  }).filter((b): b is Building => b !== null);
}

export async function upsertBuilding(b: Building): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert(buildingToRow(b));
  if (error) throw error;
}

export async function deleteBuilding(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

export interface BuildingsRealtimeHandlers {
  onUpsert?: (b: Building) => void;
  onDelete?: (id: string) => void;
}

// Subscribes to ALL building changes; the handler filters by the
// currently-active project (mirrors the scenarios subscribe pattern).
//
// Channel name is randomized per call. The Supabase Realtime client
// caches channels by name — two subscribers using the same name share
// one underlying channel, and the second `.on()` call fires AFTER the
// first `.subscribe()`, which Realtime forbids ("cannot add
// postgres_changes callbacks after subscribe()"). App.tsx and MapView
// both subscribe to buildings, so a static name crashes the second
// mount. Per-call UUIDs give each subscriber its own channel.
export function subscribeBuildings(handlers: BuildingsRealtimeHandlers): () => void {
  const channel = supabase
    .channel(`buildings-changes-${crypto.randomUUID()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE },
      (payload) => {
        if (
          (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') &&
          handlers.onUpsert
        ) {
          const parsed = BuildingSchema.safeParse(
            rowToBuilding(payload.new as BuildingRow)
          );
          if (parsed.success) handlers.onUpsert(parsed.data);
        } else if (payload.eventType === 'DELETE' && handlers.onDelete) {
          const old = payload.old as Partial<BuildingRow>;
          if (old.id) handlers.onDelete(old.id);
        }
      }
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
