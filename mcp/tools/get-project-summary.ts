// =============================================================================
// Tool: get_project_summary
//
// Returns a complete dossier for one project: the project itself, all its
// buildings + spaces, all active deals (pre-Executed pipeline states),
// the current rent roll, and a rollup of NRA / occupancy / weighted rent /
// upcoming expirations. Metadata on every entity is included so AI sessions
// can read user-stashed fields without a separate tool call.
// =============================================================================

import { z } from 'zod';
import { getServiceClient } from '../db.js';
import type { AuthedToken } from '../auth.js';
import { toMcpInputSchema } from '../lib/zod-input.js';

const ACTIVE_DEAL_STATUSES = [
  'New Prospect',
  'RFP Requested',
  'Drafting Unsolicited',
  'Proposal Pending Approval',
  'Proposal Sent',
  'LOI Negotiations',
  'Lease Negotiations',
] as const;

const argsSchema = z
  .object({
    project_uuid: z.string().uuid().describe('UUID of the project. Get from list_projects.').optional(),
    project_code: z.string().describe('Alternative to project_uuid: lookup by code (e.g. "50").').optional(),
  })
  .strict()
  .refine((v) => v.project_uuid || v.project_code, {
    message: 'Pass either project_uuid or project_code',
  });

type Args = z.infer<typeof argsSchema>;

export const getProjectSummaryTool = {
  name: 'get_project_summary',
  description:
    'Full dossier for one project: the project record, its buildings, leasable ' +
    'spaces, active deals (any pre-Executed pipeline status), the current rent ' +
    'roll, and rollup stats (building count, NRA, occupancy %, weighted-avg ' +
    'rent, active deal count, expirations in the next 12 months). Metadata is ' +
    'included on every entity. Use this for "tell me about project X" or any ' +
    'cross-table question scoped to a single project.',
  inputSchema: toMcpInputSchema(argsSchema),

  async handler(args: Args, _token: AuthedToken) {
    const sb = getServiceClient();

    // ── 1. Resolve project ────────────────────────────────────────────
    let projectQuery = sb.from('projects').select('*');
    if (args.project_uuid) projectQuery = projectQuery.eq('id', args.project_uuid);
    else if (args.project_code) projectQuery = projectQuery.eq('project_code', args.project_code);
    const { data: project, error: projErr } = await projectQuery.maybeSingle();
    if (projErr) throw new Error(`get_project_summary project lookup failed: ${projErr.message}`);
    if (!project) {
      throw new Error(
        `Project not found: ${args.project_uuid ?? args.project_code}`
      );
    }
    const projectId = (project as { id: string }).id;
    const projectCode = (project as { project_code: string }).project_code;

    // ── 2. Buildings (by project_uuid; falls back to legacy text join) ─
    const { data: bldgsByUuid } = await sb
      .from('buildings')
      .select('*')
      .eq('project_uuid', projectId);
    let buildings = bldgsByUuid ?? [];
    if (buildings.length === 0) {
      const { data: bldgsByText } = await sb
        .from('buildings')
        .select('*')
        .eq('project_id', projectCode);
      buildings = bldgsByText ?? [];
    }

    const buildingIds = buildings.map((b) => (b as { id: string }).id);

    // ── 3. Spaces (only for this project's buildings) ─────────────────
    let spaces: unknown[] = [];
    if (buildingIds.length > 0) {
      const { data: spc, error: spcErr } = await sb
        .from('spaces')
        .select('*')
        .in('building_uuid', buildingIds);
      if (spcErr) throw new Error(`get_project_summary spaces lookup failed: ${spcErr.message}`);
      spaces = spc ?? [];
    }

    // ── 4. Active deals (project_uuid OR legacy deal_id text) ─────────
    const { data: dealsByUuid } = await sb
      .from('deals')
      .select('*')
      .eq('project_uuid', projectId)
      .in('status', ACTIVE_DEAL_STATUSES as unknown as string[]);
    let activeDeals = dealsByUuid ?? [];
    if (activeDeals.length === 0) {
      const { data: dealsByText } = await sb
        .from('deals')
        .select('*')
        .eq('deal_id', projectCode)
        .in('status', ACTIVE_DEAL_STATUSES as unknown as string[]);
      activeDeals = dealsByText ?? [];
    }

    // ── 5. Rent roll for this project (project_uuid OR legacy deal_id text) ─
    const { data: rrByUuid } = await sb
      .from('rent_roll')
      .select('*')
      .eq('project_uuid', projectId);
    let rentRoll = rrByUuid ?? [];
    if (rentRoll.length === 0) {
      const { data: rrByText } = await sb
        .from('rent_roll')
        .select('*')
        .eq('deal_id', projectCode);
      rentRoll = rrByText ?? [];
    }

    // ── 6. Rollups ────────────────────────────────────────────────────
    let totalNRA = 0;
    let occupiedSF = 0;
    let rentNum = 0;
    let rentDen = 0;
    const now = new Date();
    const twelveMo = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    let expirations12 = 0;

    for (const r of rentRoll) {
      const row = r as {
        leasable_sf: number | string | null;
        occupied: boolean;
        starting_annual_rent_psf: number | string | null;
        lease_end: string | null;
      };
      const sf = Number(row.leasable_sf) || 0;
      const rent = Number(row.starting_annual_rent_psf) || 0;
      totalNRA += sf;
      if (row.occupied) {
        occupiedSF += sf;
        if (rent > 0 && sf > 0) {
          rentNum += rent * sf;
          rentDen += sf;
        }
      }
      if (row.lease_end) {
        const end = new Date(row.lease_end);
        if (end >= now && end <= twelveMo) expirations12 += 1;
      }
    }

    const rollup = {
      building_count: buildings.length,
      space_count: spaces.length,
      total_nra_sf: totalNRA,
      occupied_sf: occupiedSF,
      vacant_sf: Math.max(0, totalNRA - occupiedSF),
      occupancy_pct: totalNRA > 0 ? occupiedSF / totalNRA : 0,
      weighted_avg_rent_psf: rentDen > 0 ? Number((rentNum / rentDen).toFixed(2)) : 0,
      active_deal_count: activeDeals.length,
      expirations_next_12_months: expirations12,
    };

    return {
      project,
      buildings,
      spaces,
      active_deals: activeDeals,
      rent_roll: rentRoll,
      rollup,
      as_of: now.toISOString(),
    };
  },
} as const;
