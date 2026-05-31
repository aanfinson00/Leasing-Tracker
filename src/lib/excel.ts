import * as XLSX from 'xlsx';
import type {
  ActivityEntry,
  ActivityParentType,
  ActivityType,
  AcquisitionTarget,
  AcquisitionTargetContact,
  AcquisitionTargetNote,
  AMPendingItem,
  Building,
  Contact,
  ContactChannel,
  Deal,
  DealStatus,
  DevelopmentProject,
  DevProjectContact,
  DevProjectNote,
  DispositionListing,
  DispositionListingContact,
  DispositionListingNote,
  LeaseComp,
  SalesComp,
  OnboardingChecklist,
  OnboardingItem,
  Priority,
  PropertyTaxAppeal,
  RentRollRow,
  Scenario,
  TenantRating,
} from '../types';
import {
  AcquisitionStatusEnum,
  AcquisitionTargetContactSchema,
  AcquisitionTargetNoteSchema,
  AcquisitionTargetSchema,
  ActivityEntrySchema,
  ActivityParentTypeEnum,
  ActivityTypeEnum,
  AMCadenceEnum,
  AMItemTypeEnum,
  AMPendingItemSchema,
  AMStatusEnum,
  BuildingSchema,
  CompConfidenceEnum,
  ContactSchema,
  ContactTypeEnum,
  DealSchema,
  DealStatusEnum,
  DevelopmentProjectSchema,
  DevNoteTypeEnum,
  DevPhaseEnum,
  DevProjectContactSchema,
  DevProjectNoteSchema,
  DispositionListingContactSchema,
  DispositionListingNoteSchema,
  DispositionListingSchema,
  DispositionStatusEnum,
  FrontageSideEnum,
  LeaseCompSchema,
  SalesCompSchema,
  OnboardingChecklistSchema,
  PropertyTaxAppealSchema,
  PropertyTaxAppealStatusEnum,
  RentRollRowSchema,
  RentTypeEnum,
  RiskLevelEnum,
  ScenarioSchema,
  TenantRatingEnum,
  TransactionTypeEnum,
} from '../types';
import { getTemplateItem, reconcileWithTemplate } from './onboarding';

const MISSING_TOKENS = new Set(['', '?', '#n/a', '#na', 'n/a', 'na', '-', '—', 'tbd', 'unknown']);

const isMissing = (v: unknown): boolean => {
  if (v === null || v === undefined) return true;
  const s = String(v).trim().toLowerCase();
  return MISSING_TOKENS.has(s);
};

const cleanString = (v: unknown): string | null => {
  if (isMissing(v)) return null;
  return String(v).trim();
};

const parseNumber = (v: unknown): number | null => {
  if (isMissing(v)) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const cleaned = String(v)
    .replace(/[$,]/g, '')
    .replace(/\s*(months?|month|sf|%|\/sf)\s*$/i, '')
    .replace(/^\s*~\s*/, '')
    .trim();
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

const parseSFRange = (v: unknown): { min: number | null; max: number | null } => {
  if (isMissing(v)) return { min: null, max: null };
  if (typeof v === 'number') return { min: v, max: v };
  const raw = String(v).replace(/[,]/g, '').replace(/\s*sf\s*$/i, '').trim();
  const rangeMatch = raw.match(/^(\d+(?:\.\d+)?)\s*(?:-|to|–|—)\s*(\d+(?:\.\d+)?)$/i);
  if (rangeMatch) {
    return { min: Number(rangeMatch[1]), max: Number(rangeMatch[2]) };
  }
  const single = parseNumber(raw);
  return { min: single, max: single };
};

const parseTI = (v: unknown): { num: number | null; note: string | null } => {
  if (isMissing(v)) return { num: null, note: null };
  const num = parseNumber(v);
  if (num !== null) return { num, note: null };
  const s = String(v).trim();
  return { num: null, note: s === '' ? null : s };
};

const parsePercent = (v: unknown): number | null => {
  if (isMissing(v)) return null;
  if (typeof v === 'number') {
    return v <= 1 ? Math.round(v * 100) : v;
  }
  const cleaned = String(v).replace(/[%\s]/g, '');
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return n <= 1 ? Math.round(n * 100) : n;
};

const parseDate = (v: unknown): string | null => {
  if (isMissing(v)) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    const ms = (v - 25569) * 86400 * 1000;
    const d = new Date(ms);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return s;
};

const parseBool = (v: unknown): boolean => {
  if (typeof v === 'boolean') return v;
  const s = String(v ?? '').trim().toLowerCase();
  return s === 'yes' || s === 'y' || s === 'true' || s === '1';
};

// Credit-rating parse. Accepts the new enum values directly; legacy
// 1-5 numeric / star inputs map to 'Unrated / Private' rather than
// fabricate a credit grade from a quality score.
const parseTenantRating = (v: unknown): TenantRating | null => {
  if (isMissing(v)) return null;
  const s = String(v).trim();
  const match = TenantRatingEnum.options.find((r) => r.toLowerCase() === s.toLowerCase());
  if (match) return match;
  const filled = (s.match(/★/g) ?? []).length;
  if (filled > 0) return 'Unrated / Private';
  const asNum = parseNumber(v);
  if (asNum !== null && asNum >= 0 && asNum <= 5) return 'Unrated / Private';
  return null;
};

// Legacy → current status map. Applied on read; one-way migration.
const LEGACY_STATUS_MAP: Record<string, DealStatus> = {
  'prospect': 'New Prospect',
  'rfp out': 'Proposal Sent',
  'rfp for approval': 'Proposal Pending Approval',
};

const parseStatus = (v: unknown): DealStatus => {
  const s = cleanString(v);
  if (!s) return 'New Prospect';
  const lower = s.toLowerCase();

  // Exact match on a current enum value first.
  const opts = DealStatusEnum.options;
  const exact = opts.find((o) => o.toLowerCase() === lower);
  if (exact) return exact;

  // Legacy migration.
  if (LEGACY_STATUS_MAP[lower]) return LEGACY_STATUS_MAP[lower];

  // Loose matching for the current vocabulary.
  if (lower.includes('lease') && lower.includes('negot')) return 'Lease Negotiations';
  if (lower.includes('loi')) return 'LOI Negotiations';
  if (lower.includes('proposal') && (lower.includes('pending') || lower.includes('approval'))) {
    return 'Proposal Pending Approval';
  }
  if (lower.includes('proposal') && lower.includes('sent')) return 'Proposal Sent';
  if (lower.includes('proposal')) return 'Proposal Sent';
  if (lower.includes('rfp') && (lower.includes('request') || lower.includes('req'))) return 'RFP Requested';
  if (lower.includes('rfp') && lower.includes('approval')) return 'Proposal Pending Approval';
  if (lower.includes('rfp')) return 'Proposal Sent';
  if (lower.includes('unsolicited') || lower.includes('draft')) return 'Drafting Unsolicited';
  if (lower.includes('hold')) return 'On Hold';
  if (lower.includes('execut')) return 'Executed';
  if (lower.includes('lost') || lower.includes('dead')) return 'Lost';
  if (lower.includes('new') || lower.includes('prospect')) return 'New Prospect';
  return 'New Prospect';
};

const parseActivityType = (v: unknown): ActivityType | null => {
  const s = cleanString(v)?.toLowerCase().replace(/\s+/g, '-') ?? '';
  if (!s) return null;
  const opts = ActivityTypeEnum.options;
  const exact = opts.find((o) => o === s);
  if (exact) return exact;
  if (s.includes('out')) return 'email-out';
  if (s.includes('in')) return 'email-in';
  if (s.includes('call')) return 'call';
  if (s.includes('meet')) return 'meeting';
  if (s.includes('status')) return 'status-change';
  return 'note';
};

const parseParentType = (v: unknown): ActivityParentType | null => {
  const s = cleanString(v)?.toLowerCase() ?? '';
  if (!s) return null;
  if (s.includes('deal')) return 'deal';
  if (s.includes('rent')) return 'rentroll';
  const opts = ActivityParentTypeEnum.options;
  return (opts.find((o) => o === s) ?? null) as ActivityParentType | null;
};

const parsePriority = (v: unknown): Priority => {
  const s = cleanString(v)?.toLowerCase() ?? '';
  if (s.startsWith('h')) return 'High';
  if (s.startsWith('m')) return 'Medium';
  return 'Low';
};

const parseEnumCI = <T extends string>(v: unknown, opts: readonly T[]): T | null => {
  const s = cleanString(v)?.toLowerCase() ?? '';
  if (!s) return null;
  const exact = opts.find((o) => o.toLowerCase() === s);
  return exact ?? null;
};

const parseJsonField = <T>(v: unknown, fallback: T): T => {
  if (isMissing(v)) return fallback;
  if (typeof v === 'object' && v !== null) return v as T;
  try {
    return JSON.parse(String(v)) as T;
  } catch {
    return fallback;
  }
};

const HEADER_NORMALIZE = (h: string) =>
  h.toLowerCase().replace(/[\s_\-/().$%]+/g, '').replace(/&/g, 'and').trim();

interface RawRow {
  [key: string]: unknown;
}

const buildGetter = (rawRow: RawRow) => {
  const norm: Record<string, unknown> = {};
  Object.entries(rawRow).forEach(([k, v]) => {
    norm[HEADER_NORMALIZE(k)] = v;
  });
  return (...keys: string[]): unknown => {
    for (const k of keys) {
      const nk = HEADER_NORMALIZE(k);
      if (nk in norm && norm[nk] !== null && norm[nk] !== undefined) return norm[nk];
    }
    return null;
  };
};

// ──────────────────────────────────────────────────────────────────
// Sheet detection — auto-find Prospects sheet vs Rent Roll sheet
// Handles workbooks with title/instruction rows above the headers
// (e.g. "CENTRAL LOGISTICS PLATFORM — Rent Roll" + ✎ note rows).
// ──────────────────────────────────────────────────────────────────

const RENT_ROLL_HEADER_HINTS = ['leasablesf', 'occupied', 'tenantrating'];
const PROSPECTS_HEADER_HINTS = ['prospecttenant', 'probabilityoflease', 'targetrent'];
const ACTIVITY_HEADER_HINTS = ['parentid', 'parenttype', 'summary'];
const ONBOARDING_HEADER_HINTS = ['checklistid', 'itemid', 'checked'];
const SCENARIO_HEADER_HINTS = ['dealid', 'inputs', 'globals'];
const BUILDING_HEADER_HINTS = ['projectid', 'heightft', 'baycount'];
const DEV_PROJECT_HEADER_HINTS = ['projectname', 'phase', 'gcname'];
const TAX_APPEAL_HEADER_HINTS = ['parcelnumber', 'taxyear', 'assessedvalue'];
const LEASE_COMP_HEADER_HINTS = ['baserentpsf', 'effectiverentpsf', 'transactiontype'];
const SALES_COMP_HEADER_HINTS = ['saleprice', 'pricepsf', 'caprate'];
const AM_ITEM_HEADER_HINTS = ['itemtype', 'duedate', 'cadence'];
const CONTACT_HEADER_HINTS = ['contacttype', 'firstname', 'lastname'];
const DEV_PROJECT_CONTACT_HINTS = ['devprojectid', 'contactid', 'roleoverride'];
const DEV_PROJECT_NOTE_HINTS = ['devprojectid', 'notetype', 'content'];
const ACQ_TARGET_HEADER_HINTS = ['targetname', 'askingprice', 'ouroffer'];
const ACQ_CONTACT_HINTS = ['acquisitiontargetid', 'contactid', 'roleoverride'];
const ACQ_NOTE_HINTS = ['acquisitiontargetid', 'notetype', 'content'];
const DISPO_HEADER_HINTS = ['assetname', 'listprice', 'listcappct'];
const DISPO_CONTACT_HINTS = ['dispositionlistingid', 'contactid', 'roleoverride'];
const DISPO_NOTE_HINTS = ['dispositionlistingid', 'notetype', 'content'];

const readRow = (sheet: XLSX.WorkSheet, rowIdx: number): string[] => {
  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1');
  const out: string[] = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const ref = XLSX.utils.encode_cell({ r: rowIdx, c });
    const cell = sheet[ref];
    out.push(cell?.v !== undefined && cell?.v !== null ? String(cell.v) : '');
  }
  return out;
};

// Look at the first ~10 rows to find one that contains expected column names.
// Returns the row index of the header row, or 0 if none found.
type SheetType =
  | 'rentroll' | 'prospects' | 'activity' | 'onboarding'
  | 'scenario' | 'building' | 'devproject' | 'taxappeal' | 'leasecomp' | 'salescomp'
  | 'ampending' | 'contact'
  | 'devprojectcontact' | 'devprojectnote'
  | 'acqtarget' | 'acqcontact' | 'acqnote'
  | 'dispo' | 'dispocontact' | 'disponote'
  | 'unknown';

const hintCheck = (hints: string[], norm: Set<string>) =>
  hints.filter((h) => norm.has(h)).length;

