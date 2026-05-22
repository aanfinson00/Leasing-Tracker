// ───────────────────────────────────────────────────────────────────
// Lifted from Lease-Calculator/components/excel/buildWorkbook.ts
// on 2026-05-21. This copy is canonical for Leasing-Tracker.
//
// Excel workbook builder for the A vs B lease comparison. The math
// is rebuilt as live formulas: assumptions are editable cells, monthly
// grid + LC + NER + YoC all reference them. The user can change any
// input in Excel and headline metrics recompute.
//
// Layout per scenario sheet:
//   rows 1-22   Inputs (editable)
//   rows 25-27  Shared globals (editable)
//   rows 30-59  Annual schedule (formulas, 30-yr cap)
//   rows 65-424 Monthly grid (formulas, 360-mo horizon cap)
//   rows 426-440 Results + waterfall components (formulas)
//
// Reference implementation lives in src/lib/lease-math/calc.ts;
// every formula here is a one-to-one translation.
// ───────────────────────────────────────────────────────────────────

import ExcelJS from "exceljs";
import type { Globals, ScenarioInputs } from "../lease-math/types";

const HORIZON_MONTHS = 360; // 30-yr cap; matches the practical horizon
const ANNUAL_YEARS = 30;

// Anchor rows on a scenario sheet. Kept here as constants so the Summary
// sheet can build cross-sheet references without magic numbers.
const R = {
  // Inputs block
  name: 2,
  projectSF: 4,
  buildingSF: 5,
  leaseSF: 6,
  baseRate: 8,
  escalation: 9,
  freeRent: 11,
  tiAllowance: 12,
  tiDuration: 13,
  llRep: 15,
  tenantRep: 16,
  combinedLC: 17,
  lcCalc: 18,
  lcStructure: 19,
  term: 21,
  executionDate: 22,
  commencementDate: 23,
  // Shared globals
  discountRate: 25,
  basisPSF: 26,
  horizon: 27,
  // Helper cells (derived from inputs)
  commencementOffset: 28, // monthsBetween(execution, commencement)
  totalLC: 29, // computed from accrual sum × combined LC%
  // Annual schedule
  annualStart: 30,
  annualEnd: 30 + ANNUAL_YEARS - 1,
  // Monthly grid
  gridStart: 65,
  gridEnd: 65 + HORIZON_MONTHS - 1,
  // Results
  span: 426,
  undiscNER: 427,
  discNER: 428,
  avgRate: 429,
  totalBasis: 430,
  yocYr1: 431,
  yocTerm: 432,
  waterfallBase: 434,
  waterfallFree: 435,
  waterfallTI: 436,
  waterfallLC: 437,
  waterfallNet: 438,
} as const;

// Column letters on the monthly grid.
const C = {
  m: "A",
  date: "B",
  annualRate: "C",
  baseRent: "D",
  freeRent: "E",
  ti: "F",
  lc: "G",
  pmi: "H", // paying-month index
  tierRate: "I",
  lcAccrual: "J",
  netCF: "K",
  discFactor: "L", // 1 / (1 + r/12)^(m - 1) — used by Discounted NER
  discountedCF: "M", // netCF × discFactor
} as const;

const fmts = {
  int: "#,##0",
  money: '"$"#,##0.00',
  pct: "0.00%",
  date: "yyyy-mm-dd",
  signedMoney: '"+$"#,##0.00;"-$"#,##0.00;"$"0.00',
  signedPct: "+0.00%;-0.00%;0.00%",
};

const fillSection = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF1F5F9" }, // slate-100
} as const;
const fillInput = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFDBEAFE" }, // blue-100
} as const;

