// ───────────────────────────────────────────────────────────────────
// Lifted from Lease-Calculator/lib/calc.ts on 2026-05-21.
// This copy is canonical for Leasing-Tracker — Lease-Calculator may
// drift independently.
//
// Pure calculation engine for the RFP Analyzer. No React, no DOM,
// no I/O — everything in here is a pure function of its inputs.
// ───────────────────────────────────────────────────────────────────

import type {
  AnnualScheduleRow,
  Globals,
  LCCalculation,
  MonthlyGridRow,
  ScenarioInputs,
  ScenarioResults,
  WaterfallComponents,
} from "./types";

// ---------------------------------------------------------------------------
// 1. Annual rent schedule
// ---------------------------------------------------------------------------

/**
 * Build the year-by-year rent schedule.
 *
 * Year 0 is the free-rent row (rate = $0). Years 1+ escalate from baseRatePSF.
 * The schedule covers the entire lease term — including the free-rent months,
 * which are counted in `leaseTermMonths`.
 *
 * Greedy month allocation: free rent first, then 12 mo/yr until the term is
 * exhausted. The final year may be partial (`monthsActive < 12`).
 */
/**
 * Build the year-by-year rent schedule.
 *
 * Calendar-aligned: Year 1 covers months 1-12 of the lease, Year 2 covers
 * months 13-24, and so on. Escalation always lands on the calendar
 * anniversary, regardless of where free rent sits. Free rent doesn't
 * "push escalation back" — it abates whatever rate is in effect during
 * the free months. The grid handles abatement separately via an isFree
 * flag, so the schedule has no special "year 0" row.
 */
export function buildAnnualSchedule(inputs: ScenarioInputs): AnnualScheduleRow[] {
  const { leaseTermMonths } = inputs;
  const rows: AnnualScheduleRow[] = [];
  let remaining = leaseTermMonths;
  let year = 1;
  while (remaining > 0) {
    const monthsActive = Math.min(12, remaining);
    rows.push({ year, annualRatePSF: annualRateForYear(inputs, year), monthsActive });
    remaining -= monthsActive;
    year += 1;
  }
  return rows;
}

/**
 * Annual rate for lease year Y (1-indexed). Resolves in priority order:
 *   1. Manual override (rentScheduleOverride[Y-1]) if set
 *   2. Constant escalation: baseRatePSF × (1 + escalation)^(Y-1)
 *
 * Used by both buildAnnualSchedule (for LC + display) and buildMonthlyGrid
 * (for per-month rate lookup, decoupled from the year-0 free-rent hack).
 */
function annualRateForYear(inputs: ScenarioInputs, year: number): number {
  const override = inputs.rentScheduleOverride?.[year - 1];
  if (override != null && Number.isFinite(override)) return override;
  return inputs.baseRatePSF * Math.pow(1 + inputs.escalation, year - 1);
}

// ---------------------------------------------------------------------------
// 1b. TI amortization uplift (PMT)
// ---------------------------------------------------------------------------

/**
 * Constant monthly payment that amortizes `principalPSF` over `n` months at
 * monthly rate `r = annualRate / 12`. Standard PMT formula; collapses to
 * straight-line (principal / n) when annualRate = 0.
 *
 * Used to fold an "additional TI" allowance into base rent: the landlord
 * gives the tenant `additionalTIPSF` of extra TI upfront, and the tenant
 * repays it via a constant monthly uplift to base rent over the term at
 * the landlord's amortization rate. Returns 0 when there's nothing to
 * amortize (principal = 0 or term = 0).
 */
export function calcAmortizationUpliftPSF(
  additionalTIPSF: number,
  annualRate: number,
  termMonths: number,
): { monthlyPSF: number; annualPSF: number } {
  if (additionalTIPSF <= 0 || termMonths <= 0) {
    return { monthlyPSF: 0, annualPSF: 0 };
  }
  const r = annualRate / 12;
  const monthlyPSF =
    r === 0
      ? additionalTIPSF / termMonths
      : (additionalTIPSF * r) / (1 - Math.pow(1 + r, -termMonths));
  return { monthlyPSF, annualPSF: monthlyPSF * 12 };
}

// ---------------------------------------------------------------------------
// 2. Leasing commission (split-tier)
// ---------------------------------------------------------------------------

/**
 * Leasing commission total ($/SF over the term).
 *
 * Iterates the lease month-by-month, skips abated (free-rent) months
 * entirely, and tiers on PAYING-month count:
 *   tiered — full lcPercent on the first 60 paying months of contracted
 *            rent, lcPercent/2 on month 61+ of paying rent.
 *   flat   — full lcPercent on every paying month.
 *
 * Each paying month contributes (annualRateForYear / 12) where the year
 * is the calendar lease year of that month. So with 6 mo free at the
 * front of a 130-mo lease, tier 1 covers paying months 7-66 (mostly
 * yrs 1-5 plus the first 6 mo of yr 6) and tier 2 covers paying months
 * 67-130. Free rent NEVER counts toward the LC base.
 */
