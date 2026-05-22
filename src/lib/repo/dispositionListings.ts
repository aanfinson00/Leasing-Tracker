import { supabase } from '../supabase';
import type {
  DispositionListing,
  DispositionListingContact,
  DispositionListingNote,
} from '../../types';
import {
  DispositionListingSchema,
  DispositionListingContactSchema,
  DispositionListingNoteSchema,
} from '../../types';
import {
  dispositionListingToRow,
  rowToDispositionListing,
  type DispositionListingRow,
  dispositionListingContactToRow,
  rowToDispositionListingContact,
  type DispositionListingContactRow,
  dispositionListingNoteToRow,
  rowToDispositionListingNote,
  type DispositionListingNoteRow,
} from './mappers';

const LISTINGS = 'disposition_listings';
const LISTING_CONTACTS = 'disposition_listing_contacts';
const LISTING_NOTES = 'disposition_listing_notes';

// ── Listings ──────────────────────────────────────────────────────

export async function listDispositionListings(): Promise<DispositionListing[]> {
  const { data, error } = await supabase
    .from(LISTINGS)
    .select('*')
    .order('expected_closing_date', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data as DispositionListingRow[])
    .map((r) => {
      const parsed = DispositionListingSchema.safeParse(rowToDispositionListing(r));
      if (!parsed.success) {
        console.warn('Dropping unparsable disposition_listing row:', r, parsed.error.format());
        return null;
      }
      return parsed.data;
    })
    .filter((d): d is DispositionListing => d !== null);
}

export async function upsertDispositionListing(d: DispositionListing): Promise<void> {
  const { error } = await supabase.from(LISTINGS).upsert(dispositionListingToRow(d));
  if (error) throw error;
}

export async function deleteDispositionListing(id: string): Promise<void> {
  const { error } = await supabase.from(LISTINGS).delete().eq('id', id);
  if (error) throw error;
}

export function subscribeDispositionListings(handlers: {
  onUpsert?: (d: DispositionListing) => void;
  onDelete?: (id: string) => void;
}): () => void {
  const channel = supabase
    .channel('disposition-listings-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: LISTINGS }, (payload) => {
      if (
        (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') &&
        handlers.onUpsert
      ) {
        const parsed = DispositionListingSchema.safeParse(
          rowToDispositionListing(payload.new as DispositionListingRow)
        );
        if (parsed.success) handlers.onUpsert(parsed.data);
      } else if (payload.eventType === 'DELETE' && handlers.onDelete) {
        const old = payload.old as Partial<DispositionListingRow>;
        if (old.id) handlers.onDelete(old.id);
      }
    })
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// ── Contact links ─────────────────────────────────────────────────

export async function listDispositionListingContacts(): Promise<DispositionListingContact[]> {
  const { data, error } = await supabase
    .from(LISTING_CONTACTS)
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as DispositionListingContactRow[])
    .map((r) => {
      const parsed = DispositionListingContactSchema.safeParse(
        rowToDispositionListingContact(r)
      );
      if (!parsed.success) {
        console.warn('Dropping unparsable dlc row:', r, parsed.error.format());
        return null;
      }
      return parsed.data;
    })
    .filter((c): c is DispositionListingContact => c !== null);
}

export async function upsertDispositionListingContact(
  r: DispositionListingContact
): Promise<void> {
  const { error } = await supabase
    .from(LISTING_CONTACTS)
    .upsert(dispositionListingContactToRow(r));
  if (error) throw error;
}

export async function deleteDispositionListingContact(id: string): Promise<void> {
  const { error } = await supabase.from(LISTING_CONTACTS).delete().eq('id', id);
  if (error) throw error;
}

export function subscribeDispositionListingContacts(handlers: {
  onUpsert?: (r: DispositionListingContact) => void;
  onDelete?: (id: string) => void;
}): () => void {
  const channel = supabase
    .channel('disposition-listing-contacts-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: LISTING_CONTACTS }, (payload) => {
      if (
        (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') &&
        handlers.onUpsert
      ) {
        const parsed = DispositionListingContactSchema.safeParse(
          rowToDispositionListingContact(payload.new as DispositionListingContactRow)
        );
        if (parsed.success) handlers.onUpsert(parsed.data);
      } else if (payload.eventType === 'DELETE' && handlers.onDelete) {
        const old = payload.old as Partial<DispositionListingContactRow>;
        if (old.id) handlers.onDelete(old.id);
      }
    })
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// ── Notes ─────────────────────────────────────────────────────────

export async function listDispositionListingNotes(): Promise<DispositionListingNote[]> {
  const { data, error } = await supabase
    .from(LISTING_NOTES)
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as DispositionListingNoteRow[])
    .map((r) => {
      const parsed = DispositionListingNoteSchema.safeParse(rowToDispositionListingNote(r));
      if (!parsed.success) {
        console.warn('Dropping unparsable dln row:', r, parsed.error.format());
        return null;
      }
      return parsed.data;
    })
    .filter((n): n is DispositionListingNote => n !== null);
}

export async function upsertDispositionListingNote(n: DispositionListingNote): Promise<void> {
  const { error } = await supabase.from(LISTING_NOTES).upsert(dispositionListingNoteToRow(n));
  if (error) throw error;
}

export async function deleteDispositionListingNote(id: string): Promise<void> {
  const { error } = await supabase.from(LISTING_NOTES).delete().eq('id', id);
  if (error) throw error;
}

export function subscribeDispositionListingNotes(handlers: {
  onUpsert?: (n: DispositionListingNote) => void;
  onDelete?: (id: string) => void;
}): () => void {
  const channel = supabase
    .channel('disposition-listing-notes-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: LISTING_NOTES }, (payload) => {
      if (
        (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') &&
        handlers.onUpsert
      ) {
        const parsed = DispositionListingNoteSchema.safeParse(
          rowToDispositionListingNote(payload.new as DispositionListingNoteRow)
        );
        if (parsed.success) handlers.onUpsert(parsed.data);
      } else if (payload.eventType === 'DELETE' && handlers.onDelete) {
        const old = payload.old as Partial<DispositionListingNoteRow>;
        if (old.id) handlers.onDelete(old.id);
      }
    })
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