function writeInputs(
  ws: ExcelJS.Worksheet,
  inputs: ScenarioInputs,
  globals: Globals,
): void {
  // Section header
  ws.getCell("A1").value = "Inputs";
  ws.getCell("A1").font = { bold: true };
  ws.getCell("A1").fill = fillSection;

  const labelValue = (row: number, label: string, value: ExcelJS.CellValue, numFmt?: string) => {
    ws.getCell(`A${row}`).value = label;
    const c = ws.getCell(`B${row}`);
    c.value = value;
    c.fill = fillInput;
    if (numFmt) c.numFmt = numFmt;
  };

  labelValue(R.name, "Scenario name", inputs.name);
  labelValue(R.projectSF, "Project SF", inputs.projectSF, fmts.int);
  labelValue(R.buildingSF, "Building SF", inputs.buildingSF, fmts.int);
  labelValue(R.leaseSF, "Lease SF", inputs.proposedLeaseSF, fmts.int);
  labelValue(R.baseRate, "Base rate ($/SF, yr 1)", inputs.baseRatePSF, fmts.money);
  labelValue(R.escalation, "Annual escalation", inputs.escalation, fmts.pct);
  labelValue(R.freeRent, "Free rent (mo)", inputs.freeRentMonths, fmts.int);
  labelValue(R.tiAllowance, "TI allowance ($/SF)", inputs.tiAllowancePSF, fmts.money);
  labelValue(R.tiDuration, "TI duration (mo)", inputs.tiDurationMonths, fmts.int);
  labelValue(R.llRep, "Landlord rep %", inputs.lcLLRepPercent, fmts.pct);
  labelValue(R.tenantRep, "Tenant rep %", inputs.lcTenantRepPercent, fmts.pct);

  // Combined LC = LL rep + Tenant rep (formula).
  ws.getCell(`A${R.combinedLC}`).value = "Combined LC %";
  ws.getCell(`B${R.combinedLC}`).value = { formula: `B${R.llRep}+B${R.tenantRep}` };
  ws.getCell(`B${R.combinedLC}`).numFmt = fmts.pct;

  labelValue(R.lcCalc, "LC calc (tiered/flat)", inputs.lcCalculation);
  labelValue(R.lcStructure, "LC payment (upfront/split50)", inputs.lcStructure);

  labelValue(R.term, "Lease term (mo)", inputs.leaseTermMonths, fmts.int);
  // Dates: parse ISO strings into Date objects so Excel treats them as dates
  // instead of text. The math depends on EDATE / YEAR / MONTH working.
  labelValue(R.executionDate, "Execution date", new Date(inputs.leaseExecutionDate), fmts.date);
  labelValue(R.commencementDate, "Commencement date", new Date(inputs.leaseCommencement), fmts.date);

  // Shared globals
  ws.getCell("A24").value = "Shared (globals)";
  ws.getCell("A24").font = { bold: true };
  ws.getCell("A24").fill = fillSection;
  labelValue(R.discountRate, "Discount rate", globals.discountRate, fmts.pct);
  labelValue(R.basisPSF, "Current basis ($/SF)", globals.projectBasisPSF, fmts.money);
  labelValue(R.horizon, "Horizon (mo)", globals.horizonMonths, fmts.int);

  // Derived helpers (formulas).
  ws.getCell(`A${R.commencementOffset}`).value = "Commencement offset (mo)";
  ws.getCell(`B${R.commencementOffset}`).value = {
    formula: `MAX(0,(YEAR(B${R.commencementDate})-YEAR(B${R.executionDate}))*12+MONTH(B${R.commencementDate})-MONTH(B${R.executionDate}))`,
  };
  ws.getCell(`B${R.commencementOffset}`).numFmt = fmts.int;

  // Total LC PSF (formula) — sum of per-month LC accrual × combined LC%.
  // Has to be defined before the LC PSF column in the grid (forward ref).
  ws.getCell(`A${R.totalLC}`).value = "Total LC ($/SF)";
  ws.getCell(`B${R.totalLC}`).value = {
    formula: `SUM(${C.lcAccrual}${R.gridStart}:${C.lcAccrual}${R.gridEnd})*B${R.combinedLC}`,
  };
  ws.getCell(`B${R.totalLC}`).numFmt = fmts.money;
}

function writeAnnualSchedule(ws: ExcelJS.Worksheet): void {
  ws.getCell(`A${R.annualStart - 1}`).value = "Annual schedule";
  ws.getCell(`A${R.annualStart - 1}`).font = { bold: true };
  // Header row sits on the same row as annualStart - 1 already used; bump
  // headers onto annualStart row's left-adjacent cells, but for simplicity
  // we just label the columns above the first year row:
  // Year | Annual rate PSF | Months active

  for (let i = 0; i < ANNUAL_YEARS; i++) {
    const row = R.annualStart + i;
    const yr = i + 1;
    ws.getCell(`A${row}`).value = yr;
    // Annual rate = baseRate × (1 + escalation)^(yr - 1) when yr is in-term,
    // else 0. In-term iff (yr - 1) × 12 < term.
    ws.getCell(`B${row}`).value = {
      formula: `IF((${yr}-1)*12<$B$${R.term},$B$${R.baseRate}*(1+$B$${R.escalation})^(${yr}-1),0)`,
    };
    ws.getCell(`B${row}`).numFmt = fmts.money;
    // Months active in this year: clamp(term - (yr-1)*12) to [0, 12].
    ws.getCell(`C${row}`).value = {
      formula: `MAX(0,MIN(12,$B$${R.term}-(${yr}-1)*12))`,
    };
    ws.getCell(`C${row}`).numFmt = fmts.int;
  }
}

