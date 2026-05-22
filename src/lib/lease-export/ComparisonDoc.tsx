// ───────────────────────────────────────────────────────────────────
// Lifted from Lease-Calculator/components/pdf/ComparisonDoc.tsx on
// 2026-05-21. This copy is canonical for Leasing-Tracker.
//
// react-pdf Document for the A vs B comparison. Header + headline
// metrics table + side-by-side assumptions + two stacked waterfalls.
// Helvetica only; uses ASCII hyphens (not em dash) and inline SVG
// delta triangles since the bundled font is Latin-1 only.
// ───────────────────────────────────────────────────────────────────

import {
  Document,
  Page,
  Path,
  StyleSheet,
  Svg,
  Rect,
  Text,
  View,
} from "@react-pdf/renderer";
import type { Globals, ScenarioInputs, ScenarioResults, WaterfallComponents } from "../lease-math/types";
import {
  fmtCurrency,
  fmtNumber,
  fmtPercent,
  fmtPSF,
  fmtSignedCurrency,
  fmtSignedPercent,
} from "../lease-math/format";

// ---------------------------------------------------------------------------
// Styles (react-pdf uses a flexbox-ish subset; values are points)
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 36,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#0f172a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#0f172a",
    paddingBottom: 8,
    marginBottom: 14,
  },
  headerLeft: { flexDirection: "column" },
  headerRight: { flexDirection: "column", alignItems: "flex-end" },
  title: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  subtitle: { fontSize: 9, color: "#475569" },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    color: "#475569",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 12,
  },
  table: { borderTopWidth: 0.5, borderColor: "#cbd5e1" },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderColor: "#e2e8f0",
    paddingVertical: 4,
  },
  rowHeader: {
    flexDirection: "row",
    paddingVertical: 4,
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderColor: "#cbd5e1",
  },
  rowSubheader: {
    flexDirection: "row",
    paddingVertical: 3,
    paddingTop: 6,
    borderBottomWidth: 0.5,
    borderColor: "#e2e8f0",
  },
  sectionLabel: {
    fontSize: 8,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  cellLabel: { flex: 1.6, paddingHorizontal: 4 },
  cellNum: { flex: 1, paddingHorizontal: 4, textAlign: "right" },
  // cellNum's textAlign:right doesn't help a Views-with-children cell; use a
  // flex row anchored to the right so the inline SVG triangle + label sit
  // together where the column's numbers do.
  deltaHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  cellMuted: { color: "#475569" },
  bold: { fontFamily: "Helvetica-Bold" },
  positive: { color: "#047857" },
  negative: { color: "#b91c1c" },

  twoCol: { flexDirection: "row", gap: 12 },
  card: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    padding: 8,
  },
  cardTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    color: "#0f172a",
  },
  small: { fontSize: 7, color: "#64748b" },
});

// ---------------------------------------------------------------------------
// Hand-drawn waterfall (SVG <Rect>s — react-pdf has no charting library)
// ---------------------------------------------------------------------------

interface WaterfallProps {
  title: string;
  waterfall: WaterfallComponents;
}

// Hex equivalents of the on-screen oklch theme tokens (light mode):
//   --color-primary  oklch(0.42 0.10 245) → #0b517f
//   --color-cost     oklch(0.55 0.15 35)  → #b8492e
//   --color-success  oklch(0.50 0.12 155) → #0b7643
// Hard-coded because react-pdf can't read CSS custom properties.
const PDF_PRIMARY = "#0b517f";
const PDF_COST = "#b8492e";
const PDF_SUCCESS = "#0b7643";

// Helvetica (the only font @react-pdf bundles by default) is Latin-1 only,
// so a literal Δ (U+0394) renders as a tofu glyph. Draw the triangle as a
// tiny inline SVG instead — visually a delta, font-independent.
function DeltaTri({ color = "#0f172a" }: { color?: string }) {
  return (
    <Svg width={6} height={7} style={{ marginRight: 2 }}>
      <Path d="M3 0.5 L5.5 6.2 L0.5 6.2 Z" fill={color} />
    </Svg>
  );
}

