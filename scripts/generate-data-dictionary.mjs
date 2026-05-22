// Generates parce-data-dictionary.xlsx — a master reference workbook
// covering every Postgres table, every column, every cross-table
// relationship, and the proposed integrity rules. Used as the planning
// document for the data-integrity master plan.
//
// Run: node scripts/generate-data-dictionary.mjs
// Output: parce-data-dictionary.xlsx in the working dir.

import ExcelJS from "exceljs";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parce palette (matches buildWorkbook.ts).
const COPPER = "FFD4895A";
const COPPER_DEEP = "FFB87040";
const CREAM = "FFFAF5F0";
const COPPER_TINT = "FFFBE7D8";
const STONE = "FF78716C";
const NEAR_BLACK = "FF18181B";
const GREEN_OK = "FF4D8C5C";
const AMBER_WARN = "FFC58F2D";
const RED_GAP = "FFB54A2C";

const wb = new ExcelJS.Workbook();
wb.creator = "parce";
wb.company = "parce";
wb.created = new Date();

// ── Overview ───────────────────────────────────────────────────────
{
  const ws = wb.addWorksheet("Overview", { properties: { tabColor: { argb: COPPER } } });
  ws.columns = [{ width: 28 }, { width: 100 }];

  ws.mergeCells("A1:B1");
  ws.getCell("A1").value = "parce — data dictionary";
  ws.getCell("A1").font = { name: "Calibri", size: 18, bold: true, color: { argb: NEAR_BLACK } };
  ws.getRow(1).height = 26;

  ws.mergeCells("A2:B2");
  ws.getCell("A2").value =
    "Source-of-truth contract for every piece of data in the parce app. Mark this up, hand back, we wire the rules.";
  ws.getCell("A2").font = { name: "Calibri", size: 11, color: { argb: STONE }, italic: true };

  const sheets = [
    ["Tables", "Every Postgres table — what it is, who writes to it, realtime status."],
    ["Columns", "Every column — type, nullability, where the value originates."],
    ["Column Constraints", "Per-column flagged constraints — needed format, dropdown candidates, split fields."],
    ["Relationships", "Cross-table links — FKs, soft references, expected joins."],
    ["Identifiers", "ID conventions (projectId, buildingId, spaceId, dealId) — format + enforcement."],
    ["Computed Fields", "Derived values — what depends on what, where the math lives."],
    ["Integrity Rules", "Proposed checks — building SF vs rent roll, vacant-space drift, misclassified leases, etc."],
    ["Open Risks", "Known places where data can drift today, ranked by how often it bites you."],
    ["Workflow Triggers", "Events (status change, building edit, lease execution) and what should happen automatically."],
    ["Dropdowns to Build", "Master list of suggested enums / pick-lists, with starter values."],
  ];

  ws.getCell("A4").value = "Tab";
  ws.getCell("B4").value = "What it covers";
  for (const c of ["A4", "B4"]) {
    ws.getCell(c).font = { bold: true, color: { argb: COPPER_DEEP } };
    ws.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: CREAM } };
  }

  sheets.forEach(([name, desc], idx) => {
    const r = 5 + idx;
    ws.getCell(`A${r}`).value = name;
    ws.getCell(`A${r}`).font = { bold: true };
    ws.getCell(`B${r}`).value = desc;
    ws.getCell(`B${r}`).alignment = { wrapText: true, vertical: "top" };
  });
}

// ── Tables ─────────────────────────────────────────────────────────
{
  const ws = wb.addWorksheet("Tables", { properties: { tabColor: { argb: COPPER_DEEP } } });
  ws.columns = [
    { header: "Table", key: "name", width: 22 },
    { header: "Purpose", key: "purpose", width: 50 },
    { header: "Realtime", key: "realtime", width: 12 },
    { header: "RLS", key: "rls", width: 16 },
    { header: "Source of truth", key: "sot", width: 32 },
    { header: "Notes", key: "notes", width: 50 },
  ];

  const rows = [
    {
      name: "deals",
      purpose: "Leasing Activity — prospects, LOIs, executed deals.",
      realtime: "Yes",
      rls: "anon full access",
      sot: "Manual entry + drawer edits",
      notes: "id = uuid. `dealId` is the user-facing project code (e.g. 5001). One deal = one prospective lease.",
    },
    {
      name: "rent_roll",
      purpose: "Portfolio — every space (occupied or vacant) the team manages.",
      realtime: "Yes",
      rls: "anon full access",
      sot: "Manual entry; promoted from deals when status = Executed",
      notes: "id = uuid. `dealId` soft-links to deals.id. `buildingId` soft-links to buildings.id. `spaceId` is the unit label.",
    },
    {
      name: "buildings",
      purpose: "Map — parametric building geometry per project.",
      realtime: "Yes",
      rls: "anon full access",
      sot: "Map editor (parametric rect + bumpouts + bay slicing)",
      notes: "id = uuid. `projectId` soft-links to a deal's `dealId` (NOT deals.id). One project can have N buildings.",
    },
    {
      name: "activities",
      purpose: "Activity feed — call logs, status changes, manual notes.",
      realtime: "Yes",
      rls: "anon full access",
      sot: "Append-only from drawers; status-change auto-entries",
      notes: "Polymorphic: parent_type ∈ {'deal','rent_roll'}, parent_id soft-links to the parent table's id.",
    },
    {
      name: "onboarding_checklists",
      purpose: "Onboarding tab — per-tenant lease-execution checklist.",
      realtime: "Yes",
      rls: "anon full access",
      sot: "Created when a deal is promoted; items edited in Onboarding tab",
      notes: "1-to-1 with rent_roll row (FK rent_roll_id). items is jsonb.",
    },
    {
      name: "scenarios",
      purpose: "Lease Calculator — saved UW scenarios per deal.",
      realtime: "Yes",
      rls: "anon full access",
      sot: "InputsPanel cells + Sensitivity panel sliders",
      notes: "Many-to-one with deals (deal_id). inputs/globals/results all jsonb. Results are a CACHE of running runScenario(inputs, globals).",
    },
  ];

  rows.forEach((r) => ws.addRow(r));
  styleHeader(ws);
  ws.eachRow((row, n) => {
    if (n === 1) return;
    row.alignment = { wrapText: true, vertical: "top" };
    row.height = 40;
  });
}

