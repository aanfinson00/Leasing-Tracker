// =============================================================================
// SERVER-SIDE Supabase client for the MCP server.
//
// Uses the SERVICE ROLE key, not the anon key. This key bypasses every RLS
// policy — that's the whole point: auth + permission live at the MCP layer
// (see mcp/auth.ts), and we trust this server to enforce them before any
// Supabase call.
//
// NEVER import this from `src/` (the Vite frontend) — the bundler would
// ship the service key to the browser. Only `api/` (Vercel serverless
// functions) and `mcp/` should import this.
// =============================================================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) {
    throw new Error('SUPABASE_URL (or VITE_SUPABASE_URL) is not set in this environment');
  }
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. ' +
      'Add it in Vercel → Settings → Environment Variables. ' +
      'Find the key at Supabase → Project Settings → API → service_role.'
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