const findHeaderRow = (sheet: XLSX.WorkSheet): { rowIdx: number; type: SheetType } => {
  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1');
  const maxScan = Math.min(range.s.r + 12, range.e.r);
  for (let r = range.s.r; r <= maxScan; r++) {
    const headers = readRow(sheet, r);
    const norm = new Set(headers.map(HEADER_NORMALIZE));

    // Link/note tables first (most specific hints)
    if (hintCheck(DEV_PROJECT_CONTACT_HINTS, norm) >= 2) return { rowIdx: r, type: 'devprojectcontact' };
    if (hintCheck(DEV_PROJECT_NOTE_HINTS, norm) >= 2) return { rowIdx: r, type: 'devprojectnote' };
    if (hintCheck(ACQ_CONTACT_HINTS, norm) >= 2) return { rowIdx: r, type: 'acqcontact' };
    if (hintCheck(ACQ_NOTE_HINTS, norm) >= 2) return { rowIdx: r, type: 'acqnote' };
    if (hintCheck(DISPO_CONTACT_HINTS, norm) >= 2) return { rowIdx: r, type: 'dispocontact' };
    if (hintCheck(DISPO_NOTE_HINTS, norm) >= 2) return { rowIdx: r, type: 'disponote' };

    // Existing 4
    if (hintCheck(ONBOARDING_HEADER_HINTS, norm) >= 2) return { rowIdx: r, type: 'onboarding' };
    if (hintCheck(ACTIVITY_HEADER_HINTS, norm) >= 2) return { rowIdx: r, type: 'activity' };
    if (hintCheck(RENT_ROLL_HEADER_HINTS, norm) >= 2) return { rowIdx: r, type: 'rentroll' };
    if (hintCheck(PROSPECTS_HEADER_HINTS, norm) >= 2) return { rowIdx: r, type: 'prospects' };

    // New entity tables
    if (hintCheck(SCENARIO_HEADER_HINTS, norm) >= 2) return { rowIdx: r, type: 'scenario' };
    if (hintCheck(BUILDING_HEADER_HINTS, norm) >= 2) return { rowIdx: r, type: 'building' };
    if (hintCheck(DEV_PROJECT_HEADER_HINTS, norm) >= 2) return { rowIdx: r, type: 'devproject' };
    if (hintCheck(TAX_APPEAL_HEADER_HINTS, norm) >= 2) return { rowIdx: r, type: 'taxappeal' };
    if (hintCheck(SALES_COMP_HEADER_HINTS, norm) >= 2) return { rowIdx: r, type: 'salescomp' };
    if (hintCheck(LEASE_COMP_HEADER_HINTS, norm) >= 2) return { rowIdx: r, type: 'leasecomp' };
    if (hintCheck(AM_ITEM_HEADER_HINTS, norm) >= 2) return { rowIdx: r, type: 'ampending' };
    if (hintCheck(CONTACT_HEADER_HINTS, norm) >= 2) return { rowIdx: r, type: 'contact' };
    if (hintCheck(ACQ_TARGET_HEADER_HINTS, norm) >= 2) return { rowIdx: r, type: 'acqtarget' };
    if (hintCheck(DISPO_HEADER_HINTS, norm) >= 2) return { rowIdx: r, type: 'dispo' };

    // Loose fallbacks for the original 2 types
    if (norm.has('dealname') && (norm.has('status') || norm.has('priority'))) {
      return { rowIdx: r, type: 'prospects' };
    }
    if (norm.has('tenantname') && norm.has('leasestart')) {
      return { rowIdx: r, type: 'rentroll' };
    }
  }
  return { rowIdx: range.s.r, type: 'unknown' };
};

// Convert sheet to objects, starting from a specific header row index.
const sheetToJsonFromRow = (sheet: XLSX.WorkSheet, headerRowIdx: number): RawRow[] => {
  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1');
  const headers = readRow(sheet, headerRowIdx);
  // De-duplicate empty headers so json_to_sheet doesn't collide
  const cleanHeaders = headers.map((h, i) => (h && h.trim() !== '' ? h : `__col_${i}`));

  const rows: RawRow[] = [];
  for (let r = headerRowIdx + 1; r <= range.e.r; r++) {
    const rowVals = readRow(sheet, r);
    const obj: RawRow = {};
    let hasAny = false;
    for (let c = 0; c < cleanHeaders.length; c++) {
      const raw = sheet[XLSX.utils.encode_cell({ r, c })];
      const v = raw?.v;
      if (v !== undefined && v !== null && String(v).trim() !== '') hasAny = true;
      obj[cleanHeaders[c]] = v ?? null;
      // also stash the formatted string for date cells we couldn't get raw value for
      if (!raw && rowVals[c]) {
        obj[cleanHeaders[c]] = rowVals[c];
        if (rowVals[c].trim() !== '') hasAny = true;
      }
    }
    if (hasAny) rows.push(obj);
  }
  return rows;
};

// ──────────────────────────────────────────────────────────────────
// Parsers per sheet type
// ──────────────────────────────────────────────────────────────────

const SUMMARY_KEYWORDS = new Set([
  'pipelinesummary',
  'wtdavgprobability',
  'totalactive',
  'totalpipeline',
  'grandtotal',
  'subtotal',
  'rfpout',
  'rfpforapproval',
  'loiout',
  'leaseout',
  'executed',
  'dead',
  'lost',
  'onhold',
  'prospect',
  'status',
]);

const parseProspectsRow = (rawRow: RawRow): Deal | null => {
  const get = buildGetter(rawRow);
  const dealName = cleanString(get('Deal Name', 'Property', 'Property Name'));
  if (!dealName) return null;

  // Real prospect rows have at least one of: tenant, broker, transaction, or SF.
  // Summary rows below the data block only have a label in Deal Name.
  const tenant = cleanString(get('Prospect / Tenant', 'Prospect/Tenant', 'Tenant', 'Prospect'));
  const broker = cleanString(get('Broker / Rep', 'Broker/Rep', 'Broker', 'Rep'));
  const transaction = cleanString(get('Transaction', 'Transaction Type', 'Deal Type'));
  const minSFRaw = get('Min SF');
  const maxSFRaw = get('Max SF');
  const availSF = cleanString(get('Available SF', 'SF', 'Square Feet'));
  if (!tenant && !broker && !transaction && !availSF && !minSFRaw && !maxSFRaw) {
    // Probable summary/calculation row — skip.
    return null;
  }
  // Defensive: skip rows whose Deal Name matches known summary labels.
  if (SUMMARY_KEYWORDS.has(HEADER_NORMALIZE(dealName))) return null;

  // Prefer the new numeric Min SF / Max SF columns; fall back to the legacy
  // single "Available SF" string column for older workbooks.
  let minSF: number | null;
  let maxSF: number | null;
  if (minSFRaw !== null || maxSFRaw !== null) {
    minSF = parseNumber(minSFRaw);
    maxSF = parseNumber(maxSFRaw);
    if (minSF === null && maxSF !== null) minSF = maxSF;
    if (maxSF === null && minSF !== null) maxSF = minSF;
  } else {
    const range = parseSFRange(get('Available SF', 'SF', 'Square Feet'));
    minSF = range.min;
    maxSF = range.max;
  }
  const ti = parseTI(get('$ TI / SF', 'TI', 'TI/SF', 'TI Allowance'));
  const existingId = cleanString(get('ID'));
  const parsed = {
    id: existingId ?? crypto.randomUUID(),
    dealName,
    spaceId: cleanString(get('Space ID')),
    building: cleanString(get('Building')),
    dealId: cleanString(get('Project Code', 'Deal ID')),
    minSF,
    maxSF,
    prospectTenant: cleanString(get('Prospect / Tenant', 'Prospect/Tenant', 'Tenant', 'Prospect')),
    brokerRep: cleanString(get('Broker / Rep', 'Broker/Rep', 'Broker', 'Rep')),
    transaction: cleanString(get('Transaction', 'Transaction Type', 'Deal Type')),
    status: parseStatus(get('Status', 'Stage')),
    targetRent: parseNumber(get('Target Rent ($/SF)', 'Target Rent', 'Base Rent PSF')),
    proposedTermMonths: parseNumber(get('Proposed Term (Months)', 'Proposed Term', 'Term', 'Term Months')),
    freeRentMonths: parseNumber(get('Free Rent (Months)', 'Free Rent', 'Free Rent Months')),
    tiPerSF: ti.num,
    tiNote: ti.note,
    probabilityPct: parsePercent(get('Probability of Lease %', 'Probability', 'Probability %')),
    expectedStart: parseDate(get('Expected Start', 'Lease Start Date', 'Start Date')),
    lastUpdated: parseDate(get('Last Updated', 'Last Modified')),
    priority: parsePriority(get('Priority')),
    currentSummary: cleanString(get('Current Summary', 'Summary')),
    notes: cleanString(get('Notes', 'Comment', 'Comments')),
  };
  const result = DealSchema.safeParse(parsed);
  if (!result.success) {
    console.warn('Skipping unparsable prospects row:', parsed, result.error.format());
    return null;
  }
  return result.data;
};

const parseRentRollRow = (rawRow: RawRow): RentRollRow | null => {
  const get = buildGetter(rawRow);
  const dealName = cleanString(get('Deal Name'));
  const tenant = cleanString(get('Tenant Name', 'Tenant'));
  const spaceId = cleanString(get('Space ID'));
  const dealId = cleanString(get('Project Code', 'Deal ID'));
  const leasableSFRaw = get('Leasable SF', 'SF', 'Square Feet');

  // Skip clearly blank rows.
  if (!dealName && !tenant && !spaceId) return null;

  // Skip placeholder rows where Deal ID is "-" / "0" and there's no real data
  // (e.g. the "- 0 0" rows your template leaves at the bottom).
  const isPlaceholderDealId = dealId === '-' || dealId === '0';
  const isPlaceholderSpaceId = !spaceId || spaceId === '0';
  if (isPlaceholderDealId && isPlaceholderSpaceId && !tenant && !dealName) return null;
  if (!dealName && !tenant && !leasableSFRaw) return null;

  const ti = parseTI(get('$ TI/ TI Allowance', '$ TI / TI Allowance', '$ TI', 'TI Allowance'));
  const existingId = cleanString(get('ID'));

  const parsed = {
    id: existingId ?? crypto.randomUUID(),
    dealId: cleanString(get('Project Code', 'Deal ID')),
    dealName,
    buildingId: cleanString(get('Building ID')),
    spaceId: cleanString(get('Space ID')),
    building: cleanString(get('Building')),
    market: cleanString(get('Market')),
    propertyType: cleanString(get('Property Type')),
    buildingType: cleanString(get('Building Type')),
    tenantName: tenant,
    tenantRating: parseTenantRating(get('Tenant Rating', 'Tenant Rating (1-5)', 'Rating')),
    occupied: parseBool(get('Occupied?', 'Occupied')),
    leasableSF: parseNumber(get('Leasable SF', 'SF', 'Square Feet')),
    leaseStart: parseDate(get('Lease Start')),
    leaseTermMonths: parseNumber(get('Lease Term (Months)', 'Lease Term', 'Term', 'Term Months')),
    leaseEnd: parseDate(get('Lease End')),
    freeRentMonths: parseNumber(get('Free Rent (Months)', 'Free Rent')),
    annualRentBumpsPct: parsePercent(get('Annual Rent Bumps (%)', 'Annual Rent Bumps', 'Rent Bumps')),
    tiPerSF: ti.num,
    tiNote: ti.note,
    specOffice: parseBool(get('Spec Office', 'Spec Office/lighting prior to additional $ TI spend')),
    specTIPerSF: parseNumber(get('Spec TI ($/SF)', 'Spec TI')),
    commissionStructurePct: parsePercent(get('Leasing Commission Structure', 'Commission Structure')),
    commissionDollar: parseNumber(get('Leasing Commission $', 'Commission $')),
    startingAnnualRentPSF: parseNumber(get('Starting Annual Rent ($/SF)', 'Starting Annual Rent')),
    inPlaceRent: parseNumber(get('In-Place Rent')),
    currentSummary: cleanString(get('Current Summary', 'Summary')),
    notes: cleanString(get('Notes')),
  };

  const result = RentRollRowSchema.safeParse(parsed);
  if (!result.success) {
    console.warn('Skipping unparsable rent roll row:', parsed, result.error.format());
    return null;
  }
  return result.data;
};

const parseActivityRow = (rawRow: RawRow): ActivityEntry | null => {
  const get = buildGetter(rawRow);
  const parentId = cleanString(get('Parent ID', 'ParentID'));
  const summary = cleanString(get('Summary'));
  if (!parentId || !summary) return null;
  const type = parseActivityType(get('Type'));
  const parentType = parseParentType(get('Parent Type', 'ParentType'));
  if (!type || !parentType) return null;
  const id = cleanString(get('ID')) ?? crypto.randomUUID();
  const date = parseDate(get('Date')) ?? new Date().toISOString().slice(0, 10);
  const createdAt = parseDate(get('Created At', 'CreatedAt')) ?? new Date().toISOString();

  const parsed = {
    id,
    parentType,
    parentId,
    date,
    type,
    summary,
    link: cleanString(get('Link', 'URL')),
    author: cleanString(get('Author')),
    createdAt,
  };
  const result = ActivityEntrySchema.safeParse(parsed);
  if (!result.success) {
    console.warn('Skipping unparsable activity row:', parsed, result.error.format());
    return null;
  }
  return result.data;
};

// Each Onboarding sheet row is one (checklist, item) pair. The grouping
// pass after import collapses them back into OnboardingChecklist[].
interface OnboardingRowParsed {
  checklistId: string;
  rentRollId: string;
  createdAt: string;
  templateVersion: number;
  item: OnboardingItem;
}

const parseOnboardingRow = (rawRow: RawRow): OnboardingRowParsed | null => {
  const get = buildGetter(rawRow);
  const checklistId = cleanString(get('Checklist ID', 'ChecklistID'));
  const rentRollId = cleanString(get('Rent Roll ID', 'RentRollID'));
  const itemId = cleanString(get('Item ID', 'ItemID'));
  if (!checklistId || !rentRollId || !itemId) return null;

  const checked = parseBool(get('Checked'));
  const notes = cleanString(get('Notes'));
  const link = cleanString(get('Link', 'URL'));
  const completedAt = cleanString(get('Completed At', 'CompletedAt'));
  const createdAt = cleanString(get('Created At', 'CreatedAt')) ?? new Date().toISOString();
  const tvRaw = parseNumber(get('Template Version', 'TemplateVersion'));
  const templateVersion = tvRaw === null ? 1 : Math.max(1, Math.round(tvRaw));

  return {
    checklistId,
    rentRollId,
    createdAt,
    templateVersion,
    item: {
      itemId,
      checked,
      notes,
      link,
      completedAt,
    },
  };
};