export function calcLC(
  inputs: ScenarioInputs,
  lcPercent: number,
  calculation: LCCalculation = "tiered",
): number {
  const term = inputs.leaseTermMonths;
  const free = Math.max(0, Math.min(Math.round(inputs.freeRentMonths), term));

  let tier1 = 0; // first 60 paying months (full %)
  let tier2 = 0; // paying months 61+      (half %)
  let payingCount = 0;

  // Free rent is always months 1..free; paying months are free+1..term.
  for (let m = free + 1; m <= term; m++) {
    payingCount += 1;
    const calendarYear = Math.floor((m - 1) / 12) + 1;
    const monthlyRent = annualRateForYear(inputs, calendarYear) / 12;
    if (payingCount <= 60) tier1 += monthlyRent;
    else tier2 += monthlyRent;
  }

  if (calculation === "flat") return lcPercent * (tier1 + tier2);
  return lcPercent * tier1 + (lcPercent / 2) * tier2;
}

// ---------------------------------------------------------------------------
// 3. Monthly cash flow grid
// ---------------------------------------------------------------------------

/**
 * Build a month-by-month grid of PSF cash flows over the lease horizon.
 *
 * Origin: month 1 = lease execution date. If executionDate < commencementDate,
 * the first `commencementOffset` months are pre-rent (TI draws, commission
 * half #1 may land here). Free rent and base rent kick in at month
 * `commencementOffset + 1`. If executionDate === commencementDate (the default
 * for legacy scenarios), commencementOffset = 0 and the grid collapses to the
 * original single-anchor behavior.
 *
 * The grid extends to `globals.horizonMonths` past execution; months past
 * (commencementOffset + leaseTerm) are all zeros. This symmetry — every
 * scenario runs the same length — fixes one of the Excel's structural bugs.
 */
