-- ───────────────────────────────────────────────────────────────────
-- MCP token expiration support.
--
-- Applied 2026-05-30 ~20:00 UTC via the Supabase MCP.
--
-- Adds an optional expires_at column to mcp_tokens. When set, the
-- bearer-token verification logic in mcp/auth.ts rejects the token
-- once `expires_at` is in the past. NULL = never expires (preserves
-- existing tokens, opt-in for new ones).
--
-- Convention going forward: mint tokens with a 90-day expiry by
-- default. Long-lived bot tokens (CI, scheduled agents) can opt
-- into 180d or NULL on a case-by-case basis.
-- ───────────────────────────────────────────────────────────────────

alter table public.mcp_tokens
  add column if not exists expires_at timestamptz;

-- Index so the expiry check is cheap when we extend it to filtering
-- (e.g., listing tokens expiring in the next 7 days for warning emails).
create index if not exists idx_mcp_tokens_expires_at
  on public.mcp_tokens (expires_at) where expires_at is not null;
