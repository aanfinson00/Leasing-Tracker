-- ───────────────────────────────────────────────────────────────────
-- Bearer tokens + audit log for the MCP server.
-- See mcp/README.md for how to mint a token and connect Claude.ai.
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mcp_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  token_hash  TEXT        UNIQUE NOT NULL,
  role        TEXT        NOT NULL DEFAULT 'admin',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  revoked_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mcp_tokens_hash
  ON mcp_tokens(token_hash) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS mcp_audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id    UUID        REFERENCES mcp_tokens(id) ON DELETE SET NULL,
  tool_name   TEXT        NOT NULL,
  args        JSONB,
  status      TEXT        NOT NULL,
  error_msg   TEXT,
  duration_ms INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mcp_audit_token_created
  ON mcp_audit_log(token_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_audit_tool_created
  ON mcp_audit_log(tool_name, created_at DESC);