export function buildMonthlyGrid(
  inputs: ScenarioInputs,
  globals: Globals,
  schedule: AnnualScheduleRow[],
  lcTotalPSF: number,
): MonthlyGridRow[] {
  const term = inputs.leaseTermMonths;
  const free = Math.min(Math.round(inputs.freeRentMonths), term);
  // Free rent is always front-loaded — months 1..free of the lease.
  const freeEnd = free;

  const execution = new Date(inputs.leaseExecutionDate);
  const commencement = new Date(inputs.leaseCommencement);
  const commencementOffset = Math.max(0, monthsBetween(execution, commencement));

  const tiDuration = Math.max(1, Math.round(inputs.tiDurationMonths));

  const totalLeaseSpan = commencementOffset + term;
  const horizon = Math.max(globals.horizonMonths, totalLeaseSpan);

  // Lookup: monthFromCommencement (1-indexed) → annualRatePSF, derived from
  // the schedule's row layout. For front-loaded abatement, the schedule has
  // a year-0 row of `freeRentMonths` zero-rate slots at the front, then years
  // 1..N of paying-year rates ("rent years" shift after the abatement). For
  // mid-term abatement, the schedule has no year-0 row — rent years align
  // with the contract calendar (year 1 = months 1-12 of lease).
  const monthToRate = new Array<number>(term).fill(0);
  let cursor = 0;
  for (const row of schedule) {
    for (let i = 0; i < row.monthsActive && cursor < term; i++) {
      monthToRate[cursor++] = row.annualRatePSF;
    }
  }

  // Phantom rate for valuing free rent: the rate that WOULD be charged in
  // the corresponding calendar lease year. Calendar-indexed (not schedule-
  // indexed), so it's correct for both front-loaded and mid-term abatement.
  // Quirk #10 fix: uses the actual year's rate, not Yr1's.
  const phantomRateForMonth = (monthFromCommencement: number): number => {
    const calendarYear = Math.floor((monthFromCommencement - 1) / 12) + 1;
    return annualRateForYear(inputs, calendarYear);
  };

  // LC payment timing — half at execution (m=1), half at lease commencement
  // when split50; the full amount at execution when upfront. The second half
  // tracks lease commencement (NOT rent commencement after free rent), so a
  // lease with front-loaded free still pays its second LC half on day 1 of
  // the lease — independent of the abatement.
  const lcAtExecution = inputs.lcStructure === "upfront" ? -lcTotalPSF : -lcTotalPSF / 2;
  const lcAtCommencement = inputs.lcStructure === "upfront" ? 0 : -lcTotalPSF / 2;
  // 1-indexed grid month (from execution) where the lease commences.
  const commencementMonth = commencementOffset + 1;

  // TI outflow covers both the standard allowance and the additional TI
  // (when an amortization deal is in play). The tenant repays the
  // additional portion via the uplift below; the landlord still pays it
  // out upfront on the same draw schedule as the standard allowance.
  const totalTIOutflow = inputs.tiAllowancePSF + (inputs.additionalTIPSF ?? 0);
  const tiPerMonth = tiDuration > 0 ? -totalTIOutflow / tiDuration : 0;

  // Constant monthly uplift to base rent, paid only during in-lease,
  // non-free months. Free rent abates contracted rent only — the uplift
  // is treated as TI financing and isn't collected during free months, so
  // the LL's effective return on the additional TI is below the amort
  // rate when there's any free rent (as expected from a concession).
  const { monthlyPSF: monthlyUpliftPSF } = calcAmortizationUpliftPSF(
    inputs.additionalTIPSF ?? 0,
    globals.amortizationRate ?? 0,
    term,
  );

  const grid: MonthlyGridRow[] = [];
  for (let m = 1; m <= horizon; m++) {
    const monthFromCommencement = m - commencementOffset; // 1-indexed during lease
    const inLease = monthFromCommencement >= 1 && monthFromCommencement <= term;
    const annualRate = inLease ? monthToRate[monthFromCommencement - 1] : 0;

    const isFree =
      inLease && monthFromCommencement >= 1 && monthFromCommencement <= freeEnd;
    const isPaying = inLease && !isFree;
    const baseRentPSF = isFree ? 0 : annualRate / 12 + (isPaying ? monthlyUpliftPSF : 0);
    const freeRentPSF = isFree ? -phantomRateForMonth(monthFromCommencement) / 12 : 0;

    // TI: spread evenly across tiDurationMonths starting at month 1 (execution).
    const tiPSF = m >= 1 && m <= tiDuration ? tiPerMonth : 0;

    let lcPSF = 0;
    if (m === 1) lcPSF += lcAtExecution;
    // Second half at lease commencement (when split50). When execution =
    // commencement, commencementMonth === 1 and both halves land at M1 —
    // collapse them here so the user sees the full LC in M1 instead of
    // double-counting against the M1 condition above.
    if (m === commencementMonth && lcAtCommencement !== 0) {
      lcPSF += lcAtCommencement;
    }

    const netCFPSF = baseRentPSF + freeRentPSF + tiPSF + lcPSF;

    grid.push({
      month: m,
      date: addMonths(execution, m - 1).toISOString().slice(0, 10),
      baseRentPSF,
      freeRentPSF,
      tiPSF,
      lcPSF,
      netCFPSF,
    });
  }

  return grid;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

/** Whole-month difference (UTC, calendar-month boundary). */
function monthsBetween(from: Date, to: Date): number {
  return (
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
    (to.getUTCMonth() - from.getUTCMonth())
  );
}

// ---------------------------------------------------------------------------
// 4. NER (undiscounted + discounted)
// ---------------------------------------------------------------------------

/**
 * Sum a column of the monthly grid over the first `span` months.
 * `span` defaults to the grid length to preserve the simple two-arg call site.
 */
function sumColumn(
  grid: MonthlyGridRow[],
  span: number,
  key: keyof Pick<MonthlyGridRow, "baseRentPSF" | "freeRentPSF" | "tiPSF" | "lcPSF" | "netCFPSF">,
): number {
  let total = 0;
  for (let i = 0; i < span && i < grid.length; i++) total += grid[i][key];
  return total;
}

/**
 * Undiscounted NER.
 *
 * `span` is how many months of grid to include in the sum (= commencement
 * offset + lease term). `term` is the rent-paying lease term in months;
 * NER is normalized per year over `term`. When execution === commencement
 * the two are equal — original spec behavior.
 */
export function calcUndiscountedNER(
  grid: MonthlyGridRow[],
  span: number,
  term: number,
): number {
  if (term === 0) return 0;
  const totalNetCF = sumColumn(grid, span, "netCFPSF");
  return (totalNetCF / term) * 12;
}

/**
 * Discounted NER.
 *
 * The Excel uses `NPV(rate, flows) + flow1` to compensate for `NPV()` discounting
 * the first cash flow by 1 period (off-by-one). We avoid that gotcha by computing
 * the PV ourselves with i starting at 0 — month 1 is discounted by 0 periods,
 * which is what we want since lease execution IS period 0.
 */
export function calcDiscountedNER(
  grid: MonthlyGridRow[],
  annualDiscountRate: number,
  span: number,
  term: number,
): number {
  if (term === 0) return 0;
  const r = annualDiscountRate / 12; // monthly compounding
  let pv = 0;
  for (let i = 0; i < span && i < grid.length; i++) {
    pv += grid[i].netCFPSF / Math.pow(1 + r, i);
  }
  return (pv / term) * 12;
}

// ---------------------------------------------------------------------------
// 5. Yield on Cost + averages
// ---------------------------------------------------------------------------

/**
 * Weighted-average annual rate over the term.
 * Includes the free-rent row at $0 (so free rent dilutes the average — same
 * as the Excel's H23 / L23 conventions).
 */
export function calcAvgRatePSF(schedule: AnnualScheduleRow[], term: number): number {
  if (term === 0) return 0;
  let weighted = 0;
  for (const row of schedule) {
    weighted += row.annualRatePSF * row.monthsActive;
  }
  return weighted / term;
}

// ---------------------------------------------------------------------------
// 6. The orchestrator
// ---------------------------------------------------------------------------

export function runScenario(
  inputs: ScenarioInputs,
  globals: Globals,
): ScenarioResults {
  const schedule = buildAnnualSchedule(inputs);
  const totalLCPercent = inputs.lcLLRepPercent + inputs.lcTenantRepPercent;
  const lcPSF = calcLC(inputs, totalLCPercent, inputs.lcCalculation);
  const grid = buildMonthlyGrid(inputs, globals, schedule, lcPSF);
  const term = inputs.leaseTermMonths;

  const execution = new Date(inputs.leaseExecutionDate);
  const commencement = new Date(inputs.leaseCommencement);
  const commencementOffset = Math.max(
    0,
    (commencement.getUTCFullYear() - execution.getUTCFullYear()) * 12 +
      (commencement.getUTCMonth() - execution.getUTCMonth()),
  );
  const span = commencementOffset + term;

  const undiscountedNER = calcUndiscountedNER(grid, span, term);
  const discountedNER = calcDiscountedNER(grid, globals.discountRate, span, term);

  // Amortization uplift — annual $/SF added to the contracted rate when the
  // landlord finances additional TI into base rent. Drives YoC numerators
  // and the value-creation card; the grid already folded it into baseRent.
  const additionalTIPSF = inputs.additionalTIPSF ?? 0;
  const uplift = calcAmortizationUpliftPSF(
    additionalTIPSF,
    globals.amortizationRate ?? 0,
    term,
  );

  const totalBasisPSF =
    globals.projectBasisPSF + inputs.tiAllowancePSF + additionalTIPSF + lcPSF;
  const avgRatePSF = calcAvgRatePSF(schedule, term) + uplift.annualPSF;

  // YoC Yr1 should reflect any per-year override on year 1, so pull the
  // rate from the schedule (which incorporates rentScheduleOverride[0])
  // rather than `inputs.baseRatePSF` (the formula seed). The amortization
  // uplift is added to express the steady-state rate the LL actually
  // receives (paying months only — free rent doesn't carry the uplift).
  const yr1Rate =
    (schedule.find((r) => r.year === 1)?.annualRatePSF ?? inputs.baseRatePSF) +
    uplift.annualPSF;
  const yocYr1 = totalBasisPSF > 0 ? yr1Rate / totalBasisPSF : 0;
  const yocTerm = totalBasisPSF > 0 ? avgRatePSF / totalBasisPSF : 0;

  const capRate = globals.capRate ?? 0;
  const capitalizedUpliftPSF = capRate > 0 ? uplift.annualPSF / capRate : 0;
  const valueCreationPSF = capitalizedUpliftPSF - additionalTIPSF;
  const valueCreationAbsolute = valueCreationPSF * inputs.proposedLeaseSF;

  const baseRent = sumColumn(grid, span, "baseRentPSF");
  const freeRent = sumColumn(grid, span, "freeRentPSF"); // negative
  const ti = sumColumn(grid, span, "tiPSF");             // negative
  const lc = sumColumn(grid, span, "lcPSF");             // negative
  const netCashFlow = baseRent + freeRent + ti + lc;

  const waterfall: WaterfallComponents = { baseRent, freeRent, ti, lc, netCashFlow };

  return {
    schedule,
    grid,
    undiscountedNER,
    discountedNER,
    yocYr1,
    yocTerm,
    totalBasisPSF,
    waterfall,
    totals: {
      lcPSF,
      freeRentValuePSF: -freeRent, // make the concession value positive
      tiPSF: inputs.tiAllowancePSF + additionalTIPSF,
      avgRatePSF,
    },
    totalsAbsolute: {
      lc: lcPSF * inputs.proposedLeaseSF,
      freeRentValue: -freeRent * inputs.proposedLeaseSF,
      ti: (inputs.tiAllowancePSF + additionalTIPSF) * inputs.proposedLeaseSF,
    },
    amortization: {
      monthlyUpliftPSF: uplift.monthlyPSF,
      annualUpliftPSF: uplift.annualPSF,
      capitalizedUpliftPSF,
      valueCreationPSF,
      valueCreationAbsolute,
    },
  };
}
