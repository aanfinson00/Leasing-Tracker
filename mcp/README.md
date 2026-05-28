# Leasing-Tracker MCP server

This folder + `api/mcp.ts` is a tiny **Model Context Protocol** server. Once
deployed and connected to Claude (`claude.ai` or Claude Code), it exposes
typed tools like `list_deals`, `create_deal`, `add_activity_to_deal` that
Claude can call directly — no Excel-shuttling.

**Status**: Session 1 — one read-only tool (`list_deals`). Sessions 2-3
add the write tools + permission tiers.

## How the pieces fit

```
                   ┌────────────────────────────────────────────────┐
                   │  Claude (Claude.ai web, Desktop, or Code)      │
                   │                                                │
                   │  User: "Show me my executed Caliber deals"     │
                   │  Claude picks tool: list_deals({                │
                   │    status: "Executed", search: "Caliber"       │
                   │  })                                            │
                   └────────────────────────┬───────────────────────┘
                                            │  HTTPS POST /api/mcp
                                            │  Authorization: Bearer <token>
                                            │  body: JSON-RPC envelope
                                            ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │  Vercel function (api/mcp.ts)                                    │
   │                                                                  │
   │   verifyBearer()       — mcp/auth.ts                             │
   │   buildServer(token)   — mcp/server.ts                           │
   │   StreamableHTTPServerTransport — official @modelcontextprotocol │
   │   tool handler         — mcp/tools/list-deals.ts                 │
   │                                                                  │
   │   writeAuditLog()      — mcp/audit.ts (fire-and-forget)          │
   └────────────────────────┬─────────────────────────────────────────┘
                            │  PostgREST query
                            ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │  Supabase (service-role key bypasses RLS;                        │
   │            auth + permission live in the MCP layer above)        │
   │                                                                  │
   │  Tables: deals, rent_roll, dev_projects, …, mcp_tokens,          │
   │          mcp_audit_log                                           │
   └──────────────────────────────────────────────────────────────────┘
```

## File-by-file

| File | What it does |
|---|---|
| `api/mcp.ts` | Vercel serverless entrypoint. One handler — auth, build server, hand to the SDK transport. |
| `mcp/auth.ts` | Bearer token → SHA-256 → `mcp_tokens` lookup → `AuthedToken` or 401/403. |
| `mcp/db.ts` | Server-only Supabase client using the service role key. **Never imported from `src/`.** |
| `mcp/server.ts` | MCP `Server` setup. Lists tools (`tools/list`) and routes calls (`tools/call`). Adding a tool = push to `TOOLS`. |
| `mcp/audit.ts` | Writes one row per tool call to `mcp_audit_log`. |
| `mcp/tools/list-deals.ts` | First (read-only) tool. The pattern every future tool will copy. |

## Deploy + connect (10 minutes)

### 1. Set the service-role key in Vercel

Find it at **Supabase → Project Settings → API → `service_role` key**.

In Vercel → **Project Settings → Environment Variables**, add:

| Name | Environments | Value |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | `eyJ…` from Supabase |

Optionally also add:

| Name | Environments | Value |
|---|---|---|
| `SUPABASE_URL` | Production, Preview | `https://tzndcwjnjzjhcgrnnskj.supabase.co` (or omit — falls back to `VITE_SUPABASE_URL`) |

### 2. Deploy

Merge to `main`. Vercel auto-deploys. The MCP endpoint will be at:

```
https://leasing-tracker-psi.vercel.app/api/mcp
```

### 3. Mint your first token

Run this in the **Supabase SQL editor**. The raw token is shown ONCE — copy
it immediately; it's never stored.

```sql
WITH
  raw AS (SELECT encode(gen_random_bytes(24), 'hex') AS token),
  ins AS (
    INSERT INTO mcp_tokens (name, token_hash, role)
    SELECT 'Austin laptop', encode(digest(token, 'sha256'), 'hex'), 'admin'
    FROM raw
    RETURNING id, name
  )
SELECT
  'lt_mcp_' || raw.token   AS raw_token_copy_now,
  ins.id                   AS mcp_token_id,
  ins.name                 AS label
FROM raw, ins;
```

(`pgcrypto` is on by default in Supabase; if you get a `digest` error, run
`CREATE EXTENSION IF NOT EXISTS pgcrypto;` first.)

### 4. Connect from Claude

**From Claude Code** (terminal-based — easiest to test):

```bash
claude mcp add leasing-tracker \
  --transport http \
  --url https://leasing-tracker-psi.vercel.app/api/mcp \
  --header "Authorization: Bearer lt_mcp_<paste-your-token>"
```

Then in any Claude Code session: **"List my Executed deals"** — Claude picks
the `list_deals` tool and returns rows.

**From Claude.ai web:**

1. **Settings → Connectors → Add custom connector**
2. URL: `https://leasing-tracker-psi.vercel.app/api/mcp`
3. Auth: **Bearer token** → paste the raw token
4. Save. Claude.ai discovers `list_deals` automatically.

### 5. Revoke a token

```sql
UPDATE mcp_tokens SET revoked_at = now() WHERE name = 'Austin laptop';
```

### 6. Inspect what happened

```sql
SELECT t.name, l.tool_name, l.status, l.args, l.duration_ms, l.created_at
FROM mcp_audit_log l
LEFT JOIN mcp_tokens t ON t.id = l.token_id
ORDER BY l.created_at DESC
LIMIT 20;
```

## How to add a tool (the pattern)

1. Create `mcp/tools/<your-tool>.ts` mirroring `list-deals.ts`. Three pieces:
   - `name`
   - `description` (the **why-to-pick** string Claude reads to decide; spend time on this)
   - `inputSchema` (JSON schema — Claude validates against it)
   - `handler` (async function; receives args + token, returns JSON-serializable data)
2. Import it in `mcp/server.ts` and push to `TOOLS`.
3. Commit, push, deploy. Claude.ai will see the new tool the next time it
   reconnects (you can force a refresh by removing + re-adding the connector,
   but it usually picks up automatically).

That's it — no Vercel config changes per tool.

## Sessions roadmap

- **Session 1 (this PR):** `list_deals` + auth + audit + deploy
- **Session 2:** mutations — `create_deal`, `update_deal`, `add_activity_to_deal`
- **Session 3:** permission tiers (`mcp_tokens.role`: admin/write/read) + all
  remaining read+write tools (`list_tenants`, `update_tenant`,
  `list_dev_projects`, `add_dev_project_note`, `find_contact`,
  `create_contact`, `list_acquisitions`, `list_dispositions`)

## Security notes

- **The service role key bypasses RLS.** Auth lives in `mcp/auth.ts` — keep
  that handler honest; everything downstream trusts it.
- **The raw token is never persisted.** SHA-256 hashes in `mcp_tokens` only.
  Lost token = mint a new one + revoke the old.
- **Revoking is row-level**: `UPDATE mcp_tokens SET revoked_at = now()`. No
  delete; preserves audit-log foreign-key chain.
- **Audit log is append-only** by convention; nothing in the codebase deletes
  rows. Consider a periodic rollup if it gets large.