function writeMonthlyGrid(ws: ExcelJS.Worksheet): void {
  // Header row (row gridStart - 1)
  const headerRow = R.gridStart - 1;
  ws.getCell(`A${headerRow}`).value = "Monthly grid";
  ws.getCell(`A${headerRow}`).font = { bold: true };
  ws.getCell(`A${headerRow}`).fill = fillSection;
  ws.getCell(`${C.m}${headerRow + 0}`).value = "m"; // unused; m starts at gridStart

  for (let i = 0; i < HORIZON_MONTHS; i++) {
    const row = R.gridStart + i;
    const m = i + 1;

    // m (literal)
    ws.getCell(`${C.m}${row}`).value = m;

    // date = execution + (m - 1) months
    ws.getCell(`${C.date}${row}`).value = {
      formula: `EDATE($B$${R.executionDate},${m}-1)`,
    };
    ws.getCell(`${C.date}${row}`).numFmt = fmts.date;

    // monthFromCommencement = m - commencementOffset. Calendar year =
    // FLOOR((mfc - 1)/12) + 1, clamped to in-lease. Annual rate looked up
    // from the schedule by calendar year (in-lease only).
    const mfc = `(${m}-$B$${R.commencementOffset})`;
    const inLease = `AND(${mfc}>=1,${mfc}<=$B$${R.term})`;
    const calYear = `(INT((${mfc}-1)/12)+1)`;
    // VLOOKUP into the Annual schedule block to get the annual rate. The 0
    // (= FALSE) flag forces an exact match; using the bare keyword FALSE
    // confuses some non-Excel evaluators (HyperFormula reads it as a
    // missing defined name), and Excel itself accepts both.
    const annualRateLookup = `VLOOKUP(${calYear},$A$${R.annualStart}:$B$${R.annualEnd},2,0)`;
    ws.getCell(`${C.annualRate}${row}`).value = {
      formula: `IF(${inLease},${annualRateLookup},0)`,
    };
    ws.getCell(`${C.annualRate}${row}`).numFmt = fmts.money;

    // isFree = mfc BETWEEN 1 AND freeRent (only when in-lease)
    const isFree = `AND(${mfc}>=1,${mfc}<=$B$${R.freeRent})`;
    // baseRent = IF(isFree, 0, annualRate/12). annualRate is already 0 when
    // not in-lease, so this naturally zeros out.
    ws.getCell(`${C.baseRent}${row}`).value = {
      formula: `IF(${isFree},0,${C.annualRate}${row}/12)`,
    };
    ws.getCell(`${C.baseRent}${row}`).numFmt = fmts.money;

    // freeRent (offset) = IF(isFree, -annualRate/12, 0)
    ws.getCell(`${C.freeRent}${row}`).value = {
      formula: `IF(${isFree},-${C.annualRate}${row}/12,0)`,
    };
    ws.getCell(`${C.freeRent}${row}`).numFmt = fmts.money;

    // TI = IF(m in [1..tiDuration], -tiAllowance/tiDuration, 0)
    ws.getCell(`${C.ti}${row}`).value = {
      formula: `IF(AND(${m}>=1,${m}<=$B$${R.tiDuration}),-$B$${R.tiAllowance}/$B$${R.tiDuration},0)`,
    };
    ws.getCell(`${C.ti}${row}`).numFmt = fmts.money;

    // LC PSF: half (or full) at execution (m=1), half at commencement month.
    // commencementMonth = commencementOffset + 1.
    const upfront = `(B${R.lcStructure}="upfront")`;
    const lcExec = `IF(${upfront},-B${R.totalLC},-B${R.totalLC}/2)`;
    const lcCom = `IF(${upfront},0,-B${R.totalLC}/2)`;
    const cMonth = `(B${R.commencementOffset}+1)`;
    ws.getCell(`${C.lc}${row}`).value = {
      formula: `IF(${m}=1,${lcExec},0)+IF(${m}=${cMonth},${lcCom},0)`,
    };
    ws.getCell(`${C.lc}${row}`).numFmt = fmts.money;

    // Paying-month index = mfc - freeRent when in-lease AND mfc > freeRent, else 0
    ws.getCell(`${C.pmi}${row}`).value = {
      formula: `IF(AND(${inLease},${mfc}>$B$${R.freeRent}),${mfc}-$B$${R.freeRent},0)`,
    };
    ws.getCell(`${C.pmi}${row}`).numFmt = fmts.int;

    // Tier rate: flat → 1 for any paying month; tiered → 1 for pmi 1-60,
    // 0.5 for pmi 61+, 0 otherwise.
    const pmi = `${C.pmi}${row}`;
    ws.getCell(`${C.tierRate}${row}`).value = {
      formula: `IF($B$${R.lcCalc}="flat",IF(${pmi}>=1,1,0),IF(AND(${pmi}>=1,${pmi}<=60),1,IF(${pmi}>60,0.5,0)))`,
    };

    // LC accrual = baseRent × tierRate (only nonzero in paying months).
    ws.getCell(`${C.lcAccrual}${row}`).value = {
      formula: `${C.baseRent}${row}*${C.tierRate}${row}`,
    };
    ws.getCell(`${C.lcAccrual}${row}`).numFmt = fmts.money;

    // Net CF = base + free + ti + lc
    ws.getCell(`${C.netCF}${row}`).value = {
      formula: `${C.baseRent}${row}+${C.freeRent}${row}+${C.ti}${row}+${C.lc}${row}`,
    };
    ws.getCell(`${C.netCF}${row}`).numFmt = fmts.money;

    // Discount factor = 1 / (1 + r/12)^(m - 1) — month 1 is undiscounted
    // (execution period 0), matching calcDiscountedNER in lib/calc.ts.
    ws.getCell(`${C.discFactor}${row}`).value = {
      formula: `1/(1+$B$${R.discountRate}/12)^(${m}-1)`,
    };
    // Discounted netCF = netCF × discount factor (per-row product keeps the
    // Results block's SUM trivial and dodges SUMPRODUCT array-range quirks).
    ws.getCell(`${C.discountedCF}${row}`).value = {
      formula: `${C.netCF}${row}*${C.discFactor}${row}`,
    };
    ws.getCell(`${C.discountedCF}${row}`).numFmt = fmts.money;
  }
}

