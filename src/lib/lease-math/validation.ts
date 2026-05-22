// ───────────────────────────────────────────────────────────────────
// Lifted from Lease-Calculator/lib/validation.ts on 2026-05-21.
// This copy is canonical for Leasing-Tracker — Lease-Calculator may
// drift independently.
//
// Scenario validation — pure check that returns soft warnings about
// the inputs. The calc engine accepts any input and silently clamps
// where it has to (free rent > term, execution > commencement, etc.);
// these warnings give the user a heads-up.
//
// Severity:
//   "warn" — semantic issue or value got clamped.
//   "info" — unusual but legal; just a sanity check.
//
// No errors are returned — the calc engine is total.
// ───────────────────────────────────────────────────────────────────

import type { ScenarioInputs } from "./types";

export type WarningSeverity = "warn" | "info";

export interface Warning {
  /** Which input field this attaches to (for inline icon placement). */
  field: keyof ScenarioInputs;
  severity: WarningSeverity;
  message: string;
}

export function validateScenario(inputs: ScenarioInputs): Warning[] {
  const out: Warning[] = [];

  // -- Hard semantic warns (calc engine clamps these) ---------------------

  if (inputs.freeRentMonths > inputs.leaseTermMonths) {
    out.push({
      field: "freeRentMonths",
      severity: "warn",
      message: `Free rent (${Math.round(inputs.freeRentMonths)} mo) exceeds the lease term (${inputs.leaseTermMonths} mo). Calc clamps to the term.`,
    });
  }

  const exec = new Date(inputs.leaseExecutionDate);
  const comm = new Date(inputs.leaseCommencement);
  const execValid = Number.isFinite(exec.getTime());
  const commValid = Number.isFinite(comm.getTime());

  if (!execValid) {
    out.push({
      field: "leaseExecutionDate",
      severity: "warn",
      message: "Execution date is empty or invalid. Calc collapses execution-to-commencement to zero — TI and 50% LC are paid in month 1.",
    });
  }
  if (!commValid) {
    out.push({
      field: "leaseCommencement",
      severity: "warn",
      message: "Commencement date is empty or invalid. Schedule and rent timing won't be reliable.",
    });
  }
  if (execValid && commValid && exec > comm) {
    out.push({
      field: "leaseExecutionDate",
      severity: "warn",
      message: "Execution date is after commencement. Calc clamps the gap to zero.",
    });
  }

  if (inputs.baseRatePSF <= 0) {
    out.push({
      field: "baseRatePSF",
      severity: "warn",
      message: "Base rate is zero or negative.",
    });
  }

  if (inputs.proposedLeaseSF > inputs.buildingSF) {
    out.push({
      field: "proposedLeaseSF",
      severity: "warn",
      message: "Lease SF exceeds building SF.",
    });
  }

  if (inputs.additionalTIPSF < 0) {
    out.push({
      field: "additionalTIPSF",
      severity: "warn",
      message: "Additional TI is negative.",
    });
  }

  if (inputs.buildingSF > inputs.projectSF) {
    out.push({
      field: "buildingSF",
      severity: "warn",
      message: "Building SF exceeds project SF.",
    });
  }

  // -- Soft "this looks unusual" infos -------------------------------------

  const totalLC = inputs.lcLLRepPercent + inputs.lcTenantRepPercent;
  if (totalLC > 0.15) {
    out.push({
      field: "lcLLRepPercent",
      severity: "info",
      message: `Combined LC ${(totalLC * 100).toFixed(2)}% is unusually high (typical industrial range 6-12%).`,
    });
  }

  if (inputs.tiDurationMonths > 24) {
    out.push({
      field: "tiDurationMonths",
      severity: "info",
      message: "TI duration exceeds 24 months — verify the construction schedule.",
    });
  }

  if (
    inputs.additionalTIPSF > 0 &&
    inputs.tiAllowancePSF > 0 &&
    inputs.additionalTIPSF > inputs.tiAllowancePSF * 5
  ) {
    out.push({
      field: "additionalTIPSF",
      severity: "info",
      message: `Additional TI ($${inputs.additionalTIPSF.toFixed(2)}) is more than 5× the standard allowance — verify.`,
    });
  }

  if (inputs.leaseTermMonths < 12) {
    out.push({
      field: "leaseTermMonths",
      severity: "info",
      message: "Lease term is under 12 months.",
    });
  }
  if (inputs.leaseTermMonths > 240) {
    out.push({
      field: "leaseTermMonths",
      severity: "info",
      message: "Lease term exceeds 20 years — verify.",
    });
  }

  return out;
}