// ──────────────────────────────────────────────────────────────────
// New entity parsers
// ──────────────────────────────────────────────────────────────────

const parseScenarioRow = (rawRow: RawRow): Scenario | null => {
  const get = buildGetter(rawRow);
  const id = cleanString(get('ID')) ?? crypto.randomUUID();
  const dealId = cleanString(get('Project Code', 'Deal ID', 'DealID'));
  const name = cleanString(get('Name'));
  if (!dealId || !name) return null;
  const now = new Date().toISOString();
  const parsed = {
    id,
    dealId,
    name,
    inputs: parseJsonField(get('Inputs', 'Inputs (JSON)'), {}),
    globals: parseJsonField(get('Globals', 'Globals (JSON)'), {}),
    results: parseJsonField(get('Results', 'Results (JSON)'), null),
    createdAt: cleanString(get('Created At', 'CreatedAt')) ?? now,
    updatedAt: cleanString(get('Updated At', 'UpdatedAt')) ?? now,
  };
  const result = ScenarioSchema.safeParse(parsed);
  if (!result.success) {
    console.warn('Skipping unparsable scenario row:', parsed, result.error.format());
    return null;
  }
  return result.data;
};

const parseBuildingRow = (rawRow: RawRow): Building | null => {
  const get = buildGetter(rawRow);
  const id = cleanString(get('ID')) ?? crypto.randomUUID();
  const projectId = cleanString(get('Project ID', 'ProjectID'));
  if (!projectId) return null;
  const heightFt = parseNumber(get('Height (ft)', 'Height Ft', 'HeightFt'));
  if (heightFt === null || heightFt <= 0) return null;
  const now = new Date().toISOString();
  const parsed = {
    id,
    projectId,
    name: cleanString(get('Name')) ?? 'Building',
    footprint: parseJsonField(get('Footprint', 'Footprint (JSON)'), null),
    heightFt,
    color: cleanString(get('Color')),
    bayCount: parseNumber(get('Bay Count', 'BayCount')) ?? 1,
    frontageSide: parseEnumCI(get('Frontage Side', 'FrontageSide'), FrontageSideEnum.options),
    widthFt: parseNumber(get('Width (ft)', 'Width Ft', 'WidthFt')),
    depthFt: parseNumber(get('Depth (ft)', 'Depth Ft', 'DepthFt')),
    rotationDeg: parseNumber(get('Rotation (deg)', 'Rotation Deg', 'RotationDeg')) ?? 0,
    centerLat: parseNumber(get('Center Lat', 'CenterLat')),
    centerLng: parseNumber(get('Center Lng', 'CenterLng')),
    bumpOuts: parseJsonField(get('Bump Outs', 'Bump Outs (JSON)', 'BumpOuts'), []),
    baySpaceIds: parseJsonField(get('Bay Space IDs', 'Bay Space IDs (JSON)', 'BaySpaceIds'), []),
    buildingOrdinal: parseNumber(get('Building Ordinal', 'BuildingOrdinal')),
    createdAt: cleanString(get('Created At', 'CreatedAt')) ?? now,
    updatedAt: cleanString(get('Updated At', 'UpdatedAt')) ?? now,
  };
  const result = BuildingSchema.safeParse(parsed);
  if (!result.success) {
    console.warn('Skipping unparsable building row:', parsed, result.error.format());
    return null;
  }
  return result.data;
};

const parseDevProjectRow = (rawRow: RawRow): DevelopmentProject | null => {
  const get = buildGetter(rawRow);
  const id = cleanString(get('ID')) ?? crypto.randomUUID();
  const projectName = cleanString(get('Project Name', 'ProjectName'));
  if (!projectName) return null;
  const phase = parseEnumCI(get('Phase'), DevPhaseEnum.options);
  if (!phase) return null;
  const riskLevel = parseEnumCI(get('Risk Level', 'RiskLevel'), RiskLevelEnum.options) ?? 'Low';
  const now = new Date().toISOString();
  const parsed = {
    id,
    projectName,
    market: cleanString(get('Market')),
    address: cleanString(get('Address')),
    phase,
    totalSF: parseNumber(get('Total SF', 'TotalSF')),
    acres: parseNumber(get('Acres')),
    buildingCount: parseNumber(get('Building Count', 'BuildingCount')),
    startDate: parseDate(get('Start Date', 'StartDate')),
    expectedDeliveryDate: parseDate(get('Expected Delivery', 'Expected Delivery Date', 'ExpectedDeliveryDate')),
    actualDeliveryDate: parseDate(get('Actual Delivery', 'Actual Delivery Date', 'ActualDeliveryDate')),
    totalBudget: parseNumber(get('Total Budget', 'TotalBudget')),
    spentToDate: parseNumber(get('Spent to Date', 'SpentToDate')),
    pmName: cleanString(get('PM', 'PM Name', 'PmName')),
    gcName: cleanString(get('GC', 'GC Name', 'GcName')),
    gcContact: cleanString(get('GC Contact', 'GcContact')),
    architect: cleanString(get('Architect')),
    riskLevel,
    statusSummary: cleanString(get('Status Summary', 'StatusSummary')),
    lat: parseNumber(get('Lat')),
    lng: parseNumber(get('Lng')),
    notes: cleanString(get('Notes')),
    createdAt: cleanString(get('Created At', 'CreatedAt')) ?? now,
    updatedAt: cleanString(get('Updated At', 'UpdatedAt')) ?? now,
  };
  const result = DevelopmentProjectSchema.safeParse(parsed);
  if (!result.success) {
    console.warn('Skipping unparsable dev project row:', parsed, result.error.format());
    return null;
  }
  return result.data;
};

const parsePropertyTaxAppealRow = (rawRow: RawRow): PropertyTaxAppeal | null => {
  const get = buildGetter(rawRow);
  const id = cleanString(get('ID')) ?? crypto.randomUUID();
  const taxYear = parseNumber(get('Tax Year', 'TaxYear'));
  if (taxYear === null) return null;
  const status = parseEnumCI(get('Status'), PropertyTaxAppealStatusEnum.options);
  if (!status) return null;
  const feePctRaw = parsePercent(get('Fee %', 'Fee Pct', 'Consultant Fee Pct', 'ConsultantFeePct'));
  const consultantFeePct = feePctRaw !== null ? feePctRaw / 100 : null;
  const now = new Date().toISOString();
  const parsed = {
    id,
    buildingId: cleanString(get('Building ID', 'BuildingID')),
    building: cleanString(get('Building')),
    parcelNumber: cleanString(get('Parcel Number', 'ParcelNumber')),
    jurisdiction: cleanString(get('Jurisdiction')),
    taxYear: Math.round(taxYear),
    assessedValue: parseNumber(get('Assessed Value', 'AssessedValue')),
    proposedValue: parseNumber(get('Proposed Value', 'ProposedValue')),
    marketValue: parseNumber(get('Market Value', 'MarketValue')),
    status,
    filedDate: parseDate(get('Filed Date', 'FiledDate')),
    hearingDate: parseDate(get('Hearing Date', 'HearingDate')),
    resolutionDate: parseDate(get('Resolution Date', 'ResolutionDate')),
    initialAssessedValue: parseNumber(get('Initial Assessed', 'Initial Assessed Value', 'InitialAssessedValue')),
    finalAssessedValue: parseNumber(get('Final Assessed', 'Final Assessed Value', 'FinalAssessedValue')),
    estimatedSavings: parseNumber(get('Est. Savings', 'Estimated Savings', 'EstimatedSavings')),
    consultantName: cleanString(get('Consultant', 'Consultant Name', 'ConsultantName')),
    consultantFeePct,
    consultantFeeDollar: parseNumber(get('Fee $', 'Fee Dollar', 'Consultant Fee Dollar', 'ConsultantFeeDollar')),
    notes: cleanString(get('Notes')),
    createdAt: cleanString(get('Created At', 'CreatedAt')) ?? now,
    updatedAt: cleanString(get('Updated At', 'UpdatedAt')) ?? now,
  };
  const result = PropertyTaxAppealSchema.safeParse(parsed);
  if (!result.success) {
    console.warn('Skipping unparsable tax appeal row:', parsed, result.error.format());
    return null;
  }
  return result.data;
};

const parseLeaseCompRow = (rawRow: RawRow): LeaseComp | null => {
  const get = buildGetter(rawRow);
  const id = cleanString(get('ID')) ?? crypto.randomUUID();
  const confidence = parseEnumCI(get('Confidence'), CompConfidenceEnum.options) ?? 'Medium';
  const escRaw = parsePercent(get('Escalation %', 'Escalation Pct', 'EscalationPct'));
  const escalationPct = escRaw !== null ? escRaw / 100 : null;
  const now = new Date().toISOString();
  const parsed = {
    id,
    propertyName: cleanString(get('Property Name', 'PropertyName')),
    buildingAddress: cleanString(get('Address', 'Building Address', 'BuildingAddress')),
    market: cleanString(get('Market')),
    propertyType: cleanString(get('Property Type', 'PropertyType')),
    buildingType: cleanString(get('Building Type', 'BuildingType')),
    tenantName: cleanString(get('Tenant', 'Tenant Name', 'TenantName')),
    tenantIndustry: cleanString(get('Industry', 'Tenant Industry', 'TenantIndustry')),
    transactionType: parseEnumCI(get('Transaction Type', 'TransactionType'), TransactionTypeEnum.options),
    signedDate: parseDate(get('Signed Date', 'SignedDate')),
    deliveryDate: parseDate(get('Delivery Date', 'DeliveryDate')),
    leaseSF: parseNumber(get('Lease SF', 'LeaseSF')),
    buildingSF: parseNumber(get('Building SF', 'BuildingSF')),
    baseRentPSF: parseNumber(get('Base Rent ($/SF)', 'Base Rent PSF', 'BaseRentPSF')),
    effectiveRentPSF: parseNumber(get('Effective Rent ($/SF)', 'Effective Rent PSF', 'EffectiveRentPSF')),
    rentType: parseEnumCI(get('Rent Type', 'RentType'), RentTypeEnum.options),
    termMonths: parseNumber(get('Term (Months)', 'Term Months', 'TermMonths')),
    freeRentMonths: parseNumber(get('Free Rent (Months)', 'Free Rent Months', 'FreeRentMonths')),
    tiPSF: parseNumber(get('TI ($/SF)', 'TI PSF', 'TiPSF')),
    escalationPct,
    options: cleanString(get('Options')),
    source: cleanString(get('Source')),
    sourceUrl: cleanString(get('Source URL', 'SourceUrl', 'SourceURL')),
    confidence,
    confidential: parseBool(get('Confidential')),
    notes: cleanString(get('Notes')),
    createdAt: cleanString(get('Created At', 'CreatedAt')) ?? now,
    updatedAt: cleanString(get('Updated At', 'UpdatedAt')) ?? now,
  };
  const result = LeaseCompSchema.safeParse(parsed);
  if (!result.success) {
    console.warn('Skipping unparsable lease comp row:', parsed, result.error.format());
    return null;
  }
  return result.data;
};

const parseSalesCompRow = (rawRow: RawRow): SalesComp | null => {
  const get = buildGetter(rawRow);
  const id = cleanString(get('ID')) ?? crypto.randomUUID();
  const confidence = parseEnumCI(get('Confidence'), CompConfidenceEnum.options) ?? 'Medium';
  const capRateRaw = parsePercent(get('Cap Rate', 'Cap Rate %', 'CapRate'));
  const capRate = capRateRaw !== null ? capRateRaw / 100 : null;
  const occRaw = parsePercent(get('Occupancy %', 'Occupancy', 'OccupancyPct'));
  const occupancyPct = occRaw !== null ? occRaw / 100 : null;
  const now = new Date().toISOString();
  const parsed = {
    id,
    propertyName: cleanString(get('Property Name', 'PropertyName')),
    buildingAddress: cleanString(get('Address', 'Building Address', 'BuildingAddress')),
    market: cleanString(get('Market')),
    propertyType: cleanString(get('Property Type', 'PropertyType')),
    buildingType: cleanString(get('Building Type', 'BuildingType')),
    saleDate: parseDate(get('Sale Date', 'SaleDate')),
    salePrice: parseNumber(get('Sale Price', 'SalePrice')),
    pricePSF: parseNumber(get('Price ($/SF)', 'Price PSF', 'PricePSF')),
    capRate,
    noi: parseNumber(get('NOI')),
    buildingSF: parseNumber(get('Building SF', 'BuildingSF')),
    landAcres: parseNumber(get('Land (Acres)', 'Land Acres', 'LandAcres')),
    yearBuilt: parseNumber(get('Year Built', 'YearBuilt')),
    occupancyPct,
    buyer: cleanString(get('Buyer')),
    seller: cleanString(get('Seller')),
    source: cleanString(get('Source')),
    sourceUrl: cleanString(get('Source URL', 'SourceUrl', 'SourceURL')),
    confidence,
    confidential: parseBool(get('Confidential')),
    notes: cleanString(get('Notes')),
    createdAt: cleanString(get('Created At', 'CreatedAt')) ?? now,
    updatedAt: cleanString(get('Updated At', 'UpdatedAt')) ?? now,
  };
  const result = SalesCompSchema.safeParse(parsed);
  if (!result.success) {
    console.warn('Skipping unparsable sales comp row:', parsed, result.error.format());
    return null;
  }
  return result.data;
};