function writeResults(ws: ExcelJS.Worksheet): void {
  const headerRow = R.span - 1;
  ws.getCell(`A${headerRow}`).value = "Results";
  ws.getCell(`A${headerRow}`).font = { bold: true };
  ws.getCell(`A${headerRow}`).fill = fillSection;

  const netRange = `${C.netCF}${R.gridStart}:${C.netCF}${R.gridEnd}`;
  const annualRange = `${C.annualRate}${R.gridStart}:${C.annualRate}${R.gridEnd}`;

  // Span (informational): commencementOffset + term
  ws.getCell(`A${R.span}`).value = "Span (mo)";
  ws.getCell(`B${R.span}`).value = { formula: `B${R.commencementOffset}+B${R.term}` };
  ws.getCell(`B${R.span}`).numFmt = fmts.int;

  // Undiscounted NER = SUM(netCF) / term × 12
  ws.getCell(`A${R.undiscNER}`).value = "Undiscounted NER ($/SF)";
  ws.getCell(`B${R.undiscNER}`).value = {
    formula: `IF(B${R.term}=0,0,SUM(${netRange})/B${R.term}*12)`,
  };
  ws.getCell(`B${R.undiscNER}`).numFmt = fmts.money;
  ws.getCell(`B${R.undiscNER}`).font = { bold: true };

  // Discounted NER = SUM(netCF × discountFactor) / term × 12. The per-month
  // product lives in the grid's discountedCF column.
  const discountedRange = `${C.discountedCF}${R.gridStart}:${C.discountedCF}${R.gridEnd}`;
  ws.getCell(`A${R.discNER}`).value = "Discounted NER ($/SF)";
  ws.getCell(`B${R.discNER}`).value = {
    formula: `IF(B${R.term}=0,0,SUM(${discountedRange})/B${R.term}*12)`,
  };
  ws.getCell(`B${R.discNER}`).numFmt = fmts.money;
  ws.getCell(`B${R.discNER}`).font = { bold: true };

  // Avg rate PSF = SUMPRODUCT(annualRate/12) × 12 / term (only counts in-lease)
  ws.getCell(`A${R.avgRate}`).value = "Avg rate ($/SF, term)";
  ws.getCell(`B${R.avgRate}`).value = {
    formula: `IF(B${R.term}=0,0,SUMPRODUCT(${annualRange})/12*12/B${R.term})`,
  };
  ws.getCell(`B${R.avgRate}`).numFmt = fmts.money;

  // Total basis = projectBasis + tiAllowance + totalLC
  ws.getCell(`A${R.totalBasis}`).value = "Total basis ($/SF)";
  ws.getCell(`B${R.totalBasis}`).value = {
    formula: `B${R.basisPSF}+B${R.tiAllowance}+B${R.totalLC}`,
  };
  ws.getCell(`B${R.totalBasis}`).numFmt = fmts.money;

  // YoC Yr 1 = annualRateYr1 / totalBasis (Yr1 is annualStart row, col B)
  ws.getCell(`A${R.yocYr1}`).value = "YoC Yr 1";
  ws.getCell(`B${R.yocYr1}`).value = {
    formula: `IF(B${R.totalBasis}=0,0,B${R.annualStart}/B${R.totalBasis})`,
  };
  ws.getCell(`B${R.yocYr1}`).numFmt = fmts.pct;

  // YoC term = avgRate / totalBasis
  ws.getCell(`A${R.yocTerm}`).value = "YoC term";
  ws.getCell(`B${R.yocTerm}`).value = {
    formula: `IF(B${R.totalBasis}=0,0,B${R.avgRate}/B${R.totalBasis})`,
  };
  ws.getCell(`B${R.yocTerm}`).numFmt = fmts.pct;

  // Waterfall components — sums of each column in the monthly grid.
  ws.getCell(`A${R.waterfallBase}`).value = "Waterfall: base rent";
  ws.getCell(`B${R.waterfallBase}`).value = {
    formula: `SUM(${C.baseRent}${R.gridStart}:${C.baseRent}${R.gridEnd})`,
  };
  ws.getCell(`B${R.waterfallBase}`).numFmt = fmts.money;

  ws.getCell(`A${R.waterfallFree}`).value = "Waterfall: free rent";
  ws.getCell(`B${R.waterfallFree}`).value = {
    formula: `SUM(${C.freeRent}${R.gridStart}:${C.freeRent}${R.gridEnd})`,
  };
  ws.getCell(`B${R.waterfallFree}`).numFmt = fmts.money;

  ws.getCell(`A${R.waterfallTI}`).value = "Waterfall: TI";
  ws.getCell(`B${R.waterfallTI}`).value = {
    formula: `SUM(${C.ti}${R.gridStart}:${C.ti}${R.gridEnd})`,
  };
  ws.getCell(`B${R.waterfallTI}`).numFmt = fmts.money;

  ws.getCell(`A${R.waterfallLC}`).value = "Waterfall: LC";
  ws.getCell(`B${R.waterfallLC}`).value = {
    formula: `SUM(${C.lc}${R.gridStart}:${C.lc}${R.gridEnd})`,
  };
  ws.getCell(`B${R.waterfallLC}`).numFmt = fmts.money;

  ws.getCell(`A${R.waterfallNet}`).value = "Waterfall: net CF";
  ws.getCell(`B${R.waterfallNet}`).value = {
    formula: `SUM(${netRange})`,
  };
  ws.getCell(`B${R.waterfallNet}`).numFmt = fmts.money;
}

