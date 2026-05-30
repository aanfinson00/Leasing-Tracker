// =============================================================================
// Tool: portfolio_summary
// =============================================================================

import { z } from 'zod';
import { getServiceClient } from '../db.js';
import type { AuthedToken } from '../auth.js';
import { toMcpInputSchema } from '../lib/zod-input.js';

const argsSchema = z.object({}).strict();
type Args = z.infer<typeof argsSchema>;

export const portfolioSummaryTool = {
  name: 'portfolio_summary',
  description:
    'Portfolio-level roll-up: deal count by status, total NRA, occupancy %, ' +
    'weighted-average in-place rent ($/SF), and lease expirations in the next 12 ' +
    'months. Use for morning briefs, "how are we doing?" queries, or to surface ' +
    'time-sensitive renewal risk.',
  inputSchema: toMcpInputSchema(argsSchema),

  async handler(_args: Args, _token: AuthedToken) {
    const sb = getServiceClient();

    const { data: deals, error: dealsErr } = await sb.from('deals').select('status');
    if (dealsErr) throw new Error(`portfolio_summary deals failed: ${dealsErr.message}`);
    const dealsByStatus: Record<string, number> = {};
    for (const d of deals ?? []) {
      const s = (d as { status: string }).status ?? 'Unknown';
      dealsByStatus[s] = (dealsByStatus[s] ?? 0) + 1;
    }

    const { data: rows, error: rowsErr } = await sb
      .from('rent_roll')
      .select('leasable_sf, occupied, starting_annual_rent_psf, lease_end');
    if (rowsErr) throw new Error(`portfolio_summary rent_roll failed: ${rowsErr.message}`);

    let totalNRA = 0;
    let occupiedSF = 0;
    let rentWeightedNum = 0;
    let rentWeightedDen = 0;
    const now = new Date();
    const twelveMo = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    let expirationsNext12 = 0;

    for (const r of rows ?? []) {
      const row = r as { leasable_sf: number | null; occupied: boolean; starting_annual_rent_psf: number | null; lease_end: string | null };
      const sf = Number(row.leasable_sf) || 0;
      const occ = row.occupied === true;
      const rent = Number(row.starting_annual_rent_psf) || 0;
      totalNRA += sf;
      if (occ) {
        occupiedSF += sf;
        if (rent > 0 && sf > 0) {
          rentWeightedNum += rent * sf;
          rentWeightedDen += sf;
        }
      }
      if (row.lease_end) {
        const endDate = new Date(row.lease_end);
        if (endDate >= now && endDate <= twelveMo) expirationsNext12 += 1;
      }
    }

    const vacancyPct = totalNRA > 0 ? (totalNRA - occupiedSF) / totalNRA : 0;
    const weightedAvgRent = rentWeightedDen > 0 ? rentWeightedNum / rentWeightedDen : 0;

    return {
      deals_by_status: dealsByStatus,
      total_deals: deals?.length ?? 0,
      rent_roll: {
        total_rows: rows?.length ?? 0,
        total_nra_sf: totalNRA,
        occupied_sf: occupiedSF,
        vacant_sf: totalNRA - occupiedSF,
        occupancy_pct: 1 - vacancyPct,
        vacancy_pct: vacancyPct,
        weighted_avg_rent_psf: Number(weightedAvgRent.toFixed(2)),
      },
      expirations_next_12_months: expirationsNext12,
      as_of: now.toISOString(),
    };
  },
} as const;
