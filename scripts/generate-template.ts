// One-off: regenerate the Leasing-Tracker import template.
// Uses the project's own buildWorkbook so the template matches the
// current import/export schema exactly (post UW strip, PR #46 + #47).
//
// Output → ~/Library/Mobile Documents/com~apple~CloudDocs/Claude/

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';

import { buildWorkbookBlob, emptyDataSet } from '../src/lib/excel';
import { defaultDeal, defaultRentRollRow } from '../src/types';

const OUT = resolve(
  homedir(),
  'Library/Mobile Documents/com~apple~CloudDocs/Claude/leasing-tracker-template.xlsx'
);

const sampleDeal = defaultDeal();
const sampleRow = defaultRentRollRow();

const data = emptyDataSet();
data.deals = [sampleDeal];
data.rentRoll = [sampleRow];
data.activities = [
  {
    id: randomUUID(),
    parentType: 'deal',
    parentId: sampleDeal.id,
    timestamp: new Date().toISOString(),
    kind: 'note',
    author: 'You',
    summary: 'Example activity row — replace or delete',
    detail: null,
    createdAt: new Date().toISOString(),
  },
];

const blob = buildWorkbookBlob(data);

const buf = Buffer.from(await blob.arrayBuffer());
writeFileSync(OUT, buf);

console.log(`Wrote template → ${OUT}`);
console.log(`Size: ${(buf.length / 1024).toFixed(1)} KB`);
