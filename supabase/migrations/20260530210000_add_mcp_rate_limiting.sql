-- ───────────────────────────────────────────────────────────────────
-- MCP per-token rate limiting (Supabase-based, no Redis).
--
-- Applied 2026-05-30 ~21:00 UTC via the Supabase MCP.
--
-- Design: per-minute sliding window stored on mcp_tokens itself
-- (no new table). Atomic increment + check via a single SECURITY
-- DEFINER function so two concurrent requests can't both see "count < limit"
-- and both pass. Default cap: 60 req/min per token (≈ 1/sec interactive).
--
-- To change the per-minute cap for a specific token (e.g., a high-throughput
-- bot), pass a different `max_per_window` from auth.ts on a per-call basis.
-- ───────────────────────────────────────────────────────────────────

alter table public.mcp_tokens
  add column if not exists rate_window_start timestamptz,
  add column if not exists rate_window_count integer not null default 0;

create or replace function public.bump_mcp_rate_limit(
  p_token_id uuid,
  p_window_start timestamptz,
  p_max_per_window integer
)
returns table (new_count integer, exceeded boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  -- Single atomic UPDATE handles both reset-on-new-window and increment.
  update public.mcp_tokens
    set rate_window_count = case
      when rate_window_start is null or rate_window_start < p_window_start then 1
      else rate_window_count + 1
    end,
    rate_window_start = case
      when rate_window_start is null or rate_window_start < p_window_start then p_window_start
      else rate_window_start
    end
    where id = p_token_id
    returning rate_window_count into v_count;

  return query select v_count, v_count > p_max_per_window;
end;
$$;

-- Service role calls it; anon should never reach it.
revoke all on function public.bump_mcp_rate_limit(uuid, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.bump_mcp_rate_limit(uuid, timestamptz, integer) to service_role;
