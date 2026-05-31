import { supabase } from '../supabase';
import type { Space } from '../../types';
import { SpaceSchema } from '../../types';
import { spaceToRow, rowToSpace, type SpaceRow } from './mappers';

const TABLE = 'spaces';

export async function listSpacesForBuilding(buildingUuid: string): Promise<Space[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('building_uuid', buildingUuid)
    .order('bay_index', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return parseSpaceRows(data as SpaceRow[]);
}

export async function listAllSpaces(): Promise<Space[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return parseSpaceRows(data as SpaceRow[]);
}

export async function getSpace(id: string): Promise<Space | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const parsed = SpaceSchema.safeParse(rowToSpace(data as SpaceRow));
  if (!parsed.success) {
    console.warn('Dropping unparsable space row:', data, parsed.error.format());
    return null;
  }
  return parsed.data;
}

export async function upsertSpace(s: Space): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert(spaceToRow(s));
  if (error) throw error;
}

export async function deleteSpace(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

export interface SpacesRealtimeHandlers {
  onUpsert?: (s: Space) => void;
  onDelete?: (id: string) => void;
}

export function subscribeSpaces(handlers: SpacesRealtimeHandlers): () => void {
  const channel = supabase
    .channel(`spaces-changes-${crypto.randomUUID()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE },
      (payload) => {
        if (
          (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') &&
          handlers.onUpsert
        ) {
          const parsed = SpaceSchema.safeParse(
            rowToSpace(payload.new as SpaceRow)
          );
          if (parsed.success) handlers.onUpsert(parsed.data);
        } else if (payload.eventType === 'DELETE' && handlers.onDelete) {
          const old = payload.old as Partial<SpaceRow>;
          if (old.id) handlers.onDelete(old.id);
        }
      }
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

function parseSpaceRows(rows: SpaceRow[]): Space[] {
  return rows.map((r) => {
    const parsed = SpaceSchema.safeParse(rowToSpace(r));
    if (!parsed.success) {
      console.warn('Dropping unparsable space row:', r, parsed.error.format());
      return null;
    }
    return parsed.data;
  }).filter((s): s is Space => s !== null);
}
