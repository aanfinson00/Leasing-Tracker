// ───────────────────────────────────────────────────────────────────
// Lifted from Lease-Calculator/lib/types.ts on 2026-05-21.
// This copy is canonical for Leasing-Tracker — Lease-Calculator may
// drift independently. Property + AppState interfaces from the
// original were dropped: Leasing-Tracker uses Deal as its property
// concept, and there's no Zustand-persisted top-level state to model.
//
// Conventions:
// - All money is USD. PSF = "per square foot".
// - All rates are decimals: 0.03 = 3%, NOT 3.
// - All durations are months unless suffixed (e.g. annualRatePSF).
// - Negative numbers in cash-flow rows mean money OUT.
// ───────────────────────────────────────────────────────────────────

export type LCStructure = "upfront" | "split50";
//  upfront — full LC paid in month 1
//  split50 — 50% in month 1, 50% at rent commencement (after free rent)

export type LCCalculation = "tiered" | "flat";
//  tiered — full % on yr 1-5 rent, half % on yr 6+ rent (industrial standard)
//  flat   — full % on all years' rent

export interface Globals {
  /** Annual discount rate, decimal (0.08 = 8%). Compounded monthly in PV. */
  discountRate: number;
  /**
   * Current project basis PSF, $ — what you're already in for on this
   * asset before the new deal's TI/LC. Whatever combination of land,
   * shell, and soft costs you carry; entered as one number rather than
   * split. The headline Total Basis adds the scenario's TI + LC on top.
   */
  projectBasisPSF: number;
  /** Default lease horizon in months. Used when a scenario's term is shorter. */
  horizonMonths: number;
  /**
   * Annual amortization rate used to amortize additional TI into base rent,
   * decimal (0.08 = 8%). The landlord's effective cost of capital for the
   * additional spend. Monthly rests (rate / 12).
   */
  amortizationRate: number;
  /**
   * Market exit cap rate, decimal (0.06 = 6%). Used to capitalize the
   * amortization rent uplift into a "value creation" number — the increase
   * in asset value vs. forfeiting the additional TI and holding rate flat.
   */
  capRate: number;
}

export interface ScenarioInputs {
  /** Display name (e.g. "UW", "Counter v1"). */
  name: string;

  /**
   * Optional deal code (Deal.dealId from Leasing-Tracker, or a CSV comp
   * code on the Lease-Calculator side). Audit trail only.
   */
  dealCode?: string;

  /**
   * Free-text notes about the scenario — assumptions, status, deal context.
   * Metadata only; the calc engine never reads this.
   */
  notes?: string;

  // SF block
  projectSF: number;
  buildingSF: number;
  proposedLeaseSF: number;

  // Rent block
  /** Annual base rent PSF in year 1, $. */
  baseRatePSF: number;
  /** Annual escalation, decimal (0.03 = 3%). */
  escalation: number;
  /**
   * Optional per-year rent override. Sparse: index Y-1 corresponds to
   * lease year Y. A `null` (or undefined) entry means "use the formula"
   * (constant escalation). A number overrides the rate for that year
   * while leaving other years on the formula.
   */
  rentScheduleOverride?: (number | null)[];

  /** Landlord-rep brokerage commission rate, decimal (0.045 = 4.5%). */
  lcLLRepPercent: number;
  /** Tenant-rep brokerage commission rate, decimal. */
  lcTenantRepPercent: number;
  /** How LC totals are calculated against the rent schedule. */
  lcCalculation: LCCalculation;
  /** How LC payments are timed. */
  lcStructure: LCStructure;

  // Concessions
  /** TI allowance PSF, $. */
  tiAllowancePSF: number;
  /**
   * Additional TI PSF, $ — extra TI above the standard `tiAllowancePSF` that
   * gets amortized into base rent at the global `amortizationRate`.
   */
  additionalTIPSF: number;
  /** Free rent in months (always front-loaded — months 1..freeRentMonths). */
  freeRentMonths: number;

  // Term
  /** Total lease term in months, INCLUDING free-rent period. */
  leaseTermMonths: number;
  /** ISO date string (YYYY-MM-DD) for lease commencement. */
  leaseCommencement: string;
  /** ISO date string (YYYY-MM-DD) for lease execution (signing). */
  leaseExecutionDate: string;
  /**
   * How many months the TI work takes. The TI allowance is paid out evenly
   * across this many months starting at execution. 1 = single lump sum.
   */
  tiDurationMonths: number;
}

