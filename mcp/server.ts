// =============================================================================
// MCP server setup.
//
// Builds an MCP Server instance, registers every tool, and exposes a handler
// that the Vercel serverless function can call per-request.
//
// MCP at the wire level is JSON-RPC. The official SDK handles the protocol
// shape so we just write `setRequestHandler` for the two requests we care
// about:
//
//   tools/list  — Claude asks "what can this server do?"
//                  We respond with the metadata (name + description +
//                  inputSchema) for every registered tool.
//
//   tools/call  — Claude actually invokes a tool with arguments.
//                  We look up the handler, run it, wrap result in MCP's
//                  expected { content: [...] } envelope.
//
// Adding a tool later is: import it, push into TOOLS, done.
// =============================================================================

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { AuthedToken, Role } from './auth';
import { roleSatisfies } from './auth';
import { writeAuditLog } from './audit';

// Deals (Sessions 1-2)
import { listDealsTool } from './tools/list-deals';
import { createDealTool } from './tools/create-deal';
import { updateDealTool } from './tools/update-deal';
import { addActivityToDealTool } from './tools/add-activity-to-deal';

// Session 3 — tenants / dev projects / contacts / acquisitions / dispositions
import { listTenantsTool } from './tools/list-tenants';
import { updateTenantTool } from './tools/update-tenant';
import { listDevProjectsTool } from './tools/list-dev-projects';
import { addDevProjectNoteTool } from './tools/add-dev-project-note';
import { findContactTool } from './tools/find-contact';
import { createContactTool } from './tools/create-contact';
import { listAcquisitionsTool } from './tools/list-acquisitions';
import { listDispositionsTool } from './tools/list-dispositions';

// All tools are registered here. The shape is a manual interface match —
// not a base class — because each tool's args type is unique.
// `requiredRole` tags the minimum role a caller's token must hold:
//   - 'read'  — list_*, find_*, get_*
//   - 'write' — create_*, update_*, add_*
//   - 'admin' — destructive ops (none yet)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TOOLS: Array<{
  name: string;
  description: string;
  inputSchema: unknown;
  requiredRole: Role;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (args: any, token: AuthedToken) => Promise<unknown>;
}> = [
  // Deals
  { ...listDealsTool, requiredRole: 'read' },
  { ...createDealTool, requiredRole: 'write' },
  { ...updateDealTool, requiredRole: 'write' },
  { ...addActivityToDealTool, requiredRole: 'write' },
  // Tenants
  { ...listTenantsTool, requiredRole: 'read' },
  { ...updateTenantTool, requiredRole: 'write' },
  // Dev projects
  { ...listDevProjectsTool, requiredRole: 'read' },
  { ...addDevProjectNoteTool, requiredRole: 'write' },
  // Contacts
  { ...findContactTool, requiredRole: 'read' },
  { ...createContactTool, requiredRole: 'write' },
  // Acquisitions + dispositions (read-only this session)
  { ...listAcquisitionsTool, requiredRole: 'read' },
  { ...listDispositionsTool, requiredRole: 'read' },
];

export function buildServer(token: AuthedToken): Server {
  const server = new Server(
    { name: 'leasing-tracker-mcp', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );

  // tools/list — discovery
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  // tools/call — invocation
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    const tool = TOOLS.find((t) => t.name === name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }

    // Role gate: write tools require write+, admin tools require admin.
    if (!roleSatisfies(token.role, tool.requiredRole)) {
      const msg = `Tool "${name}" requires role "${tool.requiredRole}"; this token has role "${token.role}".`;
      await writeAuditLog({
        tokenId: token.id,
        toolName: name,
        args,
        status: 'error',
        errorMsg: msg,
        durationMs: 0,
      });
      return {
        content: [{ type: 'text', text: `Error: ${msg}` }],
        isError: true,
      };
    }

    const startedAt = Date.now();
    try {
      const result = await tool.handler(args ?? {}, token);
      await writeAuditLog({
        tokenId: token.id,
        toolName: name,
        args,
        status: 'ok',
        durationMs: Date.now() - startedAt,
      });
      // MCP expects a `content` array of typed blocks. We always return a
      // single `text` block carrying JSON — Claude reads + parses it.
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await writeAuditLog({
        tokenId: token.id,
        toolName: name,
        args,
        status: 'error',
        errorMsg: msg,
        durationMs: Date.now() - startedAt,
      });
      // Surface error to Claude so it can apologize / try a different tool.
      return {
        content: [{ type: 'text', text: `Error: ${msg}` }],
        isError: true,
      };
    }
  });

  return server;
}
