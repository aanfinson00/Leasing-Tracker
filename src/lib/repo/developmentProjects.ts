import { supabase } from '../supabase';
import type { DevelopmentProject } from '../../types';
import { DevelopmentProjectSchema } from '../../types';
import {
  developmentProjectToRow,
  rowToDevelopmentProject,
  type DevelopmentProjectRow,
} from './mappers';

const TABLE = 'development_projects';

export async function listDevelopmentProjects(): Promise<DevelopmentProject[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('expected_delivery_date', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data as DevelopmentProjectRow[])
    .map((r) => {
      const parsed = DevelopmentProjectSchema.safeParse(rowToDevelopmentProject(r));
      if (!parsed.success) {
        console.warn('Dropping unparsable dev project row:', r, parsed.error.format());
        return null;
      }
      return parsed.data;
    })
    .filter((p): p is DevelopmentProject => p !== null);
}

export async function upsertDevelopmentProject(p: DevelopmentProject): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert(developmentProjectToRow(p));
  if (error) throw error;
}

export async function deleteDevelopmentProject(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

export interface DevProjectsRealtimeHandlers {
  onUpsert?: (p: DevelopmentProject) => void;
  onDelete?: (id: string) => void;
}

export function subscribeDevelopmentProjects(
  handlers: DevProjectsRealtimeHandlers
): () => void {
  const channel = supabase
    .channel('development-projects-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE },
      (payload) => {
        if (
          (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') &&
          handlers.onUpsert
        ) {
          const parsed = DevelopmentProjectSchema.safeParse(
            rowToDevelopmentProject(payload.new as DevelopmentProjectRow)
          );
          if (parsed.success) handlers.onUpsert(parsed.data);
        } else if (payload.eventType === 'DELETE' && handlers.onDelete) {
          const old = payload.old as Partial<DevelopmentProjectRow>;
          if (old.id) handlers.onDelete(old.id);
        }
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
