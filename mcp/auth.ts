// =============================================================================
// MCP bearer-token authentication.
//
// Flow:
//   1. Client sends `Authorization: Bearer <raw_token>` on every request.
//   2. We SHA-256 the raw token (so a DB leak doesn't hand out usable tokens).
//   3. Look up the hash in mcp_tokens; reject if missing or revoked.
//   4. Bump `last_used_at` for visibility into which tokens are active.
//
// The "raw token" is only ever shown to the user once at mint time — it's
// never stored anywhere. Lost token == mint a new one.
// =============================================================================

import { createHash } from 'node:crypto';
import { getServiceClient } from './db.js';

export type Role = 'admin' | 'write' | 'read';

export interface AuthedToken {
  id: string;
  name: string;
  role: Role;
}

export interface AuthFailure {
  status: 401 | 403;
  message: string;
}

/**
 * Does this token's role satisfy the tool's requirement?
 * Tier order (lowest → highest): read < write < admin.
 * Higher tiers always cover everything lower tiers can do.
 */
export function roleSatisfies(have: Role, need: Role): boolean {
  const tier: Record<Role, number> = { read: 0, write: 1, admin: 2 };
  return tier[have] >= tier[need];
}

function coerceRole(raw: string): Role {
  return raw === 'read' || raw === 'write' || raw === 'admin' ? raw : 'read';
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Verify the `Authorization` header against the mcp_tokens table.
 * Returns the matching token row (without the hash) on success,
 * or an { status, message } pair on failure.
 */
export async function verifyBearer(authorizationHeader: string | undefined | null): Promise<AuthedToken | AuthFailure> {
  if (!authorizationHeader) {
    return { status: 401, message: 'Missing Authorization header' };
  }
  const m = authorizationHeader.match(/^Bearer\s+(\S+)$/i);
  if (!m) {
    return { status: 401, message: 'Authorization header must be "Bearer <token>"' };
  }
  const raw = m[1];
  const tokenHash = sha256Hex(raw);

  const sb = getServiceClient();
  const { data, error } = await sb
    .from('mcp_tokens')
    .select('id, name, role, revoked_at, expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (error) {
    return { status: 401, message: `Auth lookup failed: ${error.message}` };
  }
  if (!data) {
    return { status: 401, message: 'Unknown token' };
  }
  if (data.revoked_at) {
    return { status: 403, message: 'Token has been revoked' };
  }
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return {
      status: 403,
      message: `Token expired at ${data.expires_at} — mint a new one and update your client config`,
    };
  }

  // Fire-and-forget bump of last_used_at — failure here doesn't deny the call.
  void sb
    .from('mcp_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id);

  return { id: data.id, name: data.name, role: coerceRole(data.role) };
}

export function isFailure(x: AuthedToken | AuthFailure): x is AuthFailure {
  return 'status' in x;
}
