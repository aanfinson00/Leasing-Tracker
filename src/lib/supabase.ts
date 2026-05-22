import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Supabase client singleton. The URL + publishable (anon) key are baked
// into the bundle at build time. RLS is open for `anon` on every table
// — the passcode gate in LoginGate.tsx is the only access control.
//
// If the env vars are missing we still construct a stub client so the
// app can render in offline / dev mode; calls just fail with a clear
// error instead of crashing on import.

const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const SUPABASE_CONFIGURED = url !== '' && key !== '';

export const supabase: SupabaseClient = createClient(
  url || 'https://placeholder.supabase.co',
  key || 'placeholder-key',
  {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 10 } },
  }
);
