// One-off: regenerate the Leasing-Tracker import template.
// Builds a workbook with one stub row in every sheet so the user
// sees the complete schema (all tabs, all column headers).
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

const now = new Date().toISOString();
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
    timestamp: now,
    kind: 'note',
    author: '',
    summary: '',
    detail: null,
    createdAt: now,
  },
];
data.onboardings = [
  {
    id: randomUUID(),
    rentRollId: sampleRow.id,
    createdAt: now,
    templateVersion: 1,
    items: [
      {
        itemId: '',
        checked: false,
        notes: null,
        link: null,
        completedAt: null,
      } as any,
    ],
  },
];
// Generic stubs for every entity. Mappers in buildWorkbook tolerate
// empty/undefined values for most fields, but enums + arrays + nested
// objects must be present to avoid runtime errors.
const baseMeta = { id: '', createdAt: now, updatedAt: now } as const;
const stubId = () => randomUUID();

data.scenarios = [
  {
    ...baseMeta,
    id: stubId(),
    dealId: sampleDeal.id,
    name: '',
    inputs: {},
    globals: {},
    results: null,
  } as any,
];
data.buildings = [
  {
    id: stubId(),
    projectId: '',
    name: '',
    footprint: { type: 'Polygon', coordinates: [] } as any,
    heightFt: 30,
    color: null,
    bayCount: 1,
    frontageSide: null,
    widthFt: null,
    depthFt: null,
    rotationDeg: 0,
    centerLat: null,
    centerLng: null,
    bumpOuts: [],
    baySpaceIds: [],
    spaceSubdivisions: [],
    buildingOrdinal: null,
    createdAt: now,
    updatedAt: now,
  },
];
data.devProjects = [
  { id: stubId(), projectName: '', phase: '', riskLevel: '', createdAt: now, updatedAt: now } as any,
];
data.propertyTaxAppeals = [
  { id: stubId(), taxYear: '', status: '', createdAt: now, updatedAt: now } as any,
];
data.leaseComps = [
  { id: stubId(), confidence: '', confidential: false, createdAt: now, updatedAt: now } as any,
];
data.salesComps = [
  { id: stubId(), confidence: '', confidential: false, createdAt: now, updatedAt: now } as any,
];
data.amPendingItems = [
  {
    id: stubId(),
    itemType: '',
    title: '',
    status: '',
    priority: '',
    cadence: '',
    createdAt: now,
    updatedAt: now,
  } as any,
];
data.contacts = [
  {
    id: stubId(),
    contactType: '',
    phones: [],
    emails: [],
    createdAt: now,
    updatedAt: now,
  } as any,
];
data.devProjectContacts = [
  {
    id: stubId(),
    devProjectId: '',
    contactId: '',
    isPrimary: false,
    createdAt: now,
    updatedAt: now,
  } as any,
];
data.devProjectNotes = [
  {
    id: stubId(),
    devProjectId: '',
    noteType: '',
    content: '',
    createdAt: now,
    updatedAt: now,
  } as any,
];
data.acquisitionTargets = [
  {
    id: stubId(),
    targetName: '',
    status: '',
    riskLevel: '',
    diligenceStatus: {},
    createdAt: now,
    updatedAt: now,
  } as any,
];
data.acquisitionTargetContacts = [
  {
    id: stubId(),
    acquisitionTargetId: '',
    contactId: '',
    isPrimary: false,
    createdAt: now,
    updatedAt: now,
  } as any,
];
data.acquisitionTargetNotes = [
  {
    id: stubId(),
    acquisitionTargetId: '',
    noteType: '',
    content: '',
    createdAt: now,
    updatedAt: now,
  } as any,
];
data.dispositionListings = [
  {
    id: stubId(),
    assetName: '',
    status: '',
    riskLevel: '',
    createdAt: now,
    updatedAt: now,
  } as any,
];
data.dispositionListingContacts = [
  {
    id: stubId(),
    dispositionListingId: '',
    contactId: '',
    isPrimary: false,
    createdAt: now,
    updatedAt: now,
  } as any,
];
data.dispositionListingNotes = [
  {
    id: stubId(),
    dispositionListingId: '',
    noteType: '',
    content: '',
    createdAt: now,
    updatedAt: now,
  } as any,
];

const blob = buildWorkbookBlob(data);
const buf = Buffer.from(await blob.arrayBuffer());
writeFileSync(OUT, buf);

console.log(`Wrote template → ${OUT}`);
console.log(`Size: ${(buf.length / 1024).toFixed(1)} KB`);
console.log('Sheets seeded with 1 stub row each — replace or delete before importing.');
