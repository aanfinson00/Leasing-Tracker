// =============================================================================
// /api/mcp — Vercel serverless entrypoint for the MCP server.
//
// Each Claude tool call lands here as an HTTP POST. We:
//   1. Verify the bearer token (mcp/auth.ts).
//   2. Build a fresh MCP Server with that token's identity (mcp/server.ts).
//   3. Hand the request to the StreamableHTTP transport, which drives the
//      JSON-RPC dance with the SDK and writes back to the response.
//
// Stateless: every request creates a new Server. That works because MCP's
// "tools" capability is stateless — no per-session memory. (If we add
// resources or prompts later we'll need to revisit.)
// =============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { verifyBearer, isFailure } from '../mcp/auth.js';
import { buildServer } from '../mcp/server.js';

// Vercel needs to run this in the Node.js runtime (not Edge) — we use
// node:crypto for SHA-256 and @supabase/supabase-js depends on Node APIs.
export const config = { runtime: 'nodejs' };

// CORS allow-list. Bearer auth is the real protection — CORS just stops
// drive-by browser requests from random origins. Add new entries here as
// new Claude surfaces are added (Desktop app uses claude.ai-derived origin;
// Code/SDK calls are server-side and don't enforce CORS).
const ALLOWED_ORIGINS = new Set([
  'https://claude.ai',
  'https://leasing-tracker-psi.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS: echo the Origin header back ONLY if it's on the allow-list.
  // Server-side callers (Claude Code, scheduled agents, mobile-via-workspace)
  // don't send an Origin header at all and skip the CORS check entirely.
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Mcp-Session-Id');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // 1. Auth
  const auth = await verifyBearer(req.headers.authorization);
  if (isFailure(auth)) {
    res.status(auth.status).json({ error: auth.message });
    return;
  }

  // 2. Per-request server instance, scoped to this token
  const server = buildServer(auth);

  // 3. Hand to the SDK's streaming HTTP transport
  const transport = new StreamableHTTPServerTransport({
    // Stateless mode: don't generate a session ID, accept any request.
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);

  await transport.handleRequest(req, res, req.body);
}