const parseAMPendingItemRow = (rawRow: RawRow): AMPendingItem | null => {
  const get = buildGetter(rawRow);
  const id = cleanString(get('ID')) ?? crypto.randomUUID();
  const itemType = parseEnumCI(get('Item Type', 'ItemType'), AMItemTypeEnum.options);
  const title = cleanString(get('Title'));
  if (!itemType || !title) return null;
  const status = parseEnumCI(get('Status'), AMStatusEnum.options) ?? 'Open';
  const priority = parsePriority(get('Priority'));
  const cadence = parseEnumCI(get('Cadence'), AMCadenceEnum.options) ?? 'One-Time';
  const now = new Date().toISOString();
  const parsed = {
    id,
    itemType,
    title,
    description: cleanString(get('Description')),
    buildingId: cleanString(get('Building ID', 'BuildingID')),
    buildingName: cleanString(get('Building', 'Building Name', 'BuildingName')),
    dealId: cleanString(get('Project Code', 'Deal ID', 'DealID')),
    dealName: cleanString(get('Project', 'Deal', 'Deal Name', 'DealName')),
    owner: cleanString(get('Owner')),
    status,
    priority,
    dueDate: parseDate(get('Due Date', 'DueDate')),
    completedDate: parseDate(get('Completed Date', 'CompletedDate')),
    source: cleanString(get('Source')),
    link: cleanString(get('Link', 'URL')),
    cadence,
    sentToTab: cleanString(get('Sent To Tab', 'SentToTab')),
    sentToId: cleanString(get('Sent To ID', 'SentToId', 'SentToID')),
    notes: cleanString(get('Notes')),
    createdAt: cleanString(get('Created At', 'CreatedAt')) ?? now,
    updatedAt: cleanString(get('Updated At', 'UpdatedAt')) ?? now,
  };
  const result = AMPendingItemSchema.safeParse(parsed);
  if (!result.success) {
    console.warn('Skipping unparsable AM pending item row:', parsed, result.error.format());
    return null;
  }
  return result.data;
};

const parseContactRow = (rawRow: RawRow): Contact | null => {
  const get = buildGetter(rawRow);
  const id = cleanString(get('ID')) ?? crypto.randomUUID();
  const contactType = parseEnumCI(get('Contact Type', 'ContactType'), ContactTypeEnum.options);
  if (!contactType) return null;
  const now = new Date().toISOString();

  const phones: ContactChannel[] = [];
  const primaryPhone = cleanString(get('Primary Phone'));
  if (primaryPhone) phones.push({ label: 'work', value: primaryPhone, isPrimary: true });
  const otherPhones = cleanString(get('Other Phones'));
  if (otherPhones) {
    otherPhones.split(';').map(p => p.trim()).filter(Boolean).forEach(p => {
      phones.push({ label: 'other', value: p, isPrimary: false });
    });
  }

  const emails: ContactChannel[] = [];
  const primaryEmail = cleanString(get('Primary Email'));
  if (primaryEmail) emails.push({ label: 'work', value: primaryEmail, isPrimary: true });
  const otherEmails = cleanString(get('Other Emails'));
  if (otherEmails) {
    otherEmails.split(';').map(e => e.trim()).filter(Boolean).forEach(e => {
      emails.push({ label: 'other', value: e, isPrimary: false });
    });
  }

  const parsed = {
    id,
    contactType,
    firstName: cleanString(get('First Name', 'FirstName')),
    lastName: cleanString(get('Last Name', 'LastName')),
    companyName: cleanString(get('Company', 'Company Name', 'CompanyName')),
    title: cleanString(get('Title')),
    phones,
    emails,
    notes: cleanString(get('Notes')),
    createdAt: cleanString(get('Created At', 'CreatedAt')) ?? now,
    updatedAt: cleanString(get('Updated At', 'UpdatedAt')) ?? now,
  };
  const result = ContactSchema.safeParse(parsed);
  if (!result.success) {
    console.warn('Skipping unparsable contact row:', parsed, result.error.format());
    return null;
  }
  return result.data;
};

const parseDevProjectContactRow = (rawRow: RawRow): DevProjectContact | null => {
  const get = buildGetter(rawRow);
  const id = cleanString(get('ID')) ?? crypto.randomUUID();
  const devProjectId = cleanString(get('Dev Project ID', 'DevProjectID', 'DevProjectId'));
  const contactId = cleanString(get('Contact ID', 'ContactID', 'ContactId'));
  if (!devProjectId || !contactId) return null;
  const now = new Date().toISOString();
  const parsed = {
    id,
    devProjectId,
    contactId,
    roleOverride: parseEnumCI(get('Role Override', 'RoleOverride'), ContactTypeEnum.options),
    isPrimary: parseBool(get('Is Primary', 'IsPrimary')),
    linkNotes: cleanString(get('Link Notes', 'LinkNotes')),
    createdAt: cleanString(get('Created At', 'CreatedAt')) ?? now,
    updatedAt: cleanString(get('Updated At', 'UpdatedAt')) ?? now,
  };
  const result = DevProjectContactSchema.safeParse(parsed);
  if (!result.success) {
    console.warn('Skipping unparsable dev project contact row:', parsed, result.error.format());
    return null;
  }
  return result.data;
};

const parseDevProjectNoteRow = (rawRow: RawRow): DevProjectNote | null => {
  const get = buildGetter(rawRow);
  const id = cleanString(get('ID')) ?? crypto.randomUUID();
  const devProjectId = cleanString(get('Dev Project ID', 'DevProjectID', 'DevProjectId'));
  const content = cleanString(get('Content'));
  if (!devProjectId || !content) return null;
  const noteType = parseEnumCI(get('Note Type', 'NoteType'), DevNoteTypeEnum.options) ?? 'General';
  const now = new Date().toISOString();
  const parsed = {
    id,
    devProjectId,
    noteType,
    eventDate: parseDate(get('Event Date', 'EventDate')),
    content,
    author: cleanString(get('Author')),
    link: cleanString(get('Link', 'URL')),
    createdAt: cleanString(get('Created At', 'CreatedAt')) ?? now,
    updatedAt: cleanString(get('Updated At', 'UpdatedAt')) ?? now,
  };
  const result = DevProjectNoteSchema.safeParse(parsed);
  if (!result.success) {
    console.warn('Skipping unparsable dev project note row:', parsed, result.error.format());
    return null;
  }
  return result.data;
};

const parseAcquisitionTargetRow = (rawRow: RawRow): AcquisitionTarget | null => {
  const get = buildGetter(rawRow);
  const id = cleanString(get('ID')) ?? crypto.randomUUID();
  const targetName = cleanString(get('Target Name', 'TargetName'));
  if (!targetName) return null;
  const status = parseEnumCI(get('Status'), AcquisitionStatusEnum.options);
  if (!status) return null;
  const riskLevel = parseEnumCI(get('Risk Level', 'RiskLevel'), RiskLevelEnum.options) ?? 'Low';
  const irrRaw = parsePercent(get('Underwritten IRR', 'UnderwrittenIRR'));
  const underwrittenIRR = irrRaw !== null ? irrRaw / 100 : null;
  const now = new Date().toISOString();
  const parsed = {
    id,
    targetName,
    market: cleanString(get('Market')),
    address: cleanString(get('Address')),
    propertyType: cleanString(get('Property Type', 'PropertyType')),
    status,
    acres: parseNumber(get('Acres')),
    buildingCount: parseNumber(get('Building Count', 'BuildingCount')),
    totalSF: parseNumber(get('Total SF', 'TotalSF')),
    askingPrice: parseNumber(get('Asking Price', 'AskingPrice')),
    ourOffer: parseNumber(get('Our Offer', 'OurOffer')),
    earnestMoney: parseNumber(get('Earnest Money', 'EarnestMoney')),
    closingCostsEstimate: parseNumber(get('Closing Costs Estimate', 'ClosingCostsEstimate')),
    rehabBudget: parseNumber(get('Rehab Budget', 'RehabBudget')),
    underwrittenIRR,
    underwrittenEquityMultiple: parseNumber(get('Underwritten Equity Multiple', 'UnderwrittenEquityMultiple', 'Equity Multiple')),
    firstContactedDate: parseDate(get('First Contacted', 'First Contacted Date', 'FirstContactedDate')),
    loiDate: parseDate(get('LOI Date', 'LoiDate')),
    psaDate: parseDate(get('PSA Date', 'PsaDate')),
    expectedClosingDate: parseDate(get('Expected Closing', 'Expected Closing Date', 'ExpectedClosingDate')),
    actualClosingDate: parseDate(get('Actual Closing', 'Actual Closing Date', 'ActualClosingDate')),
    diligenceStatus: parseJsonField(get('Diligence Status', 'Diligence Status (JSON)', 'DiligenceStatus'), {}),
    riskLevel,
    statusSummary: cleanString(get('Status Summary', 'StatusSummary')),
    lat: parseNumber(get('Lat')),
    lng: parseNumber(get('Lng')),
    notes: cleanString(get('Notes')),
    createdAt: cleanString(get('Created At', 'CreatedAt')) ?? now,
    updatedAt: cleanString(get('Updated At', 'UpdatedAt')) ?? now,
  };
  const result = AcquisitionTargetSchema.safeParse(parsed);
  if (!result.success) {
    console.warn('Skipping unparsable acquisition target row:', parsed, result.error.format());
    return null;
  }
  return result.data;
};

const parseAcquisitionTargetContactRow = (rawRow: RawRow): AcquisitionTargetContact | null => {
  const get = buildGetter(rawRow);
  const id = cleanString(get('ID')) ?? crypto.randomUUID();
  const acquisitionTargetId = cleanString(get('Acquisition Target ID', 'AcquisitionTargetID', 'AcquisitionTargetId'));
  const contactId = cleanString(get('Contact ID', 'ContactID', 'ContactId'));
  if (!acquisitionTargetId || !contactId) return null;
  const now = new Date().toISOString();
  const parsed = {
    id,
    acquisitionTargetId,
    contactId,
    roleOverride: parseEnumCI(get('Role Override', 'RoleOverride'), ContactTypeEnum.options),
    isPrimary: parseBool(get('Is Primary', 'IsPrimary')),
    linkNotes: cleanString(get('Link Notes', 'LinkNotes')),
    createdAt: cleanString(get('Created At', 'CreatedAt')) ?? now,
    updatedAt: cleanString(get('Updated At', 'UpdatedAt')) ?? now,
  };
  const result = AcquisitionTargetContactSchema.safeParse(parsed);
  if (!result.success) {
    console.warn('Skipping unparsable acq target contact row:', parsed, result.error.format());
    return null;
  }
  return result.data;
};

const parseAcquisitionTargetNoteRow = (rawRow: RawRow): AcquisitionTargetNote | null => {
  const get = buildGetter(rawRow);
  const id = cleanString(get('ID')) ?? crypto.randomUUID();
  const acquisitionTargetId = cleanString(get('Acquisition Target ID', 'AcquisitionTargetID', 'AcquisitionTargetId'));
  const content = cleanString(get('Content'));
  if (!acquisitionTargetId || !content) return null;
  const noteType = parseEnumCI(get('Note Type', 'NoteType'), DevNoteTypeEnum.options) ?? 'General';
  const now = new Date().toISOString();
  const parsed = {
    id,
    acquisitionTargetId,
    noteType,
    eventDate: parseDate(get('Event Date', 'EventDate')),
    content,
    author: cleanString(get('Author')),
    link: cleanString(get('Link', 'URL')),
    createdAt: cleanString(get('Created At', 'CreatedAt')) ?? now,
    updatedAt: cleanString(get('Updated At', 'UpdatedAt')) ?? now,
  };
  const result = AcquisitionTargetNoteSchema.safeParse(parsed);
  if (!result.success) {
    console.warn('Skipping unparsable acq target note row:', parsed, result.error.format());
    return null;
  }
  return result.data;
};

const parseDispositionListingRow = (rawRow: RawRow): DispositionListing | null => {
  const get = buildGetter(rawRow);
  const id = cleanString(get('ID')) ?? crypto.randomUUID();
  const assetName = cleanString(get('Asset Name', 'AssetName'));
  if (!assetName) return null;
  const status = parseEnumCI(get('Status'), DispositionStatusEnum.options);
  if (!status) return null;
  const riskLevel = parseEnumCI(get('Risk Level', 'RiskLevel'), RiskLevelEnum.options) ?? 'Low';

  const occRaw = parsePercent(get('Occupancy %', 'Occupancy Pct', 'OccupancyPct'));
  const occupancyPct = occRaw !== null ? occRaw / 100 : null;
  const listCapRaw = parsePercent(get('List Cap %', 'List Cap Pct', 'ListCapPct'));
  const listCapPct = listCapRaw !== null ? listCapRaw / 100 : null;
  const achCapRaw = parsePercent(get('Achieved Cap %', 'Achieved Cap Pct', 'AchievedCapPct'));
  const achievedCapPct = achCapRaw !== null ? achCapRaw / 100 : null;
  const brokerCommRaw = parsePercent(get('Broker Commission %', 'Broker Commission Pct', 'BrokerCommissionPct'));
  const brokerCommissionPct = brokerCommRaw !== null ? brokerCommRaw / 100 : null;

  const now = new Date().toISOString();
  const parsed = {
    id,
    assetName,
    buildingId: cleanString(get('Building ID', 'BuildingID')),
    market: cleanString(get('Market')),
    address: cleanString(get('Address')),
    propertyType: cleanString(get('Property Type', 'PropertyType')),
    status,
    totalSF: parseNumber(get('Total SF', 'TotalSF')),
    acres: parseNumber(get('Acres')),
    occupancyPct,
    trailingNOI: parseNumber(get('Trailing NOI', 'TrailingNOI')),
    forwardNOI: parseNumber(get('Forward NOI', 'ForwardNOI')),
    listPrice: parseNumber(get('List Price', 'ListPrice')),
    listCapPct,
    achievedPrice: parseNumber(get('Achieved Price', 'AchievedPrice')),
    achievedCapPct,
    netProceeds: parseNumber(get('Net Proceeds', 'NetProceeds')),
    brokerCommissionPct,
    listDate: parseDate(get('List Date', 'ListDate')),
    bidsDueDate: parseDate(get('Bids Due Date', 'BidsDueDate')),
    loiExecutedDate: parseDate(get('LOI Executed Date', 'LoiExecutedDate')),
    psaExecutedDate: parseDate(get('PSA Executed Date', 'PsaExecutedDate')),
    expectedClosingDate: parseDate(get('Expected Closing', 'Expected Closing Date', 'ExpectedClosingDate')),
    actualClosingDate: parseDate(get('Actual Closing', 'Actual Closing Date', 'ActualClosingDate')),
    riskLevel,
    statusSummary: cleanString(get('Status Summary', 'StatusSummary')),
    lat: parseNumber(get('Lat')),
    lng: parseNumber(get('Lng')),
    notes: cleanString(get('Notes')),
    createdAt: cleanString(get('Created At', 'CreatedAt')) ?? now,
    updatedAt: cleanString(get('Updated At', 'UpdatedAt')) ?? now,
  };
  const result = DispositionListingSchema.safeParse(parsed);
  if (!result.success) {
    console.warn('Skipping unparsable disposition listing row:', parsed, result.error.format());
    return null;
  }
  return result.data;
};