function PdfWaterfall({ title, waterfall }: WaterfallProps) {
  const items = [
    { name: "Base", base: 0, value: waterfall.baseRent, color: PDF_PRIMARY },
    {
      name: "Free",
      base: waterfall.baseRent + waterfall.freeRent,
      value: -waterfall.freeRent,
      color: PDF_COST,
    },
    {
      name: "TI",
      base: waterfall.baseRent + waterfall.freeRent + waterfall.ti,
      value: -waterfall.ti,
      color: PDF_COST,
    },
    {
      name: "LC",
      base: waterfall.baseRent + waterfall.freeRent + waterfall.ti + waterfall.lc,
      value: -waterfall.lc,
      color: PDF_COST,
    },
    { name: "Net CF", base: 0, value: waterfall.netCashFlow, color: PDF_SUCCESS },
  ];

  // Chart fills the inner card width. LETTER 612pt − page padding 72 − twoCol
  // gap 12 → 264pt per column, minus the card's border + padding (1 + 16) ≈
  // 247pt of inner space. W must equal the labels container width below so
  // that each bar's slot lines up with the label centered beneath it.
  const W = 244;
  const H = 150;
  const padY = 10;
  const innerH = H - padY * 2;
  const slot = W / items.length;
  const barInset = 4;
  const barW = slot - barInset * 2;
  const max = Math.max(...items.map((it) => it.base + it.value), 1);
  const yFor = (v: number) => padY + innerH - (v / max) * innerH;

  return (
    <View style={styles.card}>
      <View style={{ marginBottom: 6 }}>
        <Text style={[styles.cardTitle, { marginBottom: 0 }]}>{title}</Text>
        <Text style={styles.small}>$/SF over lease term</Text>
      </View>
      <Svg width={W} height={H}>
        {/* baseline */}
        <Rect x={0} y={padY + innerH} width={W} height={0.5} fill="#94a3b8" />
        {items.map((it, i) => {
          const x = i * slot + barInset;
          const top = yFor(it.base + it.value);
          const bottom = yFor(it.base);
          return (
            <Rect
              key={it.name}
              x={x}
              y={top}
              width={barW}
              height={Math.max(1, bottom - top)}
              fill={it.color}
            />
          );
        })}
      </Svg>
      <View style={{ flexDirection: "row", width: W, paddingTop: 4 }}>
        {items.map((it) => (
          <View key={it.name} style={{ width: slot, alignItems: "center" }}>
            <Text style={styles.small}>{it.name}</Text>
            <Text style={[styles.small, { color: "#0f172a" }]}>
              {fmtCurrency(it.value, 1)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

interface DocProps {
  propertyName: string;
  aName: string;
  aInputs: ScenarioInputs;
  aResults: ScenarioResults;
  bName: string;
  bInputs: ScenarioInputs;
  bResults: ScenarioResults;
  globals: Globals;
}

/**
 * Render `(b - a) / a` as a signed percent string, e.g. "+12.34%" or
 * "-4.10%". Returns "--" when A is zero (denominator) or either value
 * isn't finite.
 *
 * IMPORTANT: Uses ASCII hyphen (U+002D) and a double-hyphen no-data
 * marker because @react-pdf/renderer's bundled Helvetica only carries
 * Latin-1 glyphs. Anything outside that block (true minus U+2212,
 * em dash U+2014, Greek delta U+0394) falls back to a tofu glyph.
 */
const fmtPctChange = (a: number, b: number): string => {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === 0) return "--";
  const pct = ((b - a) / Math.abs(a)) * 100;
  const sign = pct > 0 ? "+" : pct < 0 ? "-" : "";
  return `${sign}${Math.abs(pct).toFixed(2)}%`;
};

const fmtDate = (iso: string | undefined): string => {
  if (!iso) return "--";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  // "MMM-YY" — e.g., "May-26". toLocaleDateString gives "May 26"; swap the
  // space for a hyphen.
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }).replace(" ", "-");
};

export function ComparisonDoc({
  propertyName,
  aName,
  aInputs,
  aResults,
  bName,
  bInputs,
  bResults,
  globals,
}: DocProps) {
  // fmtDelta formats the nominal change (b - a) in the row's natural unit:
  // PSF rows → "+$0.35", percent rows → "+0.19%" (percentage points).
  const headlineRows = [
    {
      label: "Undiscounted NER",
      a: aResults.undiscountedNER,
      b: bResults.undiscountedNER,
      fmt: (v: number) => fmtPSF(v, 2),
      fmtDelta: (v: number) => fmtSignedCurrency(v, 2),
    },
    {
      label: "Discounted NER",
      a: aResults.discountedNER,
      b: bResults.discountedNER,
      fmt: (v: number) => fmtPSF(v, 2),
      fmtDelta: (v: number) => fmtSignedCurrency(v, 2),
    },
    {
      label: "Yield on Cost (Yr 1)",
      a: aResults.yocYr1,
      b: bResults.yocYr1,
      fmt: (v: number) => fmtPercent(v, 2),
      fmtDelta: (v: number) => fmtSignedPercent(v, 2),
    },
    {
      label: "Yield on Cost (Term)",
      a: aResults.yocTerm,
      b: bResults.yocTerm,
      fmt: (v: number) => fmtPercent(v, 2),
      fmtDelta: (v: number) => fmtSignedPercent(v, 2),
    },
    {
      label: "Total Basis ($/SF)",
      a: aResults.totalBasisPSF,
      b: bResults.totalBasisPSF,
      fmt: (v: number) => fmtPSF(v, 2),
      fmtDelta: (v: number) => fmtSignedCurrency(v, 2),
    },
  ];

  // Per-deal assumptions for the side-by-side table. Mix of input and
  // global fields, with formatters chosen to match the on-screen inputs
  // panel (currency for $, percent for %, etc.).
  const assumptionRows: Array<{
    label: string;
    a: string;
    b: string;
    section?: string;
  }> = [
    { section: "Square Footage", label: "Project SF", a: fmtNumber(aInputs.projectSF, 0), b: fmtNumber(bInputs.projectSF, 0) },
    { label: "Building SF", a: fmtNumber(aInputs.buildingSF, 0), b: fmtNumber(bInputs.buildingSF, 0) },
    { label: "Lease SF", a: fmtNumber(aInputs.proposedLeaseSF, 0), b: fmtNumber(bInputs.proposedLeaseSF, 0) },

    { section: "Rent", label: "Base Rate ($/SF)", a: fmtCurrency(aInputs.baseRatePSF, 2), b: fmtCurrency(bInputs.baseRatePSF, 2) },
    { label: "Escalation (annual)", a: fmtPercent(aInputs.escalation, 2), b: fmtPercent(bInputs.escalation, 2) },

    { section: "Concessions", label: "TI Allowance ($/SF)", a: fmtCurrency(aInputs.tiAllowancePSF, 2), b: fmtCurrency(bInputs.tiAllowancePSF, 2) },
    { label: "TI Duration (mo)", a: fmtNumber(aInputs.tiDurationMonths, 0), b: fmtNumber(bInputs.tiDurationMonths, 0) },
    { label: "Free Rent (mo)", a: fmtNumber(aInputs.freeRentMonths, 0), b: fmtNumber(bInputs.freeRentMonths, 0) },

    { section: "Leasing Commissions", label: "Landlord Rep (%)", a: fmtPercent(aInputs.lcLLRepPercent, 2), b: fmtPercent(bInputs.lcLLRepPercent, 2) },
    { label: "Tenant Rep (%)", a: fmtPercent(aInputs.lcTenantRepPercent, 2), b: fmtPercent(bInputs.lcTenantRepPercent, 2) },
    { label: "Combined LC (%)", a: fmtPercent(aInputs.lcLLRepPercent + aInputs.lcTenantRepPercent, 2), b: fmtPercent(bInputs.lcLLRepPercent + bInputs.lcTenantRepPercent, 2) },
    { label: "LC Calc", a: aInputs.lcCalculation === "tiered" ? "Tiered" : "Flat", b: bInputs.lcCalculation === "tiered" ? "Tiered" : "Flat" },
    { label: "LC Payment", a: aInputs.lcStructure === "split50" ? "50/50" : "Upfront", b: bInputs.lcStructure === "split50" ? "50/50" : "Upfront" },

    { section: "Term", label: "Term (mo)", a: fmtNumber(aInputs.leaseTermMonths, 0), b: fmtNumber(bInputs.leaseTermMonths, 0) },
    { label: "Execution date", a: fmtDate(aInputs.leaseExecutionDate), b: fmtDate(bInputs.leaseExecutionDate) },
    { label: "Commencement date", a: fmtDate(aInputs.leaseCommencement), b: fmtDate(bInputs.leaseCommencement) },

    { section: "Shared assumptions", label: "Current Basis ($/SF)", a: fmtCurrency(globals.projectBasisPSF, 2), b: fmtCurrency(globals.projectBasisPSF, 2) },
    { label: "Discount rate", a: fmtPercent(globals.discountRate, 2), b: fmtPercent(globals.discountRate, 2) },
    { label: "Total Basis ($/SF)", a: fmtCurrency(aResults.totalBasisPSF, 2), b: fmtCurrency(bResults.totalBasisPSF, 2) },
  ];

  const today = new Date()
    .toLocaleDateString("en-US", { month: "short", year: "2-digit" })
    .replace(" ", "-");

  return (
    <Document title={`${propertyName || "RFP"} Comparison`} author="RFP Analyzer">
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>{propertyName || "RFP Comparison"}</Text>
            <Text style={styles.subtitle}>NER comparison · industrial lease analysis</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.subtitle}>{today}</Text>
            <Text style={styles.subtitle}>
              {aName}  vs  {bName}
            </Text>
          </View>
        </View>

        {/* Headline metrics — full-width table (title kept verbatim per request) */}
        <Text style={styles.sectionTitle}>Headline metrics & NER waterfall (PSF over term)</Text>
        <View style={styles.table}>
          <View style={styles.rowHeader}>
            <Text style={[styles.cellLabel, styles.bold]}>Metric</Text>
            <Text style={[styles.cellNum, styles.bold]}>{aName}</Text>
            <Text style={[styles.cellNum, styles.bold]}>{bName}</Text>
            <View style={[styles.cellNum, styles.deltaHeader]}>
              <DeltaTri />
              <Text style={styles.bold}>%</Text>
            </View>
            <View style={[styles.cellNum, styles.deltaHeader]}>
              <DeltaTri />
              <Text style={styles.bold}>$</Text>
            </View>
          </View>
          {headlineRows.map((r) => {
            const delta = r.b - r.a;
            const deltaStyle =
              delta > 0 ? styles.positive : delta < 0 ? styles.negative : {};
            return (
              <View key={r.label} style={styles.row}>
                <Text style={styles.cellLabel}>{r.label}</Text>
                <Text style={styles.cellNum}>{r.fmt(r.a)}</Text>
                <Text style={[styles.cellNum, styles.bold]}>{r.fmt(r.b)}</Text>
                <Text style={[styles.cellNum, deltaStyle]}>
                  {fmtPctChange(r.a, r.b)}
                </Text>
                <Text style={[styles.cellNum, deltaStyle]}>
                  {r.fmtDelta(delta)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Deal assumptions on the left, NER waterfalls stacked on the right */}
        <Text style={styles.sectionTitle}>Deal assumptions</Text>
        <View style={styles.twoCol}>
          {/* LEFT — assumptions table */}
          <View style={{ flex: 1 }}>
            <View style={styles.table}>
              <View style={styles.rowHeader}>
                <Text style={[styles.cellLabel, styles.bold]}>Assumption</Text>
                <Text style={[styles.cellNum, styles.bold]}>{aName}</Text>
                <Text style={[styles.cellNum, styles.bold]}>{bName}</Text>
              </View>
              {assumptionRows.map((r, i) => {
                const differs = r.a !== r.b;
                return (
                  <View key={`${i}-${r.label}`}>
                    {r.section && (
                      <View style={styles.rowSubheader}>
                        <Text style={[styles.cellLabel, styles.bold, styles.sectionLabel]}>
                          {r.section}
                        </Text>
                      </View>
                    )}
                    <View style={styles.row} wrap={false}>
                      <Text style={styles.cellLabel}>{r.label}</Text>
                      <Text style={[styles.cellNum, differs ? styles.bold : styles.cellMuted]}>{r.a}</Text>
                      <Text style={[styles.cellNum, differs ? styles.bold : styles.cellMuted]}>{r.b}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* RIGHT — two waterfalls stacked vertically */}
          <View style={{ flex: 1, flexDirection: "column", gap: 8 }}>
            <PdfWaterfall title={aName} waterfall={aResults.waterfall} />
            <PdfWaterfall title={bName} waterfall={bResults.waterfall} />
          </View>
        </View>

        {/* Footer */}
        <View
          style={{
            position: "absolute",
            bottom: 16,
            left: 36,
            right: 36,
            flexDirection: "row",
            justifyContent: "space-between",
          }}
          fixed
        >
          <Text style={styles.small}>{propertyName || "RFP Analysis"}</Text>
          <Text
            style={styles.small}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
