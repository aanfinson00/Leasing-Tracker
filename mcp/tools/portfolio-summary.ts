// =============================================================================
// Tool: portfolio_summary
//
// Read-only. Roll-up for a morning brief / portfolio dashboard:
//   - deal count by status
//   - total NRA, occupied SF, vacancy %
//   - weighted-average in-place rent (PSF)
//   - lease expirations in the next 12 months
// =============================================================================

import { getServiceClient } from '../db';
import type { AuthedToken } from '../auth';

export const portfolioSummaryTool = {
  name: 'portfolio_summary',
  description:
    'Portfolio-level roll-up: deal count by status, total NRA, occupancy %, ' +
    'weighted-average in-place rent ($/SF), and lease expirations in the next 12 ' +
    'months. Use for morning briefs, "how are we doing?" queries, or to surface ' +
    'time-sensitive renewal risk.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },

  async handler(_args: Record<string, never>, _token: AuthedToken) {
    const sb = getServiceClient();

    // Deal pipeline counts by status
    const { data: deals, error: dealsErr } = await sb
      .from('deals')
      .select('status');
    if (dealsErr) throw new Error(`portfolio_summary deals failed: ${dealsErr.message}`);
    const dealsByStatus: Record<string, number> = {};
    for (const d of deals ?? []) {
      const s = (d as { status: string }).status ?? 'Unknown';
      dealsByStatus[s] = (dealsByStatus[s] ?? 0) + 1;
    }

    // Rent roll roll-up
    const { data: rows, error: rowsErr } = await sb
      .from('rent_roll')
      .select('leasable_sf, occupied, starting_annual_rent_psf, lease_end');
    if (rowsErr) throw new Error(`portfolio_summary rent_roll failed: ${rowsErr.message}`);

    let totalNRA = 0;
    let occupiedSF = 0;
    let rentWeightedNum = 0; // sum(rent * sf) for occupied
    let rentWeightedDen = 0; // sum(sf) for occupied with rent set
    const now = new Date();
    const twelveMo = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    let expirationsNext12: number = 0;

    for (const r of rows ?? []) {
      const sf = Number((r as { leasable_sf: number | null }).leasable_sf) || 0;
      const occ = (r as { occupied: boolean }).occupied === true;
      const rent = Number((r as { starting_annual_rent_psf: number | null }).starting_annual_rent_psf) || 0;
      const end = (r as { lease_end: string | null }).lease_end;
      totalNRA += sf;
      if (occ) {
        occupiedSF += sf;
        if (rent > 0 && sf > 0) {
          rentWeightedNum += rent * sf;
          rentWeightedDen += sf;
        }
      }
      if (end) {
        const endDate = new Date(end);
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