const parseDispositionListingContactRow = (rawRow: RawRow): DispositionListingContact | null => {
  const get = buildGetter(rawRow);
  const id = cleanString(get('ID')) ?? crypto.randomUUID();
  const dispositionListingId = cleanString(get('Disposition Listing ID', 'DispositionListingID', 'DispositionListingId'));
  const contactId = cleanString(get('Contact ID', 'ContactID', 'ContactId'));
  if (!dispositionListingId || !contactId) return null;
  const now = new Date().toISOString();
  const parsed = {
    id,
    dispositionListingId,
    contactId,
    roleOverride: parseEnumCI(get('Role Override', 'RoleOverride'), ContactTypeEnum.options),
    isPrimary: parseBool(get('Is Primary', 'IsPrimary')),
    linkNotes: cleanString(get('Link Notes', 'LinkNotes')),
    createdAt: cleanString(get('Created At', 'CreatedAt')) ?? now,
    updatedAt: cleanString(get('Updated At', 'UpdatedAt')) ?? now,
  };
  const result = DispositionListingContactSchema.safeParse(parsed);
  if (!result.success) {
    console.warn('Skipping unparsable dispo contact row:', parsed, result.error.format());
    return null;
  }
  return result.data;
};

const parseDispositionListingNoteRow = (rawRow: RawRow): DispositionListingNote | null => {
  const get = buildGetter(rawRow);
  const id = cleanString(get('ID')) ?? crypto.randomUUID();
  const dispositionListingId = cleanString(get('Disposition Listing ID', 'DispositionListingID', 'DispositionListingId'));
  const content = cleanString(get('Content'));
  if (!dispositionListingId || !content) return null;
  const noteType = parseEnumCI(get('Note Type', 'NoteType'), DevNoteTypeEnum.options) ?? 'General';
  const now = new Date().toISOString();
  const parsed = {
    id,
    dispositionListingId,
    noteType,
    eventDate: parseDate(get('Event Date', 'EventDate')),
    content,
    author: cleanString(get('Author')),
    link: cleanString(get('Link', 'URL')),
    createdAt: cleanString(get('Created At', 'CreatedAt')) ?? now,
    updatedAt: cleanString(get('Updated At', 'UpdatedAt')) ?? now,
  };
  const result = DispositionListingNoteSchema.safeParse(parsed);
  if (!result.success) {
    console.warn('Skipping unparsable dispo note row:', parsed, result.error.format());
    return null;
  }
  return result.data;
};

// ──────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────

export interface LoadResult {
  deals: Deal[];
  rentRoll: RentRollRow[];
  activities: ActivityEntry[];
  onboardings: OnboardingChecklist[];
  scenarios: Scenario[];
  buildings: Building[];
  devProjects: DevelopmentProject[];
  propertyTaxAppeals: PropertyTaxAppeal[];
  leaseComps: LeaseComp[];
  salesComps: SalesComp[];
  amPendingItems: AMPendingItem[];
  contacts: Contact[];
  devProjectContacts: DevProjectContact[];
  devProjectNotes: DevProjectNote[];
  acquisitionTargets: AcquisitionTarget[];
  acquisitionTargetContacts: AcquisitionTargetContact[];
  acquisitionTargetNotes: AcquisitionTargetNote[];
  dispositionListings: DispositionListing[];
  dispositionListingContacts: DispositionListingContact[];
  dispositionListingNotes: DispositionListingNote[];
}

export type FullDataSet = LoadResult;

export function emptyDataSet(): FullDataSet {
  return {
    deals: [],
    rentRoll: [],
    activities: [],
    onboardings: [],
    scenarios: [],
    buildings: [],
    devProjects: [],
    propertyTaxAppeals: [],
    leaseComps: [],
    salesComps: [],
    amPendingItems: [],
    contacts: [],
    devProjectContacts: [],
    devProjectNotes: [],
    acquisitionTargets: [],
    acquisitionTargetContacts: [],
    acquisitionTargetNotes: [],
    dispositionListings: [],
    dispositionListingContacts: [],
    dispositionListingNotes: [],
  };
}

// Workbook → entities. Pure function — no browser APIs — so the seed
// script can reuse it Node-side. `loadFromFile` is the browser-facing
// wrapper that handles the FileReader → ArrayBuffer step.
export function loadFromWorkbook(workbook: XLSX.WorkBook): LoadResult {
  let deals: Deal[] = [];
  let rentRoll: RentRollRow[] = [];
  let activities: ActivityEntry[] = [];
  const onboardingRows: OnboardingRowParsed[] = [];
  let scenarios: Scenario[] = [];
  let buildings: Building[] = [];
  let devProjects: DevelopmentProject[] = [];
  let propertyTaxAppeals: PropertyTaxAppeal[] = [];
  let leaseComps: LeaseComp[] = [];
  let salesComps: SalesComp[] = [];
  let amPendingItems: AMPendingItem[] = [];
  let contacts: Contact[] = [];
  let devProjectContacts: DevProjectContact[] = [];
  let devProjectNotes: DevProjectNote[] = [];
  let acquisitionTargets: AcquisitionTarget[] = [];
  let acquisitionTargetContacts: AcquisitionTargetContact[] = [];
  let acquisitionTargetNotes: AcquisitionTargetNote[] = [];
  let dispositionListings: DispositionListing[] = [];
  let dispositionListingContacts: DispositionListingContact[] = [];
  let dispositionListingNotes: DispositionListingNote[] = [];

  for (const name of workbook.SheetNames) {
    const ws = workbook.Sheets[name];
    if (!ws) continue;
    const { rowIdx, type } = findHeaderRow(ws);
    if (type === 'unknown') continue;
    const rows = sheetToJsonFromRow(ws, rowIdx);

    if (type === 'rentroll') {
      rentRoll = rentRoll.concat(
        rows.map(parseRentRollRow).filter((r): r is RentRollRow => r !== null)
      );
    } else if (type === 'prospects') {
      deals = deals.concat(
        rows.map(parseProspectsRow).filter((d): d is Deal => d !== null)
      );
    } else if (type === 'activity') {
      activities = activities.concat(
        rows.map(parseActivityRow).filter((a): a is ActivityEntry => a !== null)
      );
    } else if (type === 'onboarding') {
      for (const raw of rows) {
        const parsed = parseOnboardingRow(raw);
        if (parsed) onboardingRows.push(parsed);
      }
    } else if (type === 'scenario') {
      scenarios = scenarios.concat(
        rows.map(parseScenarioRow).filter((r): r is Scenario => r !== null)
      );
    } else if (type === 'building') {
      buildings = buildings.concat(
        rows.map(parseBuildingRow).filter((r): r is Building => r !== null)
      );
    } else if (type === 'devproject') {
      devProjects = devProjects.concat(
        rows.map(parseDevProjectRow).filter((r): r is DevelopmentProject => r !== null)
      );
    } else if (type === 'taxappeal') {
      propertyTaxAppeals = propertyTaxAppeals.concat(
        rows.map(parsePropertyTaxAppealRow).filter((r): r is PropertyTaxAppeal => r !== null)
      );
    } else if (type === 'leasecomp') {
      leaseComps = leaseComps.concat(
        rows.map(parseLeaseCompRow).filter((r): r is LeaseComp => r !== null)
      );
    } else if (type === 'salescomp') {
      salesComps = salesComps.concat(
        rows.map(parseSalesCompRow).filter((r): r is SalesComp => r !== null)
      );
    } else if (type === 'ampending') {
      amPendingItems = amPendingItems.concat(
        rows.map(parseAMPendingItemRow).filter((r): r is AMPendingItem => r !== null)
      );
    } else if (type === 'contact') {
      contacts = contacts.concat(
        rows.map(parseContactRow).filter((r): r is Contact => r !== null)
      );
    } else if (type === 'devprojectcontact') {
      devProjectContacts = devProjectContacts.concat(
        rows.map(parseDevProjectContactRow).filter((r): r is DevProjectContact => r !== null)
      );
    } else if (type === 'devprojectnote') {
      devProjectNotes = devProjectNotes.concat(
        rows.map(parseDevProjectNoteRow).filter((r): r is DevProjectNote => r !== null)
      );
    } else if (type === 'acqtarget') {
      acquisitionTargets = acquisitionTargets.concat(
        rows.map(parseAcquisitionTargetRow).filter((r): r is AcquisitionTarget => r !== null)
      );
    } else if (type === 'acqcontact') {
      acquisitionTargetContacts = acquisitionTargetContacts.concat(
        rows.map(parseAcquisitionTargetContactRow).filter((r): r is AcquisitionTargetContact => r !== null)
      );
    } else if (type === 'acqnote') {
      acquisitionTargetNotes = acquisitionTargetNotes.concat(
        rows.map(parseAcquisitionTargetNoteRow).filter((r): r is AcquisitionTargetNote => r !== null)
      );
    } else if (type === 'dispo') {
      dispositionListings = dispositionListings.concat(
        rows.map(parseDispositionListingRow).filter((r): r is DispositionListing => r !== null)
      );
    } else if (type === 'dispocontact') {
      dispositionListingContacts = dispositionListingContacts.concat(
        rows.map(parseDispositionListingContactRow).filter((r): r is DispositionListingContact => r !== null)
      );
    } else if (type === 'disponote') {
      dispositionListingNotes = dispositionListingNotes.concat(
        rows.map(parseDispositionListingNoteRow).filter((r): r is DispositionListingNote => r !== null)
      );
    }
  }

  // Group onboarding rows back into checklists by Checklist ID, then
  // reconcile with the current template (inject missing items, preserve
  // unknown ones).
  const byChecklist = new Map<string, OnboardingRowParsed[]>();
  for (const r of onboardingRows) {
    const list = byChecklist.get(r.checklistId) ?? [];
    list.push(r);
    byChecklist.set(r.checklistId, list);
  }
  const onboardings: OnboardingChecklist[] = [];
  for (const [checklistId, clRows] of byChecklist) {
    const first = clRows[0];
    const candidate = {
      id: checklistId,
      rentRollId: first.rentRollId,
      createdAt: first.createdAt,
      templateVersion: first.templateVersion,
      items: clRows.map((r) => r.item),
    };
    const result = OnboardingChecklistSchema.safeParse(candidate);
    if (!result.success) {
      console.warn('Skipping unparsable onboarding checklist:', candidate, result.error.format());
      continue;
    }
    onboardings.push(reconcileWithTemplate(result.data));
  }

  return {
    deals,
    rentRoll,
    activities,
    onboardings,
    scenarios,
    buildings,
    devProjects,
    propertyTaxAppeals,
    leaseComps,
    salesComps,
    amPendingItems,
    contacts,
    devProjectContacts,
    devProjectNotes,
    acquisitionTargets,
    acquisitionTargetContacts,
    acquisitionTargetNotes,
    dispositionListings,
    dispositionListingContacts,
    dispositionListingNotes,
  };
}

export async function loadFromFile(file: File): Promise<LoadResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('Failed to read file');
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        resolve(loadFromWorkbook(workbook));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

// ──────────────────────────────────────────────────────────────────
// Export
// ──────────────────────────────────────────────────────────────────

// Use `== null` so the formatters also tolerate `undefined`, not just
// `null`. Schema-additions (e.g. specTIPerSF, uwTiPerSF) leave older
// autosave-restored or shared rows with `undefined` in the new slots —
// without this coercion the export would crash on `.toFixed(2)`.
const formatNum = (n: number | null | undefined, prefix = '', suffix = ''): string =>
  n == null ? '' : `${prefix}${n}${suffix}`;
const formatCurrency = (n: number | null | undefined): string =>
  n == null ? '' : `$${n.toFixed(2)}`;
const formatPercent = (n: number | null | undefined): string =>
  n == null ? '' : `${n}%`;
const formatFractionAsPercent = (n: number | null | undefined): string =>
  n == null ? '' : `${(n * 100).toFixed(2)}%`;
const formatTenantRating = (r: TenantRating | null | undefined): string => r ?? '';

