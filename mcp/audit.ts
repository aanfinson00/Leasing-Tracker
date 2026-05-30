// =============================================================================
// MCP audit log — one row per tool invocation.
// Useful for debugging ("why did Claude write that?"), compliance, and as a
// learning aid in the early days.
// =============================================================================

import { getServiceClient } from './db.js';

export interface AuditEntry {
  tokenId: string | null;
  toolName: string;
  args: unknown;
  status: 'ok' | 'error';
  errorMsg?: string;
  durationMs: number;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const sb = getServiceClient();
    await sb.from('mcp_audit_log').insert({
      token_id: entry.tokenId,
      tool_name: entry.toolName,
      args: entry.args,
      status: entry.status,
      error_msg: entry.errorMsg ?? null,
      duration_ms: entry.durationMs,
    });
  } catch {
    // Audit failure should never break the call. Swallow.
  }
}