/** One row of the year-by-year rent schedule. */
export interface AnnualScheduleRow {
  /** 0 = free-rent row, 1 = year 1, 2 = year 2, ... */
  year: number;
  /** Annual rate PSF for that year, $. 0 for the free-rent row. */
  annualRatePSF: number;
  /** How many months of the term fall into this year (0-12). */
  monthsActive: number;
}

/** One row of the month-by-month cash flow grid (all values PSF). */
export interface MonthlyGridRow {
  /** 1-indexed month number from lease execution. */
  month: number;
  /** ISO date string for this month. */
  date: string;
  baseRentPSF: number;
  /** Negative offset to base rent during free-rent period (NER bookkeeping). */
  freeRentPSF: number;
  /** Negative — TI draw spread across tiDurationMonths starting at execution. */
  tiPSF: number;
  /** Negative — leasing commission, timing depends on lcStructure. */
  lcPSF: number;
  /** Sum of the four columns above (NER basis). */
  netCFPSF: number;
}

/** PSF totals over the term — feeds the NER waterfall chart. */
export interface WaterfallComponents {
  baseRent: number;
  freeRent: number;     // negative
  ti: number;           // negative
  lc: number;           // negative
  netCashFlow: number;  // sum of the four
}

export interface ScenarioResults {
  schedule: AnnualScheduleRow[];
  grid: MonthlyGridRow[];

  /** Headline metric: undiscounted annual NER PSF, $. */
  undiscountedNER: number;
  /** Headline metric: discounted annual NER PSF, $. */
  discountedNER: number;

  /** Year-1 base rate ÷ building cost PSF, decimal. */
  yocYr1: number;
  /** Avg rate over term ÷ building cost PSF, decimal. */
  yocTerm: number;

  /**
   * Total project basis PSF, $: land + shell + soft costs + TI + LC.
   * Denominator for Yield on Cost.
   */
  totalBasisPSF: number;

  /** PSF — feeds the waterfall. */
  waterfall: WaterfallComponents;

  /** Convenience: PSF totals (mostly for UI). */
  totals: {
    lcPSF: number;
    /** Free rent value, expressed as a positive $ (concession value). */
    freeRentValuePSF: number;
    tiPSF: number;
    /** Weighted-average annual rate over term, $. */
    avgRatePSF: number;
  };

  /** Convenience: absolute $ totals (= PSF × proposedLeaseSF). */
  totalsAbsolute: {
    lc: number;
    freeRentValue: number;
    ti: number;
  };

  /**
   * TI amortization + value creation block. All zero when `additionalTIPSF`
   * is 0 (i.e. no amortization deal). PSF values; absolute is × leaseSF.
   */
  amortization: {
    /** Constant monthly rent uplift PSF, $ — PMT of the additional TI. */
    monthlyUpliftPSF: number;
    /** Annual rent uplift PSF (= monthlyUpliftPSF × 12), $. */
    annualUpliftPSF: number;
    /** Capitalized value of the annual uplift at `capRate`, $/SF. */
    capitalizedUpliftPSF: number;
    /** Value creation PSF = capitalizedUpliftPSF − additionalTIPSF, $/SF. */
    valueCreationPSF: number;
    /** Absolute value creation, $ (= valueCreationPSF × proposedLeaseSF). */
    valueCreationAbsolute: number;
  };
}

// ───────────────────────────────────────────────────────────────────
// Defaults (lifted from Lease-Calculator/lib/store.ts seed values).
// Used by the "+ New scenario" auto-fill in UnderwriteView when the
// selected Deal doesn't supply a particular field.
// ───────────────────────────────────────────────────────────────────

export const DEFAULT_GLOBALS: Globals = {
  discountRate: 0.08,
  projectBasisPSF: 140,
  horizonMonths: 204,
  amortizationRate: 0.08,
  capRate: 0.06,
};

export const DEFAULT_INPUTS_BASE: Omit<ScenarioInputs, 'name' | 'leaseCommencement' | 'leaseExecutionDate'> = {
  notes: '',
  projectSF: 300_000,
  buildingSF: 300_000,
  proposedLeaseSF: 300_000,
  baseRatePSF: 7,
  escalation: 0.03,
  lcLLRepPercent: 0.03,
  lcTenantRepPercent: 0.06,
  lcCalculation: 'tiered',
  lcStructure: 'split50',
  tiAllowancePSF: 5,
  additionalTIPSF: 0,
  freeRentMonths: 4,
  leaseTermMonths: 125,
  tiDurationMonths: 1,
};
