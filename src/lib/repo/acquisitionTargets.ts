import { supabase } from '../supabase';
import type {
  AcquisitionTarget,
  AcquisitionTargetContact,
  AcquisitionTargetNote,
} from '../../types';
import {
  AcquisitionTargetSchema,
  AcquisitionTargetContactSchema,
  AcquisitionTargetNoteSchema,
} from '../../types';
import {
  acquisitionTargetToRow,
  rowToAcquisitionTarget,
  type AcquisitionTargetRow,
  acquisitionTargetContactToRow,
  rowToAcquisitionTargetContact,
  type AcquisitionTargetContactRow,
  acquisitionTargetNoteToRow,
  rowToAcquisitionTargetNote,
  type AcquisitionTargetNoteRow,
} from './mappers';

// ── Targets ───────────────────────────────────────────────────────

const TARGETS = 'acquisition_targets';

export async function listAcquisitionTargets(): Promise<AcquisitionTarget[]> {
  const { data, error } = await supabase
    .from(TARGETS)
    .select('*')
    .order('expected_closing_date', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data as AcquisitionTargetRow[])
    .map((r) => {
      const parsed = AcquisitionTargetSchema.safeParse(rowToAcquisitionTarget(r));
      if (!parsed.success) {
        console.warn('Dropping unparsable acquisition_target row:', r, parsed.error.format());
        return null;
      }
      return parsed.data;
    })
    .filter((a): a is AcquisitionTarget => a !== null);
}

export async function upsertAcquisitionTarget(a: AcquisitionTarget): Promise<void> {
  const { error } = await supabase.from(TARGETS).upsert(acquisitionTargetToRow(a));
  if (error) throw error;
}

export async function deleteAcquisitionTarget(id: string): Promise<void> {
  const { error } = await supabase.from(TARGETS).delete().eq('id', id);
  if (error) throw error;
}

export interface AcquisitionTargetsRealtimeHandlers {
  onUpsert?: (a: AcquisitionTarget) => void;
  onDelete?: (id: string) => void;
}

export function subscribeAcquisitionTargets(
  handlers: AcquisitionTargetsRealtimeHandlers
): () => void {
  const channel = supabase
    .channel('acquisition-targets-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: TARGETS }, (payload) => {
      if (
        (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') &&
        handlers.onUpsert
      ) {
        const parsed = AcquisitionTargetSchema.safeParse(
          rowToAcquisitionTarget(payload.new as AcquisitionTargetRow)
        );
        if (parsed.success) handlers.onUpsert(parsed.data);
      } else if (payload.eventType === 'DELETE' && handlers.onDelete) {
        const old = payload.old as Partial<AcquisitionTargetRow>;
        if (old.id) handlers.onDelete(old.id);
      }
    })
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// ── Contact links ─────────────────────────────────────────────────

const CONTACTS = 'acquisition_target_contacts';

export async function listAcquisitionTargetContacts(): Promise<AcquisitionTargetContact[]> {
  const { data, error } = await supabase
    .from(CONTACTS)
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as AcquisitionTargetContactRow[])
    .map((r) => {
      const parsed = AcquisitionTargetContactSchema.safeParse(
        rowToAcquisitionTargetContact(r)
      );
      if (!parsed.success) {
        console.warn('Dropping unparsable atc row:', r, parsed.error.format());
        return null;
      }
      return parsed.data;
    })
    .filter((c): c is AcquisitionTargetContact => c !== null);
}

export async function upsertAcquisitionTargetContact(r: AcquisitionTargetContact): Promise<void> {
  const { error } = await supabase.from(CONTACTS).upsert(acquisitionTargetContactToRow(r));
  if (error) throw error;
}

export async function deleteAcquisitionTargetContact(id: string): Promise<void> {
  const { error } = await supabase.from(CONTACTS).delete().eq('id', id);
  if (error) throw error;
}

export function subscribeAcquisitionTargetContacts(handlers: {
  onUpsert?: (r: AcquisitionTargetContact) => void;
  onDelete?: (id: string) => void;
}): () => void {
  const channel = supabase
    .channel('acquisition-target-contacts-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: CONTACTS }, (payload) => {
      if (
        (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') &&
        handlers.onUpsert
      ) {
        const parsed = AcquisitionTargetContactSchema.safeParse(
          rowToAcquisitionTargetContact(payload.new as AcquisitionTargetContactRow)
        );
        if (parsed.success) handlers.onUpsert(parsed.data);
      } else if (payload.eventType === 'DELETE' && handlers.onDelete) {
        const old = payload.old as Partial<AcquisitionTargetContactRow>;
        if (old.id) handlers.onDelete(old.id);
      }
    })
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// ── Notes ─────────────────────────────────────────────────────────

const NOTES = 'acquisition_target_notes';

export async function listAcquisitionTargetNotes(): Promise<AcquisitionTargetNote[]> {
  const { data, error } = await supabase
    .from(NOTES)
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as AcquisitionTargetNoteRow[])
    .map((r) => {
      const parsed = AcquisitionTargetNoteSchema.safeParse(rowToAcquisitionTargetNote(r));
      if (!parsed.success) {
        console.warn('Dropping unparsable atn row:', r, parsed.error.format());
        return null;
      }
      return parsed.data;
    })
    .filter((n): n is AcquisitionTargetNote => n !== null);
}

export async function upsertAcquisitionTargetNote(n: AcquisitionTargetNote): Promise<void> {
  const { error } = await supabase.from(NOTES).upsert(acquisitionTargetNoteToRow(n));
  if (error) throw error;
}

export async function deleteAcquisitionTargetNote(id: string): Promise<void> {
  const { error } = await supabase.from(NOTES).delete().eq('id', id);
  if (error) throw error;
}

export function subscribeAcquisitionTargetNotes(handlers: {
  onUpsert?: (n: AcquisitionTargetNote) => void;
  onDelete?: (id: string) => void;
}): () => void {
  const channel = supabase
    .channel('acquisition-target-notes-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: NOTES }, (payload) => {
      if (
        (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') &&
        handlers.onUpsert
      ) {
        const parsed = AcquisitionTargetNoteSchema.safeParse(
          rowToAcquisitionTargetNote(payload.new as AcquisitionTargetNoteRow)
        );
        if (parsed.success) handlers.onUpsert(parsed.data);
      } else if (payload.eventType === 'DELETE' && handlers.onDelete) {
        const old = payload.old as Partial<AcquisitionTargetNoteRow>;
        if (old.id) handlers.onDelete(old.id);
      }
    })
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
