/**
 * Seed the Supabase database from sample-leases.xlsx.
 *
 * Usage:
 *   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... \
 *     npx tsx scripts/seed-supabase.ts
 *
 * Optional flags:
 *   --reset    Wipe existing rows before inserting (default: append/upsert)
 *   --file=X   Path to an alternate xlsx (default: ./sample-leases.xlsx)
 *
 * Idempotent on the default path: all entities have stable IDs, so re-runs
 * upsert in place. Use --reset for a clean re-seed.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

import { loadFromWorkbook } from '../src/lib/excel';
import {
  dealToRow,
  rentRollToRow,
  activityToRow,
  onboardingToRow,
} from '../src/lib/repo/mappers';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in env.');
  process.exit(1);
}

const args = process.argv.slice(2);
const reset = args.includes('--reset');
const fileArg = args.find((a) => a.startsWith('--file='))?.slice('--file='.length);

const __dirname = dirname(fileURLToPath(import.meta.url));
const xlsxPath = resolve(__dirname, '..', fileArg ?? 'sample-leases.xlsx');

console.log(`→ Reading workbook: ${xlsxPath}`);
const buffer = readFileSync(xlsxPath);
const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
const { deals, rentRoll, activities, onboardings } = loadFromWorkbook(workbook);

console.log(
  `→ Parsed: ${deals.length} deals, ${rentRoll.length} rent-roll rows, ` +
    `${activities.length} activities, ${onboardings.length} onboarding checklists`
);

const supabase = createClient(url, key, { auth: { persistSession: false } });
const SENTINEL = '00000000-0000-0000-0000-000000000000';

async function clearTable(table: string) {
  const { error } = await supabase.from(table).delete().neq('id', SENTINEL);
  if (error) throw new Error(`Clearing ${table}: ${error.message}`);
}

async function main() {
  if (reset) {
    console.log('→ --reset: clearing existing rows');
    // Order matters only if we have FKs; we don't, so any order works.
    await clearTable('activities');
    await clearTable('onboarding_checklists');
    await clearTable('rent_roll');
    await clearTable('deals');
  }

  if (deals.length > 0) {
    console.log(`→ Upserting ${deals.length} deals…`);
    const { error } = await supabase.from('deals').upsert(deals.map(dealToRow));
    if (error) throw new Error(`deals upsert: ${error.message}`);
  }

  if (rentRoll.length > 0) {
    console.log(`→ Upserting ${rentRoll.length} rent_roll rows…`);
    const { error } = await supabase.from('rent_roll').upsert(rentRoll.map(rentRollToRow));
    if (error) throw new Error(`rent_roll upsert: ${error.message}`);
  }

  if (activities.length > 0) {
    console.log(`→ Inserting ${activities.length} activities…`);
    // Activities use insert (no natural conflict target other than id) — to
    // avoid duplicate-key on re-runs we upsert on id.
    const { error } = await supabase.from('activities').upsert(activities.map(activityToRow));
    if (error) throw new Error(`activities upsert: ${error.message}`);
  }

  if (onboardings.length > 0) {
    console.log(`→ Upserting ${onboardings.length} onboarding checklists…`);
    const { error } = await supabase
      .from('onboarding_checklists')
      .upsert(onboardings.map(onboardingToRow));
    if (error) throw new Error(`onboarding upsert: ${error.message}`);
  }

  console.log('✓ Seed complete.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