function buildScenarioSheet(
  ws: ExcelJS.Worksheet,
  inputs: ScenarioInputs,
  globals: Globals,
): void {
  ws.getColumn(1).width = 28;
  ws.getColumn(2).width = 16;
  ws.getColumn(3).width = 14;

  writeInputs(ws, inputs, globals);
  writeAnnualSchedule(ws);
  writeMonthlyGrid(ws);
  writeResults(ws);
}

function buildSummarySheet(
  ws: ExcelJS.Worksheet,
  propertyName: string,
  aName: string,
  bName: string,
): void {
  ws.getColumn(1).width = 28;
  for (let i = 2; i <= 5; i++) ws.getColumn(i).width = 16;

  ws.getCell("A1").value = propertyName || "RFP Comparison";
  ws.getCell("A1").font = { bold: true, size: 16 };
  ws.getCell("A2").value = "Net Effective Rent comparison · industrial lease";
  ws.getCell("A2").font = { color: { argb: "FF64748B" } };
  ws.getCell("A3").value = `${aName}  vs  ${bName}`;
  ws.getCell("A3").font = { color: { argb: "FF64748B" } };

  const headerRow = 5;
  ws.getRow(headerRow).font = { bold: true };
  ws.getRow(headerRow).fill = fillSection;
  ws.getCell(`A${headerRow}`).value = "Metric";
  ws.getCell(`B${headerRow}`).value = aName;
  ws.getCell(`C${headerRow}`).value = bName;
  ws.getCell(`D${headerRow}`).value = "Δ %";
  ws.getCell(`E${headerRow}`).value = "Δ $";

  // Each row points at a cell on the respective scenario sheet by anchored
  // row constant (R.undiscNER etc.).
  const metricRow = (
    row: number,
    label: string,
    scenarioRow: number,
    numFmt: string,
    deltaFmt: string,
  ) => {
    ws.getCell(`A${row}`).value = label;
    ws.getCell(`B${row}`).value = { formula: `'Scenario A'!B${scenarioRow}` };
    ws.getCell(`B${row}`).numFmt = numFmt;
    ws.getCell(`C${row}`).value = { formula: `'Scenario B'!B${scenarioRow}` };
    ws.getCell(`C${row}`).numFmt = numFmt;
    // Δ%: (b - a) / |a|
    ws.getCell(`D${row}`).value = {
      formula: `IF(B${row}=0,0,(C${row}-B${row})/ABS(B${row}))`,
    };
    ws.getCell(`D${row}`).numFmt = fmts.signedPct;
    // Δ$ (or Δpct for percent metrics): b - a, formatted by the row's native unit
    ws.getCell(`E${row}`).value = { formula: `C${row}-B${row}` };
    ws.getCell(`E${row}`).numFmt = deltaFmt;
  };

  metricRow(6, "Undiscounted NER ($/SF)", R.undiscNER, fmts.money, fmts.signedMoney);
  metricRow(7, "Discounted NER ($/SF)", R.discNER, fmts.money, fmts.signedMoney);
  metricRow(8, "YoC Yr 1", R.yocYr1, fmts.pct, fmts.signedPct);
  metricRow(9, "YoC Term", R.yocTerm, fmts.pct, fmts.signedPct);
  metricRow(10, "Total basis ($/SF)", R.totalBasis, fmts.money, fmts.signedMoney);

  // Waterfall section (component sums per scenario)
  const wfHeader = 12;
  ws.getCell(`A${wfHeader}`).value = "Waterfall components ($/SF over term)";
  ws.getCell(`A${wfHeader}`).font = { bold: true };
  ws.getCell(`A${wfHeader}`).fill = fillSection;

  const wfRow = (row: number, label: string, scenarioRow: number) => {
    ws.getCell(`A${row}`).value = label;
    ws.getCell(`B${row}`).value = { formula: `'Scenario A'!B${scenarioRow}` };
    ws.getCell(`B${row}`).numFmt = fmts.money;
    ws.getCell(`C${row}`).value = { formula: `'Scenario B'!B${scenarioRow}` };
    ws.getCell(`C${row}`).numFmt = fmts.money;
  };

  wfRow(13, "Base rent", R.waterfallBase);
  wfRow(14, "Free rent (concession)", R.waterfallFree);
  wfRow(15, "TI", R.waterfallTI);
  wfRow(16, "LC", R.waterfallLC);
  wfRow(17, "Net CF", R.waterfallNet);
}

export interface BuildArgs {
  propertyName: string;
  aName: string;
  aInputs: ScenarioInputs;
  bName: string;
  bInputs: ScenarioInputs;
  globals: Globals;
}

export async function buildWorkbook(args: BuildArgs): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "RFP Analyzer";
  wb.created = new Date();

  const summary = wb.addWorksheet("Summary");
  const a = wb.addWorksheet("Scenario A");
  const b = wb.addWorksheet("Scenario B");

  buildScenarioSheet(a, args.aInputs, args.globals);
  buildScenarioSheet(b, args.bInputs, args.globals);
  buildSummarySheet(summary, args.propertyName, args.aName, args.bName);

  const buf = await wb.xlsx.writeBuffer();
  // exceljs declares its return type as Buffer in some versions; cast to
  // ArrayBuffer so the download path works without further conversion.
  return buf as ArrayBuffer;
}