// ── Columns ────────────────────────────────────────────────────────
{
  const ws = wb.addWorksheet("Columns", { properties: { tabColor: { argb: COPPER } } });
  ws.columns = [
    { header: "Table", key: "table", width: 16 },
    { header: "Column", key: "col", width: 28 },
    { header: "Type", key: "type", width: 16 },
    { header: "Null?", key: "nullable", width: 8 },
    { header: "Originates from", key: "origin", width: 36 },
    { header: "Notes / source-of-truth issue", key: "notes", width: 60 },
  ];

  const cols = [
    // deals
    ["deals", "id", "uuid", "No", "Generated client-side", "Stable PK; never edited."],
    ["deals", "dealId", "text", "Yes", "User-entered project code", "e.g. '5001'. Joins to buildings.projectId and rent_roll.dealId. ⚠ Free text today — Phase next: enforce format."],
    ["deals", "dealName", "text", "No", "User-entered", "Project / property name."],
    ["deals", "spaceId", "text", "Yes", "User-entered (or from building bay)", "e.g. '5001-B01-S03'. Should match a bay slot in buildings."],
    ["deals", "building", "text", "Yes", "User-entered", "Free text — should be replaced with buildingId reference."],
    ["deals", "minSF / maxSF", "int", "Yes", "User-entered", "Tenant requirement range. NOT the space's leasable SF."],
    ["deals", "status", "enum", "No", "Workflow selector", "Drives promotion to rent_roll on 'Executed'."],
    ["deals", "targetRent", "numeric", "Yes", "Manual or auto-fill from market", "Used as default baseRatePSF in scenarios."],
    ["deals", "tiPerSF / freeRentMonths / proposedTermMonths", "numeric/int", "Yes", "Manual", "Pre-fills scenarios; should be re-validated on each scenario."],
    ["deals", "lat / lng", "numeric", "Yes", "Map click or drawer edit", "Project-level pin (NOT building-level)."],

    // rent_roll
    ["rent_roll", "id", "uuid", "No", "Generated", "Stable PK."],
    ["rent_roll", "dealId", "uuid", "Yes", "Promotion from deals.id", "⚠ Naming collision: this is deals.id, NOT deals.dealId. Confusing. Worth renaming."],
    ["rent_roll", "buildingId", "uuid", "Yes", "Manual link", "⚠ Often null today. Should be required for occupied rows."],
    ["rent_roll", "spaceId", "text", "Yes", "Manual or from building", "Should match buildings.baySpaceIds[i]."],
    ["rent_roll", "leasableSF", "int", "Yes", "Manual", "⚠ INTEGRITY RISK: sum across building's spaces should equal building's total SF."],
    ["rent_roll", "occupied", "bool", "No", "Manual", "False = vacant space. Vacant spaces still need a row."],
    ["rent_roll", "leaseStart / leaseTermMonths", "date/int", "Yes", "Lease abstract", "leaseEnd is derived; should be a generated column."],
    ["rent_roll", "leaseEnd", "date", "Yes", "Lease abstract or computed", "⚠ Currently stored — could drift from start+term."],
    ["rent_roll", "startingAnnualRentPSF / inPlaceRent", "numeric", "Yes", "Lease abstract", "PSF vs $/yr; both stored, easy to mis-enter one."],
    ["rent_roll", "annualRentBumpsPct", "numeric", "Yes", "Lease abstract", "Used by reval to project rent at exit."],

    // buildings
    ["buildings", "id", "uuid", "No", "Generated", "Stable PK."],
    ["buildings", "projectId", "text", "No", "Set on create", "Should equal a deals.dealId. ⚠ Free text — should be FK-enforced."],
    ["buildings", "name", "text", "No", "User or auto ('Building 1')", "Display name."],
    ["buildings", "buildingOrdinal", "int", "Yes", "Auto on create", "'B01', 'B02' — used as part of spaceId convention."],
    ["buildings", "footprint", "jsonb (GeoJSON Polygon)", "No", "Parametric rect + bumpouts", "Source of truth for visual size."],
    ["buildings", "widthFt / depthFt", "numeric", "Yes", "Drawer slider", "Parametric inputs that REGENERATE footprint."],
    ["buildings", "heightFt", "numeric", "No", "Drawer slider", "3D extrusion height."],
    ["buildings", "bayCount", "int", "No", "Drawer slider", "Number of demising bays — determines space slots."],
    ["buildings", "baySpaceIds", "text[]", "No", "Auto-generated + editable", "['5001-B01-S01', ...]. ⚠ Length should equal bayCount."],
    ["buildings", "bumpOuts", "jsonb", "No", "Drawer editor", "Per-side extensions. Affect total SF."],
    ["buildings", "rotationDeg / centerLat / centerLng", "numeric", "Yes", "Drawer", "Anchors the parametric rect on the map."],

    // activities
    ["activities", "id / parent_id / parent_type / type / summary", "various", "No", "Append-only from UI", "Audit trail. Never edited after insert."],

    // onboarding_checklists
    ["onboarding_checklists", "rent_roll_id", "uuid", "No", "FK on create", "1:1 with rent_roll row."],
    ["onboarding_checklists", "items", "jsonb", "No", "Template + manual edits", "Each item has checked + fileUrl + note."],

    // scenarios
    ["scenarios", "deal_id", "text", "No", "Set on create from selected deal", "Soft link to deals.id (text not uuid → migration legacy)."],
    ["scenarios", "name", "text", "No", "User", "'UW', 'Counter v1', etc. Free text."],
    ["scenarios", "inputs / globals", "jsonb", "No", "Auto-fill from deal + manual", "Schema validated client-side via lease-math types."],
    ["scenarios", "results", "jsonb", "Yes", "Cache of runScenario(inputs, globals)", "Refreshed on every save. May lag if math changes."],
  ];

  cols.forEach((row) => ws.addRow(row));
  styleHeader(ws);
  ws.eachRow((row, n) => {
    if (n === 1) return;
    row.alignment = { wrapText: true, vertical: "top" };
    row.height = 32;
    // Flag rows with ⚠ in red.
    const notes = String(row.getCell(6).value ?? "");
    if (notes.includes("⚠")) {
      row.getCell(6).font = { color: { argb: RED_GAP }, italic: true };
    }
  });
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

// ── Relationships ─────────────────────────────────────────────────
{
  const ws = wb.addWorksheet("Relationships", { properties: { tabColor: { argb: COPPER_DEEP } } });
  ws.columns = [
    { header: "From", key: "from", width: 28 },
    { header: "→", key: "arrow", width: 4 },
    { header: "To", key: "to", width: 28 },
    { header: "Join key", key: "join", width: 36 },
    { header: "Enforced?", key: "enforced", width: 14 },
    { header: "What breaks if mismatched", key: "breaks", width: 60 },
  ];

  const rels = [
    ["deals.dealId", "→", "buildings.projectId", "deals.dealId = buildings.projectId", "❌ No (soft, text)", "Map shows a building under a project that no longer exists; orphaned buildings."],
    ["deals (via deals.id)", "→", "rent_roll.dealId", "deals.id = rent_roll.dealId", "❌ No (soft, uuid)", "Promoted lease can't trace back to its source deal; activity history splits."],
    ["buildings.id", "→", "rent_roll.buildingId", "buildings.id = rent_roll.buildingId", "❌ No (soft, often null)", "Space appears in rent roll with no building → can't roll up SF."],
    ["buildings.baySpaceIds[i]", "→", "rent_roll.spaceId", "spaceId string match", "❌ No (free text)", "Renaming a bay leaves orphaned spaces; rent roll shows space IDs not present in the map."],
    ["rent_roll.id", "→", "onboarding_checklists.rentRollId", "FK", "✅ Yes (FK)", "Deletion cascades."],
    ["deals.id", "→", "scenarios.dealId", "scenarios.dealId text matches deals.id::text", "❌ No (soft)", "Scenarios orphan when deal is deleted."],
    ["activities.parentId", "→", "deals.id OR rent_roll.id", "Polymorphic (parentType + parentId)", "❌ No", "Activity points to a row that no longer exists; UI shows blank parent."],
  ];

  rels.forEach((r) => ws.addRow(r));
  styleHeader(ws);
  ws.eachRow((row, n) => {
    if (n === 1) return;
    row.alignment = { wrapText: true, vertical: "top" };
    row.height = 36;
    const enforced = String(row.getCell(5).value ?? "");
    if (enforced.includes("❌")) row.getCell(5).font = { color: { argb: RED_GAP }, bold: true };
    if (enforced.includes("✅")) row.getCell(5).font = { color: { argb: GREEN_OK }, bold: true };
  });
}

// ── Identifiers ────────────────────────────────────────────────────
{
  const ws = wb.addWorksheet("Identifiers", { properties: { tabColor: { argb: COPPER } } });
  ws.columns = [
    { header: "ID", key: "id", width: 18 },
    { header: "Lives on", key: "lives", width: 28 },
    { header: "Format", key: "format", width: 24 },
    { header: "Example", key: "example", width: 18 },
    { header: "Generated by", key: "gen", width: 22 },
    { header: "Should be enforced?", key: "enforce", width: 50 },
  ];

  const ids = [
    ["projectId", "deals.dealId, buildings.projectId, derived for scenarios", "4-digit numeric (today)", "5001", "User entry", "✅ Should constrain to ^\\d{4}$ and require uniqueness across deals."],
    ["buildingId", "buildings.id, rent_roll.buildingId", "uuid", "(uuid)", "Postgres uuid_generate_v4", "Already PK. ✅ Should be required (not null) on rent_roll for occupied rows."],
    ["buildingOrdinal", "buildings.buildingOrdinal", "B + 2-digit zero-padded", "B01", "Auto on create", "✅ Should be unique within projectId."],
    ["spaceId", "deals.spaceId, rent_roll.spaceId, buildings.baySpaceIds[i]", "{projectId}-B{nn}-S{nn}", "5001-B01-S03", "Auto on bay create; user-editable", "✅ Should be validated against regex; uniqueness within building."],
    ["dealId (uuid)", "deals.id", "uuid", "(uuid)", "Client gen", "PK. Never edit."],
    ["dealCode (aka 'deal_id')", "deals.dealId", "Same as projectId today", "5001", "User entry", "⚠ Naming collision in code with deals.id. Rename to `projectCode` in DB and app."],
    ["scenarioId", "scenarios.id", "uuid", "(uuid)", "Client gen", "PK. Never edit."],
  ];

  ids.forEach((r) => ws.addRow(r));
  styleHeader(ws);
  ws.eachRow((row, n) => {
    if (n === 1) return;
    row.alignment = { wrapText: true, vertical: "top" };
    row.height = 36;
    const enforce = String(row.getCell(6).value ?? "");
    if (enforce.includes("⚠")) row.getCell(6).font = { color: { argb: AMBER_WARN }, italic: true };
  });
}

// ── Computed Fields ───────────────────────────────────────────────
{
  const ws = wb.addWorksheet("Computed Fields", { properties: { tabColor: { argb: COPPER_DEEP } } });
  ws.columns = [
    { header: "Field", key: "field", width: 32 },
    { header: "Lives on / where shown", key: "where", width: 32 },
    { header: "Formula / Source", key: "formula", width: 60 },
    { header: "Where the math lives", key: "loc", width: 30 },
    { header: "Notes", key: "notes", width: 40 },
  ];

  const rows = [
    ["Building total SF", "Map → ProjectDrawer building card", "polygon area of (rect + bumpouts), via Mapbox turf-style equirectangular projection", "src/lib/building-geometry.ts", "✅ Source of truth for the building's leasable area."],
    ["Per-bay width (ft)", "Building editor", "widthFt / bayCount (uniform bays)", "Inline in editor", "Doesn't account for bumpouts shifting bay edges."],
    ["Per-bay SF", "(proposed) Building editor", "(widthFt / bayCount) × depthFt + bumpouts on that side", "(not yet computed)", "Should be the per-space leasable SF reference."],
    ["Undiscounted NER", "HeadlineCard, scenarios.results", "calcUndiscountedNER(inputs)", "src/lib/lease-math/calc.ts", "Cached on save."],
    ["Discounted NER", "HeadlineCard, scenarios.results", "calcDiscountedNER(inputs, discountRate)", "src/lib/lease-math/calc.ts", "Recomputed each render; cached on save."],
    ["YoC Yr1 / YoC term", "HeadlineCard", "annualRent / (projectBasis + ti + lc)", "src/lib/lease-math/calc.ts", ""],
    ["Total basis $/SF", "HeadlineCard", "projectBasisPSF + tiAllowancePSF + lcAmortized + addtlTi", "src/lib/lease-math/calc.ts", ""],
    ["Weighted avg lease rate", "(proposed) Portfolio rollup", "SUMPRODUCT(startingAnnualRentPSF × leasableSF) / SUMPRODUCT(occupied × leasableSF)", "(not yet)", "Will live in a new ReportsView card or master Excel."],
    ["Occupancy %", "(proposed) Portfolio rollup", "SUM(occupied=true leasable_sf) / SUM(building total_sf)", "(not yet)", "Requires building total SF be reliable."],
    ["Lease end date", "rent_roll.leaseEnd", "leaseStart + leaseTermMonths months", "(currently stored, not computed)", "⚠ Should be generated column or removed in favor of computing on read."],
  ];

  rows.forEach((r) => ws.addRow(r));
  styleHeader(ws);
  ws.eachRow((row, n) => {
    if (n === 1) return;
    row.alignment = { wrapText: true, vertical: "top" };
    row.height = 36;
    const notes = String(row.getCell(5).value ?? "");
    if (notes.includes("⚠")) row.getCell(5).font = { color: { argb: AMBER_WARN }, italic: true };
    if (notes.startsWith("✅")) row.getCell(5).font = { color: { argb: GREEN_OK } };
  });
}

// ── Integrity Rules ───────────────────────────────────────────────
{
  const ws = wb.addWorksheet("Integrity Rules", { properties: { tabColor: { argb: COPPER } } });
  ws.columns = [
    { header: "Rule", key: "rule", width: 44 },
    { header: "Why it matters", key: "why", width: 50 },
    { header: "Enforcement", key: "enforce", width: 18 },
    { header: "Friction", key: "friction", width: 12 },
    { header: "Proposed implementation", key: "impl", width: 56 },
  ];

  const rules = [
    ["Sum of leasable_sf across building's spaces = building total SF (±1% tolerance)", "Prevents miskey: tenant abstract says 50,000 SF in a 48,000 SF bay.", "Soft warning + audit view", "Low", "Reports tab: 'Buildings out of balance' card. Per-building drift = sum(rent_roll.leasableSF where buildingId=X) - buildingTotalSF."],
    ["Every bay in buildings.baySpaceIds[] has exactly ONE rent_roll row (occupied OR vacant)", "Catches: tenant added but vacant row not removed → double-counted; bay added but space row never created.", "Soft warning + audit view", "Medium", "Reports: 'Orphaned bays' (in map, missing from rent_roll) and 'Orphaned spaces' (in rent_roll, missing from any building's baySpaceIds)."],
    ["When a deal flips to Executed, a rent_roll row must be created or updated", "Right now nothing forces this. Excel-era pattern was a manual copy/paste.", "Modal prompt", "Low", "Add a 'Promote to Portfolio' action on the deal drawer when status = Executed."],
    ["projectId on a building must match an existing deal.dealId", "Stops orphaned buildings (created for a project that no longer exists or was renamed).", "DB CHECK + UI dropdown", "Low (dropdown anyway)", "Migration: drop free-text projectId input on building create, replace with deal picker."],
    ["spaceId in rent_roll must appear in some buildings.baySpaceIds[] for the same project", "Otherwise the rent roll shows units that don't exist on the map.", "Soft warning", "Low", "Reports: 'Phantom spaces'."],
    ["leasableSF on rent_roll must be > 0 (occupied or vacant)", "Catches blank rows that count as 0 SF.", "DB CHECK constraint", "Low", "Migration: ALTER TABLE rent_roll ADD CONSTRAINT chk_leasable_sf CHECK (leasable_sf > 0)."],
    ["Sum of occupied + vacant rent_roll rows per building can never exceed building total SF (+1% tolerance)", "Prevents adding a new tenant in a fully-leased building.", "Save-time block", "High (blocks save)", "Pre-save validation in RentRollDrawer: load building total + existing spaces, compare."],
    ["leaseEnd = leaseStart + leaseTermMonths (computed, not stored)", "Removes the chance of the stored value drifting from start/term.", "Generated column", "None", "Migration: ALTER TABLE rent_roll DROP COLUMN lease_end; ADD COLUMN lease_end DATE GENERATED ALWAYS AS (lease_start + lease_term_months * interval '1 month')."],
    ["No two deals in same projectId can have the same spaceId with status != Lost", "Two active deals on the same bay = pipeline confusion.", "Soft warning on deal save", "Low", "DealDrawer: check existing deals on save."],
    ["Building can't be deleted if any rent_roll row references it", "Prevents accidental orphaning.", "DB FK with ON DELETE RESTRICT", "Medium", "Once buildingId is a real FK."],
    ["Free rent + term + commencement on a scenario must match the parent deal — OR — the scenario must be flagged 'diverged'", "When the deal terms update, the scenario looks stale.", "Drift indicator", "Low", "ScenarioBar: small badge when scenario.inputs differs from deal fields."],
  ];

  rules.forEach((r) => ws.addRow(r));
  styleHeader(ws);
  ws.eachRow((row, n) => {
    if (n === 1) return;
    row.alignment = { wrapText: true, vertical: "top" };
    row.height = 50;
    const friction = String(row.getCell(4).value ?? "").toLowerCase();
    if (friction === "high") row.getCell(4).font = { color: { argb: RED_GAP }, bold: true };
    if (friction === "medium") row.getCell(4).font = { color: { argb: AMBER_WARN }, bold: true };
    if (friction === "low" || friction === "none") row.getCell(4).font = { color: { argb: GREEN_OK }, bold: true };
  });
}

// ── Open Risks ────────────────────────────────────────────────────
{
  const ws = wb.addWorksheet("Open Risks", { properties: { tabColor: { argb: COPPER_DEEP } } });
  ws.columns = [
    { header: "Risk", key: "risk", width: 48 },
    { header: "How it happens today", key: "how", width: 56 },
    { header: "Severity", key: "sev", width: 12 },
    { header: "Suggested fix", key: "fix", width: 50 },
  ];

  const risks = [
    ["Building SF and rent roll SF drift", "Map building resized after spaces created. No alarm.", "High", "Audit view + soft warning (Integrity rule #1)."],
    ["Vacant space row left behind after lease execution", "User adds new tenant row but doesn't delete or merge the vacant row. Counts 2x.", "High", "Promote-to-Portfolio flow consumes the vacant row instead of creating new."],
    ["Tenant added that overflows building SF", "Nothing checks total at save.", "High", "Pre-save block (Integrity rule #7)."],
    ["spaceId renamed in map → orphaned rent_roll row", "Building editor renames bay; rent_roll row keeps old string.", "Medium", "Cascade rename + warning."],
    ["projectId typo when creating a building", "Free-text input; building disappears from filter.", "Medium", "Replace with deal-picker dropdown."],
    ["leaseEnd manually set wrong", "Stored separately from start+term.", "Low", "Generated column."],
    ["Deal status flipped to Executed without rent_roll creation", "Stops being tracked in Portfolio.", "Medium", "Modal on status change."],
    ["Scenario stale vs current deal terms", "Deal targetRent updated but scenarios still use old base rate.", "Low", "Drift badge in ScenarioBar."],
    ["Activity points to deleted parent", "Polymorphic FK not enforced.", "Low", "Soft purge cron, or block deletion when activities exist."],
    ["Two deals on same bay both active", "Pipeline shows tenant A and tenant B both pursuing the same space.", "Low", "Soft warning on save."],
  ];

  risks.forEach((r) => ws.addRow(r));
  styleHeader(ws);
  ws.eachRow((row, n) => {
    if (n === 1) return;
    row.alignment = { wrapText: true, vertical: "top" };
    row.height = 38;
    const sev = String(row.getCell(3).value ?? "").toLowerCase();
    if (sev === "high") row.getCell(3).font = { color: { argb: RED_GAP }, bold: true };
    if (sev === "medium") row.getCell(3).font = { color: { argb: AMBER_WARN }, bold: true };
    if (sev === "low") row.getCell(3).font = { color: { argb: GREEN_OK }, bold: true };
  });
}

// ── Workflow Triggers ─────────────────────────────────────────────
{
  const ws = wb.addWorksheet("Workflow Triggers", { properties: { tabColor: { argb: COPPER } } });
  ws.columns = [
    { header: "Event", key: "event", width: 38 },
    { header: "What should auto-happen", key: "auto", width: 56 },
    { header: "Status today", key: "status", width: 18 },
  ];

  const triggers = [
    ["Building created", "Auto-generate baySpaceIds based on projectId + ordinal + bay index. Each bay automatically becomes a vacant rent_roll row.", "Partial — IDs generated, rent_roll rows NOT auto-created."],
    ["Building bayCount changed", "Add or remove vacant rent_roll rows to match. Block if any to-be-removed bay has an occupied lease.", "Not implemented"],
    ["Building dimensions changed", "Recompute per-bay SF on all vacant rent_roll rows for that building. Warn on occupied rows.", "Not implemented"],
    ["Deal status → Executed", "Find the vacant rent_roll row for that spaceId, convert to occupied with deal's tenant + rent terms. Create onboarding checklist.", "Manual — deal flips, user has to add the row themselves."],
    ["Deal deleted", "Block if any scenario, activity, or rent_roll row references it. Offer 'archive' as alternative.", "Not implemented (deletion is destructive)"],
    ["Rent roll row deleted", "Convert back to vacant; remove tenant fields. Don't actually delete unless bay is also being removed.", "Not implemented"],
    ["Lease end date passes", "Flag the row for renewal review; create a future-dated activity.", "Not implemented"],
    ["Scenario saved", "Re-run runScenario, cache results. Already wired.", "✅ Done"],
  ];

  triggers.forEach((r) => ws.addRow(r));
  styleHeader(ws);
  ws.eachRow((row, n) => {
    if (n === 1) return;
    row.alignment = { wrapText: true, vertical: "top" };
    row.height = 44;
    const status = String(row.getCell(3).value ?? "");
    if (status.startsWith("✅")) row.getCell(3).font = { color: { argb: GREEN_OK }, bold: true };
    else if (status.toLowerCase().includes("not implemented") || status.toLowerCase().includes("manual"))
      row.getCell(3).font = { color: { argb: AMBER_WARN }, italic: true };
    else if (status.toLowerCase().includes("partial"))
      row.getCell(3).font = { color: { argb: AMBER_WARN }, bold: true };
  });
}

// ── Column Constraints — per-column audit ────────────────────────
{
  const ws = wb.addWorksheet("Column Constraints", {
    properties: { tabColor: { argb: COPPER_DEEP } },
  });
  ws.columns = [
    { header: "Table", key: "tbl", width: 14 },
    { header: "Column", key: "col", width: 26 },
    { header: "Current type", key: "cur", width: 14 },
    { header: "Should be", key: "should", width: 22 },
    { header: "Suggested format / constraint", key: "fmt", width: 36 },
    { header: "Needs companion 'notes' column?", key: "note", width: 16 },
    { header: "Dropdown candidate?", key: "dd", width: 16 },
    { header: "Reason / how it gets miskey'd today", key: "why", width: 56 },
  ];

  // Each row flags a concrete tightening. Empty cells = no change suggested.
  const cc = [
    // ── deals ───────────────────────────────────────────────────
    ["deals", "dealId", "text (free)", "text (validated)", "Regex ^\\d{4}$ — 4-digit project code", "No", "No (auto-complete only)", "Typos lead to orphaned buildings (projectId on buildings).join."],
    ["deals", "dealName", "text", "text", "Trim, sentence case on save", "No", "No", "Free-text fine; consistent casing helps sort."],
    ["deals", "spaceId", "text (free)", "text (validated)", "Regex ^\\d{4}-B\\d{2}-S\\d{2}$ — autofill from building bay", "No", "Yes — dropdown of buildings.baySpaceIds for projectId", "User types '5001-B1-3' or '5001-S03' — many forms today."],
    ["deals", "building", "text (free)", "(deprecate)", "Remove — derive from buildingId or building.name", "No", "No", "Duplicates info that should live in buildingId reference."],
    ["deals", "minSF / maxSF", "int (any)", "int", "Range 1,000–2,000,000; minSF ≤ maxSF check", "No", "No", "Sometimes 0 or extreme values entered by accident."],
    ["deals", "prospectTenant", "text", "text", "Trim; title case", "No", "Yes — autocomplete from prior tenants", "Tenant name retyped differently each time → can't group activity."],
    ["deals", "brokerRep", "text", "text", "Same — autocomplete", "No", "Yes — autocomplete + 'Direct' option", "Same as tenant — name drift."],
    ["deals", "transaction", "text (free)", "enum", "ENUM: New Lease, Renewal, Expansion, Sublease, Assignment, Direct Lease", "No", "✅ YES — dropdown only", "Free text today — 'renew' vs 'renewal' vs 'Renew' all appear."],
    ["deals", "status", "enum (already)", "enum", "Already enum: Hot, New Prospect, On Hold, Lost, Executed, Closed", "No", "✅ YES (already)", "OK."],
    ["deals", "priority", "enum (already)", "enum", "Already enum: high, medium, low", "No", "✅ YES (already)", "OK."],
    ["deals", "lastRevalUWRent / targetRent", "numeric", "currency ($)", "$ with 2 decimals; range $1–$50 PSF reasonable", "No", "No", "Sometimes $ vs ¢ confusion ($8 vs $0.08)."],
    ["deals", "tiPerSF", "numeric", "currency ($/SF)", "$ with 2 decimals; range $0–$100", "✅ YES — split into tiPerSF (number) + tiNote (text)", "No", "Today people put '$25 base building only' in the same field — number + free text mashed together."],
    ["deals", "tiNote", "text (already)", "text", "Free text", "Already separate ✅", "No", "Already separate; ensure pairing with tiPerSF on UI."],
    ["deals", "freeRentMonths", "int", "int", "0–24 months range", "No", "No", "Years vs months — sometimes 1 means 1 year."],
    ["deals", "proposedTermMonths", "int", "int", "Multiples of 6 or 12 ideal; range 12–240", "No", "Yes — common terms dropdown (5, 7, 10 yr)", "Number-of-years vs number-of-months confusion."],
    ["deals", "probabilityPct", "int", "percent", "0–100, step 10", "No", "Yes — buckets: 10/25/50/75/90", "Today 0–100 free, leads to oddly specific 47%."],
    ["deals", "expectedStart", "date", "date", "ISO date", "No", "No", "OK."],
    ["deals", "lat / lng", "numeric", "numeric", "Validate lat ∈ [-90,90], lng ∈ [-180,180]", "No", "No", "OK; bounded by map click."],
    ["deals", "currentSummary / notes", "text", "text", "Free", "No", "No", "OK."],
    ["deals", "broker company (missing)", "—", "text", "—", "—", "—", "⚠ Not stored today; broker name without company groups badly."],

    // ── rent_roll ───────────────────────────────────────────────
    ["rent_roll", "buildingId", "uuid (nullable)", "uuid (not null when occupied)", "Required when occupied=true", "No", "Yes — building picker", "Often null — kills SF rollups."],
    ["rent_roll", "spaceId", "text (free)", "text (validated)", "Same regex as deals.spaceId; pick from buildings.baySpaceIds", "No", "Yes — dropdown", "Free text today."],
    ["rent_roll", "market", "text (free)", "enum", "ENUM: Twin Cities, Phoenix, Las Vegas, Cincinnati, Houston, etc.", "No", "✅ YES", "Each user types market differently."],
    ["rent_roll", "propertyType", "text (free)", "enum", "ENUM: Industrial, Office, Retail, Flex, Cold Storage", "No", "✅ YES", "Same issue."],
    ["rent_roll", "buildingType", "text (free)", "enum", "ENUM: Class A bulk, Class B bulk, Last-mile, Light industrial, Manufacturing, Cold storage, Flex/Office", "No", "✅ YES", "Same."],
    ["rent_roll", "tenantName", "text", "text", "Trim + title case", "No", "Yes — autocomplete from prior tenants", "Drift across rows."],
    ["rent_roll", "tenantRating", "numeric", "enum or int", "Pick from credit bands: AAA, AA, A, BBB, BB, B, NR, Unrated", "No", "✅ YES", "Numeric value with no scale is ambiguous."],
    ["rent_roll", "occupied", "bool", "bool", "Drives most downstream rollups", "No", "No", "OK."],
    ["rent_roll", "uwBasis", "enum (already)", "enum", "Already typed", "No", "✅ YES (already)", "OK."],
    ["rent_roll", "leasableSF", "int (nullable)", "int (>0)", "CHECK leasable_sf > 0; rollup must = building SF", "No", "No", "Most-mis-keyed field. Drives integrity rule #1."],
    ["rent_roll", "leaseStart / leaseTermMonths", "date / int", "date / int", "Range 6–240 mo; start ≥ 2010", "No", "No", "OK; leaseEnd should derive."],
    ["rent_roll", "leaseEnd", "date (stored)", "DERIVED", "Generated column — drop manual entry", "No", "No", "Drifts from start+term today."],
    ["rent_roll", "freeRentMonths", "int", "int", "0–24", "No", "No", "OK."],
    ["rent_roll", "annualRentBumpsPct", "numeric", "percent", "0–5% typical; warn at >5%", "No", "Yes — buckets 2%, 2.5%, 3%, 3.5%", "Sometimes entered as decimal (0.03 vs 3)."],
    ["rent_roll", "tiPerSF", "numeric", "currency", "$0–$100 PSF", "✅ YES — split tiPerSF + tiNote", "No", "Same TI issue as deals."],
    ["rent_roll", "uwTiPerSF", "numeric", "currency", "Same constraints", "No", "No", "Could merge with tiPerSF + an isUW flag."],
    ["rent_roll", "specOffice", "bool", "bool", "Drives specTIPerSF visibility", "No", "No", "OK."],
    ["rent_roll", "specTIPerSF", "numeric", "currency", "Required when specOffice=true", "No", "No", "OK."],
    ["rent_roll", "commissionStructurePct", "numeric", "percent", "Typical 4–6%; warn outside", "No", "Yes — preset structures (4%/2%, 5/2.5)", "Sometimes commission $$ entered into the % field."],
    ["rent_roll", "commissionDollar", "numeric", "currency", "Mutually exclusive with commissionStructurePct?", "No", "No", "Two fields for the same thing — confusing."],
    ["rent_roll", "lastRevalUWRent / startingAnnualRentPSF / inPlaceRent", "numeric", "currency $/SF", "All PSF — label clearly", "No", "No", "Three rent fields, easy to enter into the wrong one."],

    // ── buildings ───────────────────────────────────────────────
    ["buildings", "projectId", "text (free)", "text (FK-ish)", "Must match a deals.dealId", "No", "✅ YES — deal picker on create", "Free text today → typo silently orphans the building."],
    ["buildings", "name", "text", "text", "Auto: '<projectId> Building <ordinal>'", "No", "No", "OK."],
    ["buildings", "widthFt / depthFt / heightFt", "numeric", "numeric", "widthFt 50–1500; depthFt 100–800; heightFt 18–60", "No", "No", "Out-of-range values warp visualization."],
    ["buildings", "bayCount", "int", "int", "1–60", "No", "No", "OK."],
    ["buildings", "rotationDeg", "numeric", "numeric", "Normalize to [0,360)", "No", "No", "OK."],
    ["buildings", "color", "text", "hex color", "/^#[0-9A-F]{6}$/", "No", "Yes — preset palette", "Free text today."],
    ["buildings", "baySpaceIds", "text[]", "text[]", "Length must equal bayCount + bumpouts", "No", "No", "Currently regenerated on bayCount change — can lose user edits."],

    // ── scenarios ───────────────────────────────────────────────
    ["scenarios", "name", "text", "text", "Trim; deduplicate per deal", "No", "No", "Common today: 'UW' x3 — confusing in A/B picker."],
    ["scenarios", "inputs.*", "jsonb", "jsonb (validated)", "Use lease-math validation.ts at write time", "No", "No", "Validated client-side now; should reject saves at the repo layer too."],

    // ── activities ──────────────────────────────────────────────
    ["activities", "type", "text", "enum", "ENUM: call, email, meeting, status_change, note, document", "No", "✅ YES", "Free text → can't filter cleanly."],
    ["activities", "author", "text", "text", "Pulled from session user", "No", "Yes — once we have auth", "Free text today."],
    ["activities", "link", "text (URL)", "text", "URL validator; prepend https:// if missing", "No", "No", "Sometimes paths instead of URLs."],

    // ── onboarding_checklists ──────────────────────────────────
    ["onboarding_checklists", "items[*].fileUrl", "text", "text (URL or file://)", "Allow http(s), file://, smb:// for office share paths", "No", "No", "Already allowed any string."],
  ];

  cc.forEach((r) => ws.addRow(r));
  styleHeader(ws);
  ws.eachRow((row, n) => {
    if (n === 1) return;
    row.alignment = { wrapText: true, vertical: "top" };
    row.height = 36;
    const dd = String(row.getCell(7).value ?? "");
    if (dd.startsWith("✅")) row.getCell(7).font = { color: { argb: GREEN_OK }, bold: true };
    const note = String(row.getCell(6).value ?? "");
    if (note.startsWith("✅")) row.getCell(6).font = { color: { argb: GREEN_OK }, bold: true };
    const why = String(row.getCell(8).value ?? "");
    if (why.startsWith("⚠")) row.getCell(8).font = { color: { argb: AMBER_WARN }, italic: true };
  });
  ws.views = [{ state: "frozen", ySplit: 1, xSplit: 2 }];
}

// ── Dropdowns to Build ────────────────────────────────────────────
{
  const ws = wb.addWorksheet("Dropdowns to Build", {
    properties: { tabColor: { argb: COPPER } },
  });
  ws.columns = [
    { header: "Field", key: "field", width: 26 },
    { header: "Lives on", key: "lives", width: 22 },
    { header: "Starter values (edit as needed)", key: "vals", width: 80 },
  ];

  const dd = [
    ["transaction", "deals.transaction", "New Lease | Renewal | Expansion | Sublease | Assignment | Direct Lease | Build-to-Suit | Relocation"],
    ["activity type", "activities.type", "call | email | meeting | tour | status_change | note | document | LOI sent | LOI received | counter-offer | lease executed"],
    ["market", "rent_roll.market", "Twin Cities | Phoenix | Las Vegas | Cincinnati | Houston | Dallas-Fort Worth | Atlanta | Indianapolis | Columbus | Nashville | (add others as needed)"],
    ["propertyType", "rent_roll.propertyType", "Industrial | Office | Retail | Flex | Cold Storage | Land | Specialty"],
    ["buildingType", "rent_roll.buildingType", "Class A bulk | Class B bulk | Last-mile | Light industrial | Manufacturing | Cold storage | Flex/Office | Truck terminal | Outdoor storage"],
    ["tenantRating", "rent_roll.tenantRating", "AAA | AA | A | BBB | BB | B | NR (Not Rated) | Unrated / Private | Govt"],
    ["broker company / direct flag", "deals.brokerRep companion", "Free text + 'Direct (no broker)' checkbox; autocomplete from past entries"],
    ["term length presets", "deals.proposedTermMonths", "12 | 36 | 60 | 84 | 120 | 180 | 240 — also allow custom"],
    ["bumps presets", "rent_roll.annualRentBumpsPct", "Flat (0%) | 2.0% | 2.5% | 3.0% | 3.5% | CPI"],
    ["commission structure", "rent_roll.commissionStructurePct", "Direct (no commission) | 4%/2% renewal | 5%/2.5% renewal | 6%/3% renewal | Flat $/SF | Custom"],
    ["building color", "buildings.color", "Parce copper (#D4895A) | Slate gray | Cool white | Warm tan — choose from palette"],
    ["onboarding template", "onboarding_checklists.templateVersion", "v1 — industrial standard | v2 — office | v3 — cold storage (when defined)"],
  ];

  dd.forEach((r) => ws.addRow(r));
  styleHeader(ws);
  ws.eachRow((row, n) => {
    if (n === 1) return;
    row.alignment = { wrapText: true, vertical: "top" };
    row.height = 38;
  });
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

function styleHeader(ws) {
  const row = ws.getRow(1);
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: COPPER_DEEP } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CREAM } };
    cell.alignment = { vertical: "middle" };
    cell.border = {
      bottom: { style: "thin", color: { argb: COPPER } },
    };
  });
  row.height = 22;
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

const out = path.join(__dirname, "..", "parce-data-dictionary.xlsx");
await wb.xlsx.writeFile(out);
console.log("✓ Wrote", out);
