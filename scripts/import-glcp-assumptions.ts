// ───────────────────────────────────────────────────────────────────
// One-shot importer for GLCP_Leasing_Assumptions.csv.
//
// Reads from iCloud, parses each row, fuzzy-matches Deal Name to a
// projects row to set project_uuid, upserts into uw_assumptions with
// assumption_set='2H25 Reval UW'.
//
// Usage:  npx tsx scripts/import-glcp-assumptions.ts
// ───────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const CSV_PATH = join(
  homedir(),
  'Library/Mobile Documents/com~apple~CloudDocs/Claude/GLCP_Leasing_Assumptions.csv'
);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const ASSUMPTION_SET = '2H25 Reval UW';

interface CsvRow {
  Code: string;
  'Deal Name': string;
  'Tenant Name': string;
  'Project SF': string;
  'Building SF': string;
  'Lease SF': string;
  'Trended Rent': string;
  'Lease Term': string;
  'Start Month Post Completion': string;
  'Starting Month': string;
  'Start Month (Date)': string;
  'Free Rent (months)': string;
  TIs: string;
  LCs: string;
  'LC Override': string;
  'Rent Escalations': string;
  Status: string;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  const header = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const row: Record<string, string> = {};
    header.forEach((h, i) => { row[h] = cols[i] ?? ''; });
    return row as unknown as CsvRow;
  });
}

// Minimal CSV split — handles quoted fields with embedded commas.
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseNum(s: string | undefined): number | null {
  if (!s) return null;
  const cleaned = s.replace(/%/g, '').trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parsePct(s: string | undefined): number | null {
  // CSV stores as either "7.00%" or "0.07" — both interpreted as fraction.
  if (!s) return null;
  const isExplicitPercent = s.includes('%');
  const n = parseNum(s);
  if (n === null) return null;
  return isExplicitPercent ? n / 100 : n;
}

function parseDate(s: string | undefined): string | null {
  if (!s) return null;
  // CSV format: "3/1/2024" → "2024-03-01"
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

// Pulls building + suite from the natural-key Code:
//   "MiamiMidwa-3-01"   -> { building: "3",  suite: "01" }
//   "GatewayGra-B-01"   -> { building: "B",  suite: "01" }
//   "Beltway8&T-1-01"   -> { building: "1",  suite: "01" }
function parseCode(code: string): { building: string | null; suite: string | null } {
  const parts = code.split('-');
  if (parts.length < 3) return { building: null, suite: null };
  return { building: parts[parts.length - 2], suite: parts[parts.length - 1] };
}

// Normalize for fuzzy matching: lowercase + alphanumeric only.
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function main() {
  console.log('Reading', CSV_PATH);
  const text = readFileSync(CSV_PATH, 'utf8');
  const rows = parseCsv(text);
  console.log(`Parsed ${rows.length} rows`);

  // Load projects to fuzzy-match Deal Name → project_uuid.
  const { data: projects, error: projErr } = await sb
    .from('projects')
    .select('id, project_code, name');
  if (projErr) {
    console.error('Failed to load projects:', projErr.message);
    process.exit(1);
  }
  const projectByNormName = new Map<string, string>();
  for (const p of projects ?? []) {
    projectByNormName.set(normalize((p as { name: string }).name), (p as { id: string }).id);
  }

  let matched = 0;
  let unmatched = 0;
  const records = rows.map((r) => {
    const { building, suite } = parseCode(r.Code);
    const dealName = r['Deal Name'];
    const normDeal = normalize(dealName);
    // Try exact normalized match, then prefix/substring.
    let projectUuid: string | null = projectByNormName.get(normDeal) ?? null;
    if (!projectUuid) {
      for (const [normName, id] of projectByNormName.entries()) {
        if (normName.startsWith(normDeal.slice(0, 8)) || normDeal.startsWith(normName.slice(0, 8))) {
          projectUuid = id;
          break;
        }
      }
    }
    if (projectUuid) matched++; else unmatched++;
    return {
      assumption_set: ASSUMPTION_SET,
      code: r.Code,
      project_uuid: projectUuid,
      project_name_raw: dealName,
      tenant_name: r['Tenant Name'] || null,
      building_code: building,
      suite_code: suite,
      project_sf: parseNum(r['Project SF']),
      building_sf: parseNum(r['Building SF']),
      lease_sf: parseNum(r['Lease SF']),
      trended_rent_psf: parseNum(r['Trended Rent']),
      lease_term_months: parseNum(r['Lease Term']),
      start_month_post_completion: parseNum(r['Start Month Post Completion']),
      starting_month: parseNum(r['Starting Month']),
      start_date: parseDate(r['Start Month (Date)']),
      free_rent_months: parseNum(r['Free Rent (months)']),
      tis_psf: parseNum(r.TIs),
      lcs_pct: parsePct(r.LCs),
      lc_override_pct: parsePct(r['LC Override']),
      rent_escalations_pct: parsePct(r['Rent Escalations']),
      status: r.Status || null,
    };
  });

  console.log(`Matched ${matched} to project_uuid; ${unmatched} unmatched (project_name_raw still preserved)`);

  // Upsert by (assumption_set, code).
  const { error: upErr } = await sb
    .from('uw_assumptions')
    .upsert(records, { onConflict: 'assumption_set,code' });
  if (upErr) {
    console.error('Upsert failed:', upErr.message);
    process.exit(1);
  }
  console.log(`Upserted ${records.length} GLCP assumptions into uw_assumptions (${ASSUMPTION_SET})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
