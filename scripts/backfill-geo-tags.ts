/**
 * Backfill market / submarket / county / city tags for every row in
 * development_projects, acquisition_targets, and disposition_listings.
 *
 * Idempotent: re-running re-derives tags from current lat/lng and writes
 * back. Rows with no lat/lng end up with null tags, same as the runtime
 * save path.
 *
 * Usage:
 *   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... \
 *     npx tsx scripts/backfill-geo-tags.ts
 *
 * Optional:
 *   --dry-run   Print what would change, don't write
 *   --only=dev|acq|dispo  Limit scope to one table
 */

import { createClient } from '@supabase/supabase-js';
import { geoTag } from '../src/lib/geo-tagger';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before running.');
  process.exit(1);
}

const dryRun = process.argv.includes('--dry-run');
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg?.split('=')[1];

const sb = createClient(url, key);

interface BackfillRow {
  id: string;
  lat: number | null;
  lng: number | null;
  market: string | null;
  submarket: string | null;
  county: string | null;
  city: string | null;
}

async function backfillTable(table: 'development_projects' | 'acquisition_targets' | 'disposition_listings') {
  console.log(`\n→ ${table}`);
  const { data, error } = await sb
    .from(table)
    .select('id, lat, lng, market, submarket, county, city');
  if (error) {
    console.error(`  load failed:`, error.message);
    return;
  }
  if (!data) {
    console.log('  no rows');
    return;
  }

  let updated = 0;
  let skipped = 0;
  for (const row of data as BackfillRow[]) {
    const next = geoTag({ lat: row.lat, lng: row.lng });
    const diff =
      next.market !== row.market ||
      next.submarket !== row.submarket ||
      next.county !== row.county ||
      next.city !== row.city;
    if (!diff) {
      skipped++;
      continue;
    }
    if (dryRun) {
      console.log(
        `  [${row.id}]`,
        `  market: ${row.market ?? '∅'} → ${next.market ?? '∅'}`,
        `  submarket: ${row.submarket ?? '∅'} → ${next.submarket ?? '∅'}`
      );
      updated++;
      continue;
    }
    const { error: upErr } = await sb
      .from(table)
      .update({
        market: next.market,
        submarket: next.submarket,
        county: next.county,
        city: next.city,
      })
      .eq('id', row.id);
    if (upErr) {
      console.error(`  update ${row.id} failed:`, upErr.message);
      continue;
    }
    updated++;
  }
  console.log(`  ${updated} updated, ${skipped} unchanged${dryRun ? ' (dry run — no writes)' : ''}`);
}

async function main() {
  console.log(`Backfill geo-tags · dryRun=${dryRun} · only=${only ?? 'all'}`);
  if (!only || only === 'dev')   await backfillTable('development_projects');
  if (!only || only === 'acq')   await backfillTable('acquisition_targets');
  if (!only || only === 'dispo') await backfillTable('disposition_listings');
  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