const DATA_DICTIONARY: { Sheet: string; Column: string; 'Data Type': string; Description: string; Example: string }[] = [
  { Sheet: 'Prospects', Column: 'Deal Name', 'Data Type': 'string', Description: 'Name of the deal / property', Example: 'Central Logistics Hub' },
  { Sheet: 'Prospects', Column: 'Status', 'Data Type': 'enum', Description: 'Deal pipeline status', Example: 'LOI Negotiations' },
  { Sheet: 'Prospects', Column: 'Priority', 'Data Type': 'enum', Description: 'High / Medium / Low', Example: 'High' },
  { Sheet: 'Prospects', Column: 'ID', 'Data Type': 'uuid', Description: 'Internal unique identifier', Example: '550e8400-e29b-41d4-a716-446655440000' },
  { Sheet: 'Rent Roll', Column: 'Tenant Name', 'Data Type': 'string', Description: 'Tenant or occupant name', Example: 'Acme Corp' },
  { Sheet: 'Rent Roll', Column: 'Leasable SF', 'Data Type': 'number', Description: 'Leasable square footage', Example: '15000' },
  { Sheet: 'Rent Roll', Column: 'Occupied?', 'Data Type': 'boolean', Description: 'Is space currently occupied?', Example: 'Yes' },
  { Sheet: 'Activity', Column: 'Parent Type', 'Data Type': 'enum', Description: 'deal or rentroll', Example: 'Deal' },
  { Sheet: 'Activity', Column: 'Type', 'Data Type': 'enum', Description: 'note / email-out / email-in / call / meeting / status-change', Example: 'meeting' },
  { Sheet: 'Activity', Column: 'Summary', 'Data Type': 'string', Description: 'Activity description', Example: 'Toured warehouse with tenant' },
  { Sheet: 'Onboarding', Column: 'Checklist ID', 'Data Type': 'uuid', Description: 'Checklist group identifier', Example: '550e8400-...' },
  { Sheet: 'Onboarding', Column: 'Checked', 'Data Type': 'boolean', Description: 'Completion status', Example: 'Yes' },
  { Sheet: 'Scenarios', Column: 'Project Code', 'Data Type': 'string', Description: 'Link to project (legacy: Deal ID)', Example: '5042' },
  { Sheet: 'Scenarios', Column: 'Name', 'Data Type': 'string', Description: 'Scenario name', Example: 'Base Case' },
  { Sheet: 'Scenarios', Column: 'Inputs (JSON)', 'Data Type': 'json', Description: 'Lease calc inputs blob', Example: '{"rent":12,...}' },
  { Sheet: 'Scenarios', Column: 'Globals (JSON)', 'Data Type': 'json', Description: 'Global assumptions blob', Example: '{"discount":0.08}' },
  { Sheet: 'Scenarios', Column: 'Results (JSON)', 'Data Type': 'json', Description: 'Cached calculation results', Example: '{"npv":1234567}' },
  { Sheet: 'Buildings', Column: 'Project ID', 'Data Type': 'string', Description: 'Link to development project', Example: 'PROJ-001' },
  { Sheet: 'Buildings', Column: 'Height (ft)', 'Data Type': 'number', Description: 'Building height in feet', Example: '40' },
  { Sheet: 'Buildings', Column: 'Bay Count', 'Data Type': 'integer', Description: 'Number of bays', Example: '4' },
  { Sheet: 'Buildings', Column: 'Frontage Side', 'Data Type': 'enum', Description: 'N / S / E / W', Example: 'S' },
  { Sheet: 'Buildings', Column: 'Footprint (JSON)', 'Data Type': 'json', Description: 'GeoJSON polygon', Example: '{"type":"Polygon",...}' },
  { Sheet: 'Dev Projects', Column: 'Project Name', 'Data Type': 'string', Description: 'Development project name', Example: 'Parkway Industrial' },
  { Sheet: 'Dev Projects', Column: 'Phase', 'Data Type': 'enum', Description: 'Site Selection / Entitlement / Design / Construction / Lease-Up / Delivered / On Hold / Cancelled', Example: 'Construction' },
  { Sheet: 'Dev Projects', Column: 'Total Budget', 'Data Type': 'currency', Description: 'Project budget', Example: '15000000' },
  { Sheet: 'Dev Projects', Column: 'Risk Level', 'Data Type': 'enum', Description: 'Low / Medium / High', Example: 'Medium' },
  { Sheet: 'Tax Appeals', Column: 'Parcel Number', 'Data Type': 'string', Description: 'Tax parcel identifier', Example: '12-345-678' },
  { Sheet: 'Tax Appeals', Column: 'Tax Year', 'Data Type': 'integer', Description: 'Tax year being appealed (2000-2100)', Example: '2025' },
  { Sheet: 'Tax Appeals', Column: 'Status', 'Data Type': 'enum', Description: 'Considering / Filed / Under Review / Hearing Scheduled / Settled / Withdrawn / Lost', Example: 'Filed' },
  { Sheet: 'Tax Appeals', Column: 'Fee %', 'Data Type': 'percent', Description: 'Consultant fee (displayed %; stored as fraction)', Example: '35%' },
  { Sheet: 'Lease Comps', Column: 'Base Rent ($/SF)', 'Data Type': 'currency', Description: 'Base rent per SF', Example: '$8.50' },
  { Sheet: 'Lease Comps', Column: 'Transaction Type', 'Data Type': 'enum', Description: 'New Lease / Renewal / Sublease / Expansion / Other', Example: 'New Lease' },
  { Sheet: 'Lease Comps', Column: 'Escalation %', 'Data Type': 'percent', Description: 'Annual escalation (displayed %; stored as fraction)', Example: '3%' },
  { Sheet: 'Lease Comps', Column: 'Confidence', 'Data Type': 'enum', Description: 'High / Medium / Low', Example: 'High' },
  { Sheet: 'Sales Comps', Column: 'Sale Price', 'Data Type': 'currency', Description: 'Total sale price', Example: '15000000' },
  { Sheet: 'Sales Comps', Column: 'Price ($/SF)', 'Data Type': 'currency', Description: 'Sale price per SF', Example: '$125.00' },
  { Sheet: 'Sales Comps', Column: 'Cap Rate %', 'Data Type': 'percent', Description: 'Cap rate (displayed %; stored as fraction)', Example: '6.50%' },
  { Sheet: 'Sales Comps', Column: 'NOI', 'Data Type': 'currency', Description: 'Net operating income at time of sale', Example: '975000' },
  { Sheet: 'Sales Comps', Column: 'Occupancy %', 'Data Type': 'percent', Description: 'Occupancy at sale (displayed %; stored as fraction)', Example: '95%' },
  { Sheet: 'Sales Comps', Column: 'Confidence', 'Data Type': 'enum', Description: 'High / Medium / Low', Example: 'High' },
  { Sheet: 'AM Pending', Column: 'Item Type', 'Data Type': 'enum', Description: 'Deliverable / Construction Followup / Tenant Request / etc.', Example: 'Deliverable' },
  { Sheet: 'AM Pending', Column: 'Status', 'Data Type': 'enum', Description: 'Open / In Progress / Waiting / Done / Cancelled', Example: 'Open' },
  { Sheet: 'AM Pending', Column: 'Cadence', 'Data Type': 'enum', Description: 'One-Time / Monthly / Quarterly / Bi-Annual / Annual', Example: 'Quarterly' },
  { Sheet: 'Contacts', Column: 'Contact Type', 'Data Type': 'enum', Description: 'Owner / Broker / Attorney / Title Agent / Consultant / GC / Architect / Other', Example: 'Broker' },
  { Sheet: 'Contacts', Column: 'Primary Phone', 'Data Type': 'string', Description: 'Primary phone number', Example: '555-123-4567' },
  { Sheet: 'Contacts', Column: 'Other Phones', 'Data Type': 'string', Description: 'Semicolon-separated additional phones', Example: '555-987-6543; 555-111-2222' },
  { Sheet: 'Dev Project Contacts', Column: 'Dev Project ID', 'Data Type': 'uuid', Description: 'Link to development project', Example: '550e8400-...' },
  { Sheet: 'Dev Project Contacts', Column: 'Role Override', 'Data Type': 'enum', Description: 'Override of contact type for this project', Example: 'Consultant' },
  { Sheet: 'Dev Project Notes', Column: 'Note Type', 'Data Type': 'enum', Description: 'General / Call Log / Meeting / Site Visit / Research / Feasibility', Example: 'Site Visit' },
  { Sheet: 'Dev Project Notes', Column: 'Content', 'Data Type': 'string', Description: 'Note content', Example: 'Reviewed grading progress' },
  { Sheet: 'Acquisitions', Column: 'Target Name', 'Data Type': 'string', Description: 'Acquisition target name', Example: 'Riverside Portfolio' },
  { Sheet: 'Acquisitions', Column: 'Status', 'Data Type': 'enum', Description: 'Sourcing / Pursuing / LOI / PSA / Closing / Closed / Lost / On Hold', Example: 'Pursuing' },
  { Sheet: 'Acquisitions', Column: 'Underwritten IRR', 'Data Type': 'percent', Description: 'UW IRR (displayed %; stored as fraction)', Example: '15%' },
  { Sheet: 'Acquisitions', Column: 'Diligence Status (JSON)', 'Data Type': 'json', Description: 'Key-value diligence checklist', Example: '{"environmental":"clear"}' },
  { Sheet: 'Acq Contacts', Column: 'Acquisition Target ID', 'Data Type': 'uuid', Description: 'Link to acquisition target', Example: '550e8400-...' },
  { Sheet: 'Acq Notes', Column: 'Note Type', 'Data Type': 'enum', Description: 'General / Call Log / Meeting / Site Visit / Research / Feasibility', Example: 'Meeting' },
  { Sheet: 'Dispositions', Column: 'Asset Name', 'Data Type': 'string', Description: 'Disposition listing name', Example: 'Oak Street Warehouse' },
  { Sheet: 'Dispositions', Column: 'Status', 'Data Type': 'enum', Description: 'Considering / Underwriting / Marketing / Under Contract / Closed / Pulled / On Hold', Example: 'Marketing' },
  { Sheet: 'Dispositions', Column: 'List Cap %', 'Data Type': 'percent', Description: 'Cap rate (displayed %; stored as fraction)', Example: '6.5%' },
  { Sheet: 'Dispositions', Column: 'Occupancy %', 'Data Type': 'percent', Description: 'Occupancy (displayed %; stored as fraction)', Example: '93%' },
  { Sheet: 'Dispo Contacts', Column: 'Disposition Listing ID', 'Data Type': 'uuid', Description: 'Link to disposition listing', Example: '550e8400-...' },
  { Sheet: 'Dispo Notes', Column: 'Note Type', 'Data Type': 'enum', Description: 'General / Call Log / Meeting / Site Visit / Research / Feasibility', Example: 'General' },
];

