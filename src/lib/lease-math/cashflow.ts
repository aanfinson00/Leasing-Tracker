// =============================================================================
// CASHFLOW — Monthly tenant cashflow projection
//
// Pure function. Takes the structured lease terms captured at promote time
// and produces the month-by-month rent stream that gets cached on the
// rent_roll row (`cashflow_json`) for the underwrite tab + reports to read
// without recomputing.
//
// Conventions:
// - All money in dollars (not cents).
// - Free rent burns months 1..freeRentMonths (zero gross rent).
// - Rent commencement defaults to leaseStart when not explicitly set.
// - Annual escalations apply on each anniversary of rent commencement.
//   So month 1 = year-1 rate, month 13 = year-1 * (1 + bump), etc.
// =============================================================================

export interface CashflowInputs {
  leaseStart: string | null;            // ISO date "2026-07-01"
  rentCommencementDate?: string | null; // ISO date; defaults to leaseStart
  leaseTermMonths: number | null;
  leasableSF: number | null;
  startingAnnualRentPSF: number | null; // $/SF/year at year 1
  annualRentBumpsPct: number | null;    // 0.03 for 3% (decimal fraction) OR 3 for 3% — we handle both
  freeRentMonths: number | null;
}

export interface CashflowMonth {
  month: number;            // 1-indexed
  date: string;             // first day of the rent month (ISO)
  yearIndex: number;        // 1 = year 1, 2 = year 2, ...
  baseRentMonthly: number;  // $/month at the current escalated rate (before free-rent zeroing)
  freeRentApplied: boolean; // true while month <= freeRentMonths
  grossRent: number;        // baseRentMonthly when not free, else 0
}

export interface CashflowSummary {
  totalGrossRent: number;
  totalFreeRentValue: number;
  effectiveAnnualRent: number;  // average of grossRent across the full term, annualized
  termMonths: number;
  months: CashflowMonth[];
}

// Normalize bumps: accept either 0.03 (fraction) or 3 (percent points).
// Convention: anything > 1 is treated as percent points (so "3" → 0.03).
function normalizeBumps(b: number | null): number {
  if (b == null || !Number.isFinite(b)) return 0;
  return b > 1 ? b / 100 : b;
}

function addMonths(iso: string, months: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

/**
 * Build the cashflow projection. Returns null when the inputs are too
 * incomplete to produce a meaningful stream.
 */
export function buildCashflow(inputs: CashflowInputs): CashflowSummary | null {
  const {
    leaseStart,
    leaseTermMonths,
    leasableSF,
    startingAnnualRentPSF,
    annualRentBumpsPct,
    freeRentMonths,
  } = inputs;

  if (!leaseStart || !leaseTermMonths || !leasableSF || !startingAnnualRentPSF) {
    return null;
  }

  const rentCommencement = inputs.rentCommencementDate ?? leaseStart;
  const bumps = normalizeBumps(annualRentBumpsPct);
  const freeMonths = Math.max(0, Math.round(freeRentMonths ?? 0));
  const termMonths = Math.round(leaseTermMonths);

  const months: CashflowMonth[] = [];
  let totalGross = 0;
  let totalFree = 0;

  for (let m = 1; m <= termMonths; m++) {
    const yearIndex = Math.floor((m - 1) / 12) + 1;
    const rateThisYear = startingAnnualRentPSF * Math.pow(1 + bumps, yearIndex - 1);
    const monthlyBase = (leasableSF * rateThisYear) / 12;
    const isFree = m <= freeMonths;
    const gross = isFree ? 0 : monthlyBase;

    months.push({
      month: m,
      date: addMonths(rentCommencement, m - 1),
      yearIndex,
      baseRentMonthly: round2(monthlyBase),
      freeRentApplied: isFree,
      grossRent: round2(gross),
    });

    totalGross += gross;
    if (isFree) totalFree += monthlyBase;
  }

  // Effective annual rent: total gross rent annualized over the term.
  // (Stable single number for comparing alternatives at a glance.)
  const effective = (totalGross / termMonths) * 12;

  return {
    totalGrossRent: round2(totalGross),
    totalFreeRentValue: round2(totalFree),
    effectiveAnnualRent: round2(effective),
    termMonths,
    months,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
