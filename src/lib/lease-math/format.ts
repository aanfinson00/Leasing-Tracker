// ───────────────────────────────────────────────────────────────────
// Lifted from Lease-Calculator/lib/format.ts on 2026-05-21.
// This copy is canonical for Leasing-Tracker — Lease-Calculator may
// drift independently.
//
// Display formatters. Pure functions; easy to test. Every formatter
// accepts NaN/null/undefined and returns "-" (ASCII hyphen, kept that
// way for PDF export safety on the Lease-Calculator side).
// ───────────────────────────────────────────────────────────────────

const isNotFinite = (v: unknown): boolean =>
  v == null || typeof v !== "number" || !Number.isFinite(v);

/** $1,234.56 */
export function fmtCurrency(v: number | null | undefined, fractionDigits = 2): string {
  if (isNotFinite(v)) return "-";
  return (v as number).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/** $7.34 PSF */
export function fmtPSF(v: number | null | undefined, fractionDigits = 2): string {
  if (isNotFinite(v)) return "-";
  return `${fmtCurrency(v, fractionDigits)} PSF`;
}

/** 8.00% */
export function fmtPercent(v: number | null | undefined, fractionDigits = 2): string {
  if (isNotFinite(v)) return "-";
  return `${((v as number) * 100).toFixed(fractionDigits)}%`;
}

/** 300,000 SF */
export function fmtSF(v: number | null | undefined): string {
  if (isNotFinite(v)) return "-";
  return `${(v as number).toLocaleString("en-US")} SF`;
}

/** Difference with sign: "+1.23", "-0.45", "0.00". */
export function fmtDelta(v: number | null | undefined, fractionDigits = 2): string {
  if (isNotFinite(v)) return "-";
  const n = v as number;
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(fractionDigits)}`;
}

/** Signed currency: "+$1.23", "-$0.45". */
export function fmtSignedCurrency(v: number | null | undefined, fractionDigits = 2): string {
  if (isNotFinite(v)) return "-";
  const n = v as number;
  const sign = n >= 0 ? "+" : "-";
  return `${sign}${fmtCurrency(Math.abs(n), fractionDigits)}`;
}

/** Signed percent: "+2.30%", "-1.20%". */
export function fmtSignedPercent(v: number | null | undefined, fractionDigits = 2): string {
  if (isNotFinite(v)) return "-";
  const n = v as number;
  const sign = n >= 0 ? "+" : "-";
  return `${sign}${(Math.abs(n) * 100).toFixed(fractionDigits)}%`;
}

/** Plain number with locale separators. */
export function fmtNumber(v: number | null | undefined, fractionDigits = 0): string {
  if (isNotFinite(v)) return "-";
  return (v as number).toLocaleString("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}