function buildWorkbook(
  dealsOrData: Deal[] | FullDataSet,
  rentRollArg?: RentRollRow[],
  activitiesArg?: ActivityEntry[],
  onboardingsArg?: OnboardingChecklist[],
): XLSX.WorkBook {
  const data: FullDataSet = Array.isArray(dealsOrData)
    ? {
        deals: dealsOrData,
        rentRoll: rentRollArg ?? [],
        activities: activitiesArg ?? [],
        onboardings: onboardingsArg ?? [],
        scenarios: [],
        buildings: [],
        devProjects: [],
        propertyTaxAppeals: [],
        leaseComps: [],
        salesComps: [],
        amPendingItems: [],
        contacts: [],
        devProjectContacts: [],
        devProjectNotes: [],
        acquisitionTargets: [],
        acquisitionTargetContacts: [],
        acquisitionTargetNotes: [],
        dispositionListings: [],
        dispositionListingContacts: [],
        dispositionListingNotes: [],
      }
    : dealsOrData;

  const wb = XLSX.utils.book_new();

  if (data.deals.length > 0) {
    const prospectsData = data.deals.map((d) => ({
      'Deal Name': d.dealName,
      'Space ID': d.spaceId ?? '',
      'Building': d.building ?? '',
      'Project Code': d.dealId ?? '',
      'Min SF': d.minSF ?? '',
      'Max SF': d.maxSF ?? '',
      'Prospect / Tenant': d.prospectTenant ?? '',
      'Broker / Rep': d.brokerRep ?? '',
      'Transaction': d.transaction ?? '',
      'Status': d.status,
      'Target Rent ($/SF)': formatCurrency(d.targetRent),
      'Proposed Term (Months)': formatNum(d.proposedTermMonths, '', ' months'),
      'Free Rent (Months)': formatNum(d.freeRentMonths, '', ' months'),
      '$ TI / SF': d.tiPerSF !== null ? formatCurrency(d.tiPerSF) : d.tiNote ?? '',
      'Probability of Lease %': formatPercent(d.probabilityPct),
      'Expected Start': d.expectedStart ?? '',
      'Last Updated': d.lastUpdated ?? '',
      'Priority': d.priority,
      'Current Summary': d.currentSummary ?? '',
      'Notes': d.notes ?? '',
      'ID': d.id,
    }));
    const wsP = XLSX.utils.json_to_sheet(prospectsData);
    wsP['!cols'] = [
      { wch: 22 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 10 },
      { wch: 22 }, { wch: 14 }, { wch: 22 }, { wch: 16 }, { wch: 22 }, { wch: 18 },
      { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 14 }, { wch: 14 },
      { wch: 10 }, { wch: 50 }, { wch: 50 }, { wch: 38 },
    ];
    XLSX.utils.book_append_sheet(wb, wsP, 'Prospects');
  }

  if (data.rentRoll.length > 0) {
    const rrData = data.rentRoll.map((r) => ({
      'Project Code': r.dealId ?? '',
      'Deal Name': r.dealName ?? '',
      'Market': r.market ?? '',
      'Property Type': r.propertyType ?? '',
      'Tenant Name': r.tenantName ?? '',
      'Tenant Rating': formatTenantRating(r.tenantRating),
      'Building ID': r.buildingId ?? '',
      'Space ID': r.spaceId ?? '',
      'Building': r.building ?? '',
      'Building Type': r.buildingType ?? '',
      'Leasable SF': r.leasableSF ?? '',
      'Occupied?': r.occupied ? 'Yes' : 'No',
      'Lease Start': r.leaseStart ?? '',
      'Lease Term (Months)': r.leaseTermMonths ?? '',
      'Lease End': r.leaseEnd ?? '',
      'Free Rent (Months)': r.freeRentMonths ?? '',
      'Annual Rent Bumps (%)': formatPercent(r.annualRentBumpsPct),
      '$ TI/ TI Allowance': r.tiPerSF !== null ? formatCurrency(r.tiPerSF) : r.tiNote ?? '',
      'Spec Office': r.specOffice ? 'Yes' : 'No',
      'Spec TI ($/SF)': formatCurrency(r.specTIPerSF),
      'Leasing Commission Structure': formatPercent(r.commissionStructurePct),
      'Leasing Commission $': r.commissionDollar ?? '',
      'Starting Annual Rent ($/SF)': formatCurrency(r.startingAnnualRentPSF),
      'In-Place Rent': r.inPlaceRent ?? '',
      'Current Summary': r.currentSummary ?? '',
      'Notes': r.notes ?? '',
      'ID': r.id,
    }));
    const wsR = XLSX.utils.json_to_sheet(rrData);
    XLSX.utils.book_append_sheet(wb, wsR, 'Rent Roll');
  }

  if (data.activities.length > 0) {
    // Denormalize the parent's display name onto each activity row so the
    // sheet is readable in Excel without cross-referencing IDs. Parent ID
    // remains the source of truth on import.
    const dealNameById = new Map(data.deals.map((d) => [d.id, d.dealName]));
    const rrNameById = new Map(
      data.rentRoll.map((r) => [r.id, r.dealName ?? r.tenantName ?? r.spaceId ?? ''])
    );
    const aData = data.activities.map((a) => ({
      'ID': a.id,
      'Parent Type': a.parentType === 'deal' ? 'Deal' : 'Rent Roll',
      'Parent ID': a.parentId,
      'Parent Name':
        a.parentType === 'deal'
          ? dealNameById.get(a.parentId) ?? ''
          : rrNameById.get(a.parentId) ?? '',
      'Date': a.date,
      'Type': a.type,
      'Summary': a.summary,
      'Link': a.link ?? '',
      'Author': a.author ?? '',
      'Created At': a.createdAt,
    }));
    const wsA = XLSX.utils.json_to_sheet(aData);
    wsA['!cols'] = [
      { wch: 38 }, { wch: 10 }, { wch: 38 }, { wch: 28 }, { wch: 12 },
      { wch: 14 }, { wch: 60 }, { wch: 40 }, { wch: 16 }, { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, wsA, 'Activity');
  }

  if (data.onboardings.length > 0) {
    // Flatten to one row per (checklist, item) pair. Department / Group /
    // Item columns are denormalized from the template for skimmability in
    // Excel; they're ignored on import (Item ID is the source of truth).
    const rrNameById2 = new Map(
      data.rentRoll.map((r) => [r.id, r.tenantName ?? r.dealName ?? r.spaceId ?? ''])
    );
    const oData: Record<string, string | number>[] = [];
    for (const c of data.onboardings) {
      for (const item of c.items) {
        const t = getTemplateItem(item.itemId);
        oData.push({
          'Checklist ID': c.id,
          'Rent Roll ID': c.rentRollId,
          'Tenant': rrNameById2.get(c.rentRollId) ?? '',
          'Department': t?.department ?? '',
          'Group': t?.group ?? '',
          'Item': t?.label ?? '',
          'Item ID': item.itemId,
          'Checked': item.checked ? 'Yes' : 'No',
          'Notes': item.notes ?? '',
          'Link': item.link ?? '',
          'Completed At': item.completedAt ?? '',
          'Created At': c.createdAt,
          'Template Version': c.templateVersion,
        });
      }
    }
    const wsO = XLSX.utils.json_to_sheet(oData);
    wsO['!cols'] = [
      { wch: 38 }, { wch: 38 }, { wch: 28 }, { wch: 8 }, { wch: 30 },
      { wch: 50 }, { wch: 32 }, { wch: 10 }, { wch: 40 }, { wch: 40 },
      { wch: 22 }, { wch: 22 }, { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, wsO, 'Onboarding');
  }

  // ── New entity sheets ──

  if (data.scenarios.length > 0) {
    const sData = data.scenarios.map((s) => ({
      'ID': s.id,
      'Project Code': s.dealId,
      'Name': s.name,
      'Inputs (JSON)': JSON.stringify(s.inputs),
      'Globals (JSON)': JSON.stringify(s.globals),
      'Results (JSON)': s.results != null ? JSON.stringify(s.results) : '',
      'Created At': s.createdAt,
      'Updated At': s.updatedAt,
    }));
    const wsS = XLSX.utils.json_to_sheet(sData);
    wsS['!cols'] = [
      { wch: 38 }, { wch: 38 }, { wch: 24 }, { wch: 60 }, { wch: 60 },
      { wch: 60 }, { wch: 22 }, { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, wsS, 'Scenarios');
  }

  if (data.buildings.length > 0) {
    const bData = data.buildings.map((b) => ({
      'ID': b.id,
      'Project ID': b.projectId,
      'Name': b.name,
      'Height (ft)': b.heightFt,
      'Bay Count': b.bayCount,
      'Frontage Side': b.frontageSide ?? '',
      'Width (ft)': b.widthFt ?? '',
      'Depth (ft)': b.depthFt ?? '',
      'Rotation (deg)': b.rotationDeg,
      'Center Lat': b.centerLat ?? '',
      'Center Lng': b.centerLng ?? '',
      'Footprint (JSON)': b.footprint != null ? JSON.stringify(b.footprint) : '',
      'Bump Outs (JSON)': b.bumpOuts.length > 0 ? JSON.stringify(b.bumpOuts) : '',
      'Bay Space IDs (JSON)': b.baySpaceIds.length > 0 ? JSON.stringify(b.baySpaceIds) : '',
      'Building Ordinal': b.buildingOrdinal ?? '',
      'Color': b.color ?? '',
      'Created At': b.createdAt,
      'Updated At': b.updatedAt,
    }));
    const wsB = XLSX.utils.json_to_sheet(bData);
    wsB['!cols'] = [
      { wch: 38 }, { wch: 38 }, { wch: 20 }, { wch: 10 }, { wch: 10 },
      { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 60 }, { wch: 40 }, { wch: 40 }, { wch: 14 },
      { wch: 10 }, { wch: 22 }, { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, wsB, 'Buildings');
  }

  if (data.devProjects.length > 0) {
    const dpData = data.devProjects.map((p) => ({
      'ID': p.id,
      'Project Name': p.projectName,
      'Market': p.market ?? '',
      'Address': p.address ?? '',
      'Phase': p.phase,
      'Total SF': p.totalSF ?? '',
      'Acres': p.acres ?? '',
      'Building Count': p.buildingCount ?? '',
      'Start Date': p.startDate ?? '',
      'Expected Delivery': p.expectedDeliveryDate ?? '',
      'Actual Delivery': p.actualDeliveryDate ?? '',
      'Total Budget': p.totalBudget ?? '',
      'Spent to Date': p.spentToDate ?? '',
      'PM': p.pmName ?? '',
      'GC': p.gcName ?? '',
      'GC Contact': p.gcContact ?? '',
      'Architect': p.architect ?? '',
      'Risk Level': p.riskLevel,
      'Status Summary': p.statusSummary ?? '',
      'Notes': p.notes ?? '',
      'Lat': p.lat ?? '',
      'Lng': p.lng ?? '',
      'Created At': p.createdAt,
      'Updated At': p.updatedAt,
    }));
    const wsDp = XLSX.utils.json_to_sheet(dpData);
    wsDp['!cols'] = [
      { wch: 38 }, { wch: 24 }, { wch: 16 }, { wch: 30 }, { wch: 14 },
      { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 12 }, { wch: 16 },
      { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
      { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 40 }, { wch: 40 },
      { wch: 10 }, { wch: 10 }, { wch: 22 }, { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, wsDp, 'Dev Projects');
  }

  if (data.propertyTaxAppeals.length > 0) {
    const taData = data.propertyTaxAppeals.map((a) => ({
      'ID': a.id,
      'Building ID': a.buildingId ?? '',
      'Building': a.building ?? '',
      'Parcel Number': a.parcelNumber ?? '',
      'Jurisdiction': a.jurisdiction ?? '',
      'Tax Year': a.taxYear,
      'Assessed Value': a.assessedValue ?? '',
      'Proposed Value': a.proposedValue ?? '',
      'Market Value': a.marketValue ?? '',
      'Status': a.status,
      'Filed Date': a.filedDate ?? '',
      'Hearing Date': a.hearingDate ?? '',
      'Resolution Date': a.resolutionDate ?? '',
      'Initial Assessed': a.initialAssessedValue ?? '',
      'Final Assessed': a.finalAssessedValue ?? '',
      'Est. Savings': a.estimatedSavings ?? '',
      'Consultant': a.consultantName ?? '',
      'Fee %': formatFractionAsPercent(a.consultantFeePct),
      'Fee $': a.consultantFeeDollar ?? '',
      'Notes': a.notes ?? '',
      'Created At': a.createdAt,
      'Updated At': a.updatedAt,
    }));
    const wsTa = XLSX.utils.json_to_sheet(taData);
    wsTa['!cols'] = [
      { wch: 38 }, { wch: 38 }, { wch: 20 }, { wch: 16 }, { wch: 16 },
      { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
      { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
      { wch: 12 }, { wch: 18 }, { wch: 8 }, { wch: 10 }, { wch: 40 },
      { wch: 22 }, { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, wsTa, 'Tax Appeals');
  }

  if (data.leaseComps.length > 0) {
    const lcData = data.leaseComps.map((c) => ({
      'ID': c.id,
      'Property Name': c.propertyName ?? '',
      'Address': c.buildingAddress ?? '',
      'Market': c.market ?? '',
      'Property Type': c.propertyType ?? '',
      'Building Type': c.buildingType ?? '',
      'Tenant': c.tenantName ?? '',
      'Industry': c.tenantIndustry ?? '',
      'Transaction Type': c.transactionType ?? '',
      'Signed Date': c.signedDate ?? '',
      'Delivery Date': c.deliveryDate ?? '',
      'Lease SF': c.leaseSF ?? '',
      'Building SF': c.buildingSF ?? '',
      'Base Rent ($/SF)': formatCurrency(c.baseRentPSF),
      'Effective Rent ($/SF)': formatCurrency(c.effectiveRentPSF),
      'Rent Type': c.rentType ?? '',
      'Term (Months)': c.termMonths ?? '',
      'Free Rent (Months)': c.freeRentMonths ?? '',
      'TI ($/SF)': formatCurrency(c.tiPSF),
      'Escalation %': formatFractionAsPercent(c.escalationPct),
      'Options': c.options ?? '',
      'Source': c.source ?? '',
      'Source URL': c.sourceUrl ?? '',
      'Confidence': c.confidence,
      'Confidential': c.confidential ? 'Yes' : 'No',
      'Notes': c.notes ?? '',
      'Created At': c.createdAt,
      'Updated At': c.updatedAt,
    }));
    const wsLc = XLSX.utils.json_to_sheet(lcData);
    wsLc['!cols'] = [
      { wch: 38 }, { wch: 22 }, { wch: 30 }, { wch: 16 }, { wch: 14 },
      { wch: 14 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 12 },
      { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 18 },
      { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 12 },
      { wch: 20 }, { wch: 16 }, { wch: 30 }, { wch: 10 }, { wch: 12 },
      { wch: 40 }, { wch: 22 }, { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, wsLc, 'Lease Comps');
  }

  if (data.salesComps.length > 0) {
    const scData = data.salesComps.map((c) => ({
      'ID': c.id,
      'Property Name': c.propertyName ?? '',
      'Address': c.buildingAddress ?? '',
      'Market': c.market ?? '',
      'Property Type': c.propertyType ?? '',
      'Building Type': c.buildingType ?? '',
      'Sale Date': c.saleDate ?? '',
      'Sale Price': c.salePrice ?? '',
      'Price ($/SF)': formatCurrency(c.pricePSF),
      'Cap Rate %': formatFractionAsPercent(c.capRate),
      'NOI': c.noi ?? '',
      'Building SF': c.buildingSF ?? '',
      'Land (Acres)': c.landAcres ?? '',
      'Year Built': c.yearBuilt ?? '',
      'Occupancy %': formatFractionAsPercent(c.occupancyPct),
      'Buyer': c.buyer ?? '',
      'Seller': c.seller ?? '',
      'Source': c.source ?? '',
      'Source URL': c.sourceUrl ?? '',
      'Confidence': c.confidence,
      'Confidential': c.confidential ? 'Yes' : 'No',
      'Notes': c.notes ?? '',
      'Created At': c.createdAt,
      'Updated At': c.updatedAt,
    }));
    const wsSc = XLSX.utils.json_to_sheet(scData);
    wsSc['!cols'] = [
      { wch: 38 }, { wch: 22 }, { wch: 30 }, { wch: 16 }, { wch: 14 },
      { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 12 },
      { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
      { wch: 20 }, { wch: 20 }, { wch: 16 }, { wch: 30 }, { wch: 10 },
      { wch: 12 }, { wch: 40 }, { wch: 22 }, { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, wsSc, 'Sales Comps');
  }

  if (data.amPendingItems.length > 0) {
    const amData = data.amPendingItems.map((i) => ({
      'ID': i.id,
      'Item Type': i.itemType,
      'Title': i.title,
      'Description': i.description ?? '',
      'Building ID': i.buildingId ?? '',
      'Building': i.buildingName ?? '',
      'Project Code': i.dealId ?? '',
      'Project': i.dealName ?? '',
      'Owner': i.owner ?? '',
      'Status': i.status,
      'Priority': i.priority,
      'Due Date': i.dueDate ?? '',
      'Completed Date': i.completedDate ?? '',
      'Source': i.source ?? '',
      'Link': i.link ?? '',
      'Cadence': i.cadence,
      'Sent To Tab': i.sentToTab ?? '',
      'Sent To ID': i.sentToId ?? '',
      'Notes': i.notes ?? '',
      'Created At': i.createdAt,
      'Updated At': i.updatedAt,
    }));
    const wsAm = XLSX.utils.json_to_sheet(amData);
    wsAm['!cols'] = [
      { wch: 38 }, { wch: 20 }, { wch: 30 }, { wch: 40 }, { wch: 38 },
      { wch: 20 }, { wch: 38 }, { wch: 20 }, { wch: 16 }, { wch: 12 },
      { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 30 },
      { wch: 12 }, { wch: 14 }, { wch: 38 }, { wch: 40 }, { wch: 22 },
      { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, wsAm, 'AM Pending');
  }

  if (data.contacts.length > 0) {
    const ctData = data.contacts.map((c) => {
      const primaryPhone = c.phones.find(p => p.isPrimary)?.value ?? c.phones[0]?.value ?? '';
      const otherPhones = c.phones
        .filter(p => p.value !== primaryPhone)
        .map(p => p.value)
        .join('; ');
      const primaryEmail = c.emails.find(e => e.isPrimary)?.value ?? c.emails[0]?.value ?? '';
      const otherEmails = c.emails
        .filter(e => e.value !== primaryEmail)
        .map(e => e.value)
        .join('; ');
      return {
        'ID': c.id,
        'Contact Type': c.contactType,
        'First Name': c.firstName ?? '',
        'Last Name': c.lastName ?? '',
        'Company': c.companyName ?? '',
        'Title': c.title ?? '',
        'Primary Phone': primaryPhone,
        'Primary Email': primaryEmail,
        'Other Phones': otherPhones,
        'Other Emails': otherEmails,
        'Notes': c.notes ?? '',
        'Created At': c.createdAt,
        'Updated At': c.updatedAt,
      };
    });
    const wsCt = XLSX.utils.json_to_sheet(ctData);
    wsCt['!cols'] = [
      { wch: 38 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 22 },
      { wch: 18 }, { wch: 16 }, { wch: 24 }, { wch: 30 }, { wch: 30 },
      { wch: 40 }, { wch: 22 }, { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, wsCt, 'Contacts');
  }

  if (data.devProjectContacts.length > 0) {
    const dpcData = data.devProjectContacts.map((r) => ({
      'ID': r.id,
      'Dev Project ID': r.devProjectId,
      'Contact ID': r.contactId,
      'Role Override': r.roleOverride ?? '',
      'Is Primary': r.isPrimary ? 'Yes' : 'No',
      'Link Notes': r.linkNotes ?? '',
      'Created At': r.createdAt,
      'Updated At': r.updatedAt,
    }));
    const wsDpc = XLSX.utils.json_to_sheet(dpcData);
    wsDpc['!cols'] = [
      { wch: 38 }, { wch: 38 }, { wch: 38 }, { wch: 14 }, { wch: 10 },
      { wch: 40 }, { wch: 22 }, { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, wsDpc, 'Dev Project Contacts');
  }

  if (data.devProjectNotes.length > 0) {
    const dpnData = data.devProjectNotes.map((n) => ({
      'ID': n.id,
      'Dev Project ID': n.devProjectId,
      'Note Type': n.noteType,
      'Event Date': n.eventDate ?? '',
      'Content': n.content,
      'Author': n.author ?? '',
      'Link': n.link ?? '',
      'Created At': n.createdAt,
      'Updated At': n.updatedAt,
    }));
    const wsDpn = XLSX.utils.json_to_sheet(dpnData);
    wsDpn['!cols'] = [
      { wch: 38 }, { wch: 38 }, { wch: 14 }, { wch: 12 }, { wch: 60 },
      { wch: 16 }, { wch: 30 }, { wch: 22 }, { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, wsDpn, 'Dev Project Notes');
  }

  if (data.acquisitionTargets.length > 0) {
    const atData = data.acquisitionTargets.map((a) => ({
      'ID': a.id,
      'Target Name': a.targetName,
      'Market': a.market ?? '',
      'Address': a.address ?? '',
      'Property Type': a.propertyType ?? '',
      'Status': a.status,
      'Acres': a.acres ?? '',
      'Building Count': a.buildingCount ?? '',
      'Total SF': a.totalSF ?? '',
      'Asking Price': a.askingPrice ?? '',
      'Our Offer': a.ourOffer ?? '',
      'Earnest Money': a.earnestMoney ?? '',
      'Closing Costs Estimate': a.closingCostsEstimate ?? '',
      'Rehab Budget': a.rehabBudget ?? '',
      'Underwritten IRR': formatFractionAsPercent(a.underwrittenIRR),
      'Equity Multiple': a.underwrittenEquityMultiple ?? '',
      'First Contacted': a.firstContactedDate ?? '',
      'LOI Date': a.loiDate ?? '',
      'PSA Date': a.psaDate ?? '',
      'Expected Closing': a.expectedClosingDate ?? '',
      'Actual Closing': a.actualClosingDate ?? '',
      'Diligence Status (JSON)': Object.keys(a.diligenceStatus).length > 0 ? JSON.stringify(a.diligenceStatus) : '',
      'Risk Level': a.riskLevel,
      'Status Summary': a.statusSummary ?? '',
      'Lat': a.lat ?? '',
      'Lng': a.lng ?? '',
      'Notes': a.notes ?? '',
      'Created At': a.createdAt,
      'Updated At': a.updatedAt,
    }));
    const wsAt = XLSX.utils.json_to_sheet(atData);
    wsAt['!cols'] = [
      { wch: 38 }, { wch: 24 }, { wch: 16 }, { wch: 30 }, { wch: 14 },
      { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
      { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 16 },
      { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 16 },
      { wch: 14 }, { wch: 40 }, { wch: 10 }, { wch: 40 }, { wch: 10 },
      { wch: 10 }, { wch: 40 }, { wch: 22 }, { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, wsAt, 'Acquisitions');
  }

  if (data.acquisitionTargetContacts.length > 0) {
    const acData = data.acquisitionTargetContacts.map((r) => ({
      'ID': r.id,
      'Acquisition Target ID': r.acquisitionTargetId,
      'Contact ID': r.contactId,
      'Role Override': r.roleOverride ?? '',
      'Is Primary': r.isPrimary ? 'Yes' : 'No',
      'Link Notes': r.linkNotes ?? '',
      'Created At': r.createdAt,
      'Updated At': r.updatedAt,
    }));
    const wsAc = XLSX.utils.json_to_sheet(acData);
    wsAc['!cols'] = [
      { wch: 38 }, { wch: 38 }, { wch: 38 }, { wch: 14 }, { wch: 10 },
      { wch: 40 }, { wch: 22 }, { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, wsAc, 'Acq Contacts');
  }

  if (data.acquisitionTargetNotes.length > 0) {
    const anData = data.acquisitionTargetNotes.map((n) => ({
      'ID': n.id,
      'Acquisition Target ID': n.acquisitionTargetId,
      'Note Type': n.noteType,
      'Event Date': n.eventDate ?? '',
      'Content': n.content,
      'Author': n.author ?? '',
      'Link': n.link ?? '',
      'Created At': n.createdAt,
      'Updated At': n.updatedAt,
    }));
    const wsAn = XLSX.utils.json_to_sheet(anData);
    wsAn['!cols'] = [
      { wch: 38 }, { wch: 38 }, { wch: 14 }, { wch: 12 }, { wch: 60 },
      { wch: 16 }, { wch: 30 }, { wch: 22 }, { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, wsAn, 'Acq Notes');
  }

  if (data.dispositionListings.length > 0) {
    const dlData = data.dispositionListings.map((d) => ({
      'ID': d.id,
      'Asset Name': d.assetName,
      'Building ID': d.buildingId ?? '',
      'Market': d.market ?? '',
      'Address': d.address ?? '',
      'Property Type': d.propertyType ?? '',
      'Status': d.status,
      'Total SF': d.totalSF ?? '',
      'Acres': d.acres ?? '',
      'Occupancy %': formatFractionAsPercent(d.occupancyPct),
      'Trailing NOI': d.trailingNOI ?? '',
      'Forward NOI': d.forwardNOI ?? '',
      'List Price': d.listPrice ?? '',
      'List Cap %': formatFractionAsPercent(d.listCapPct),
      'Achieved Price': d.achievedPrice ?? '',
      'Achieved Cap %': formatFractionAsPercent(d.achievedCapPct),
      'Net Proceeds': d.netProceeds ?? '',
      'Broker Commission %': formatFractionAsPercent(d.brokerCommissionPct),
      'List Date': d.listDate ?? '',
      'Bids Due Date': d.bidsDueDate ?? '',
      'LOI Executed Date': d.loiExecutedDate ?? '',
      'PSA Executed Date': d.psaExecutedDate ?? '',
      'Expected Closing': d.expectedClosingDate ?? '',
      'Actual Closing': d.actualClosingDate ?? '',
      'Risk Level': d.riskLevel,
      'Status Summary': d.statusSummary ?? '',
      'Lat': d.lat ?? '',
      'Lng': d.lng ?? '',
      'Notes': d.notes ?? '',
      'Created At': d.createdAt,
      'Updated At': d.updatedAt,
    }));
    const wsDl = XLSX.utils.json_to_sheet(dlData);
    wsDl['!cols'] = [
      { wch: 38 }, { wch: 24 }, { wch: 38 }, { wch: 16 }, { wch: 30 },
      { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 12 },
      { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
      { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 12 },
      { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 10 },
      { wch: 40 }, { wch: 10 }, { wch: 10 }, { wch: 40 }, { wch: 22 },
      { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, wsDl, 'Dispositions');
  }

  if (data.dispositionListingContacts.length > 0) {
    const dcData = data.dispositionListingContacts.map((r) => ({
      'ID': r.id,
      'Disposition Listing ID': r.dispositionListingId,
      'Contact ID': r.contactId,
      'Role Override': r.roleOverride ?? '',
      'Is Primary': r.isPrimary ? 'Yes' : 'No',
      'Link Notes': r.linkNotes ?? '',
      'Created At': r.createdAt,
      'Updated At': r.updatedAt,
    }));
    const wsDc = XLSX.utils.json_to_sheet(dcData);
    wsDc['!cols'] = [
      { wch: 38 }, { wch: 38 }, { wch: 38 }, { wch: 14 }, { wch: 10 },
      { wch: 40 }, { wch: 22 }, { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, wsDc, 'Dispo Contacts');
  }

  if (data.dispositionListingNotes.length > 0) {
    const dnData = data.dispositionListingNotes.map((n) => ({
      'ID': n.id,
      'Disposition Listing ID': n.dispositionListingId,
      'Note Type': n.noteType,
      'Event Date': n.eventDate ?? '',
      'Content': n.content,
      'Author': n.author ?? '',
      'Link': n.link ?? '',
      'Created At': n.createdAt,
      'Updated At': n.updatedAt,
    }));
    const wsDn = XLSX.utils.json_to_sheet(dnData);
    wsDn['!cols'] = [
      { wch: 38 }, { wch: 38 }, { wch: 14 }, { wch: 12 }, { wch: 60 },
      { wch: 16 }, { wch: 30 }, { wch: 22 }, { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, wsDn, 'Dispo Notes');
  }

  // Data Dictionary — always last
  const wsDict = XLSX.utils.json_to_sheet(DATA_DICTIONARY);
  wsDict['!cols'] = [{ wch: 22 }, { wch: 30 }, { wch: 18 }, { wch: 60 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsDict, 'Data Dictionary');

  return wb;
}

export function buildWorkbookBlob(
  dealsOrData: Deal[] | FullDataSet,
  rentRoll?: RentRollRow[],
  activities?: ActivityEntry[],
  onboardings?: OnboardingChecklist[]
): Blob {
  const wb = buildWorkbook(dealsOrData, rentRoll, activities, onboardings);
  const bytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function saveToFile(
  dealsOrData: Deal[] | FullDataSet,
  rentRoll?: RentRollRow[],
  activities?: ActivityEntry[],
  onboardings?: OnboardingChecklist[],
  filename: string = 'leases.xlsx'
): void {
  const wb = buildWorkbook(dealsOrData, rentRoll, activities, onboardings);
  XLSX.writeFile(wb, filename);
}

// ──────────────────────────────────────────────────────────────────
// View-scoped export helpers
// ──────────────────────────────────────────────────────────────────

const VIEW_ENTITY_MAP: Record<string, (keyof FullDataSet)[]> = {
  prospects: ['deals', 'activities'],
  rentroll: ['rentRoll', 'activities'],
  underwrite: ['scenarios'],
  comps: ['leaseComps', 'salesComps'],
  contacts: ['contacts'],
  development: ['devProjects', 'devProjectContacts', 'devProjectNotes', 'buildings'],
  'asset-mgmt': ['amPendingItems', 'propertyTaxAppeals'],
  onboarding: ['onboardings'],
  acquisitions: ['acquisitionTargets', 'acquisitionTargetContacts', 'acquisitionTargetNotes'],
  disposition: ['dispositionListings', 'dispositionListingContacts', 'dispositionListingNotes'],
};

export function buildViewWorkbookBlob(viewName: string, data: FullDataSet): Blob {
  const keys = VIEW_ENTITY_MAP[viewName] ?? (Object.keys(data) as (keyof FullDataSet)[]);
  const filtered: FullDataSet = { ...emptyDataSet() };
  for (const k of keys) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (filtered as any)[k] = data[k];
  }
  return buildWorkbookBlob(filtered);
}
