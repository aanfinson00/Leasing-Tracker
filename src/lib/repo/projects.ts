import { supabase } from '../supabase';
import type { Project } from '../../types';
import { ProjectSchema } from '../../types';
import { projectToRow, rowToProject, type ProjectRow } from './mappers';

const TABLE = 'projects';

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('project_code', { ascending: true });
  if (error) throw error;
  return (data as ProjectRow[]).map((r) => {
    const parsed = ProjectSchema.safeParse(rowToProject(r));
    if (!parsed.success) {
      console.warn('Dropping unparsable project row:', r, parsed.error.format());
      return null;
    }
    return parsed.data;
  }).filter((p): p is Project => p !== null);
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const parsed = ProjectSchema.safeParse(rowToProject(data as ProjectRow));
  if (!parsed.success) {
    console.warn('Dropping unparsable project row:', data, parsed.error.format());
    return null;
  }
  return parsed.data;
}

export async function upsertProject(p: Project): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert(projectToRow(p));
  if (error) throw error;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

export interface ProjectsRealtimeHandlers {
  onUpsert?: (p: Project) => void;
  onDelete?: (id: string) => void;
}

export function subscribeProjects(handlers: ProjectsRealtimeHandlers): () => void {
  const channel = supabase
    .channel(`projects-changes-${crypto.randomUUID()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE },
      (payload) => {
        if (
          (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') &&
          handlers.onUpsert
        ) {
          const parsed = ProjectSchema.safeParse(
            rowToProject(payload.new as ProjectRow)
          );
          if (parsed.success) handlers.onUpsert(parsed.data);
        } else if (payload.eventType === 'DELETE' && handlers.onDelete) {
          const old = payload.old as Partial<ProjectRow>;
          if (old.id) handlers.onDelete(old.id);
        }
      }
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
