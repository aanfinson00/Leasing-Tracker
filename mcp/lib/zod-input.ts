// =============================================================================
// Zod → MCP input schema converter.
//
// MCP's `inputSchema` field expects JSON Schema 7. Rather than hand-write
// JSON Schema in every tool definition (duplicating what we'd put in a Zod
// schema anyway), each tool defines a single Zod `argsSchema` and uses
// `toMcpInputSchema(argsSchema)` to produce the JSON for MCP.
//
// Benefit: one source of truth per tool's argument shape. The Zod schema
// also enables runtime parsing/coercion in the handler if we want it.
//
// Strips `$schema` from the output — MCP rejects unknown top-level keys
// on the inputSchema object.
// =============================================================================

import { z, type ZodType } from 'zod';

export function toMcpInputSchema(schema: ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { target: 'draft-7' }) as Record<string, unknown>;
  delete json.$schema;
  return json;
}
