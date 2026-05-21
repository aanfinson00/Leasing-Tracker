import * as XLSX from 'xlsx';
import type {
  ActivityEntry,
  ActivityParentType,
  ActivityType,
  Deal,
  DealStatus,
  OnboardingChecklist,
  OnboardingItem,
  Priority,
  RentRollRow,
  UWBasis,
} from '../types';
import {
  ActivityEntrySchema,
  ActivityParentTypeEnum,
  ActivityTypeEnum,
  DealSchema,
  DealStatusEnum,
  OnboardingChecklistSchema,
  RentRollRowSchema,
  UWBasisEnum,
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

const parseStars = (v: unknown): number | null => {
  if (isMissing(v)) return null;
  const s = String(v).trim();
  const filled = (s.match(/★/g) ?? []).length;
  if (filled > 0) return Math.min(filled, 5);
  const asNum = parseNumber(v);
  if (asNum !== null && asNum >= 0 && asNum <= 5) return Math.round(asNum);
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

const parseUWBasis = (v: unknown): UWBasis | null => {
  const s = cleanString(v)?.toLowerCase() ?? '';
  if (!s) return null;
  if (s.includes('actual')) return 'Actual';
  if (s.includes('prospect') || s.includes('uw')) return 'Prospective UW';
  const opts = UWBasisEnum.options;
  const exact = opts.find((o) => o.toLowerCase() === s);
  return exact ?? null;
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

const RENT_ROLL_HEADER_HINTS = ['leasablesf', 'occupied', 'tenantrating', 'actualorprospectiveuw'];
const PROSPECTS_HEADER_HINTS = ['prospecttenant', 'probabilityoflease', 'targetrent'];
const ACTIVITY_HEADER_HINTS = ['parentid', 'parenttype', 'summary'];
const ONBOARDING_HEADER_HINTS = ['checklistid', 'itemid', 'checked'];

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
type SheetType = 'rentroll' | 'prospects' | 'activity' | 'onboarding' | 'unknown';

const findHeaderRow = (sheet: XLSX.WorkSheet): { rowIdx: number; type: SheetType } => {
  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1');
  const maxScan = Math.min(range.s.r + 12, range.e.r);
  for (let r = range.s.r; r <= maxScan; r++) {
    const headers = readRow(sheet, r);
    const norm = new Set(headers.map(HEADER_NORMALIZE));
    const oHits = ONBOARDING_HEADER_HINTS.filter((h) => norm.has(h)).length;
    if (oHits >= 2) return { rowIdx: r, type: 'onboarding' };
    const aHits = ACTIVITY_HEADER_HINTS.filter((h) => norm.has(h)).length;
    if (aHits >= 2) return { rowIdx: r, type: 'activity' };
    const rrHits = RENT_ROLL_HEADER_HINTS.filter((h) => norm.has(h)).length;
    const pHits = PROSPECTS_HEADER_HINTS.filter((h) => norm.has(h)).length;
    if (rrHits >= 2) return { rowIdx: r, type: 'rentroll' };
    if (pHits >= 2) return { rowIdx: r, type: 'prospects' };
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
    dealId: cleanString(get('Deal ID')),
    minSF,
    maxSF,
    prospectTenant: cleanString(get('Prospect / Tenant', 'Prospect/Tenant', 'Tenant', 'Prospect')),
    brokerRep: cleanString(get('Broker / Rep', 'Broker/Rep', 'Broker', 'Rep')),
    transaction: cleanString(get('Transaction', 'Transaction Type', 'Deal Type')),
    status: parseStatus(get('Status', 'Stage')),
    lastRevalUWRent: parseNumber(get('Last Reval UW Rent ($/SF)', 'UW Rent', 'Last Reval UW Rent')),
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
  const dealId = cleanString(get('Deal ID'));
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
    dealId: cleanString(get('Deal ID')),
    dealName,
    buildingId: cleanString(get('Building ID')),
    spaceId: cleanString(get('Space ID')),
    building: cleanString(get('Building')),
    market: cleanString(get('Market')),
    propertyType: cleanString(get('Property Type')),
    buildingType: cleanString(get('Building Type')),
    tenantName: tenant,
    tenantRating: parseStars(get('Tenant Rating (1-5)', 'Tenant Rating', 'Rating')),
    occupied: parseBool(get('Occupied?', 'Occupied')),
    uwBasis: parseUWBasis(get('Actual or Prospective UW', 'UW Basis', 'Basis')),
    leasableSF: parseNumber(get('Leasable SF', 'SF', 'Square Feet')),
    leaseStart: parseDate(get('Lease Start')),
    leaseTermMonths: parseNumber(get('Lease Term (Months)', 'Lease Term', 'Term', 'Term Months')),
    leaseEnd: parseDate(get('Lease End')),
    freeRentMonths: parseNumber(get('Free Rent (Months)', 'Free Rent')),
    annualRentBumpsPct: parsePercent(get('Annual Rent Bumps (%)', 'Annual Rent Bumps', 'Rent Bumps')),
    tiPerSF: ti.num,
    tiNote: ti.note,
    uwTiPerSF: parseNumber(get('Underwritten TI ($/SF)', 'UW TI ($/SF)', 'Underwritten TI', 'UW TI')),
    specOffice: parseBool(get('Spec Office', 'Spec Office/lighting prior to additional $ TI spend')),
    specTIPerSF: parseNumber(get('Spec TI ($/SF)', 'Spec TI')),
    commissionStructurePct: parsePercent(get('Leasing Commission Structure', 'Commission Structure')),
    commissionDollar: parseNumber(get('Leasing Commission $', 'Commission $')),
    lastRevalUWRent: parseNumber(get('Last Reval UW Rent ($/SF)', 'Last Reval UW Rent')),
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
// Public API
// ──────────────────────────────────────────────────────────────────

export interface LoadResult {
  deals: Deal[];
  rentRoll: RentRollRow[];
  activities: ActivityEntry[];
  onboardings: OnboardingChecklist[];
}

export async function loadFromFile(file: File): Promise<LoadResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('Failed to read file');

        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        let deals: Deal[] = [];
        let rentRoll: RentRollRow[] = [];
        let activities: ActivityEntry[] = [];
        const onboardingRows: OnboardingRowParsed[] = [];

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
        for (const [checklistId, rows] of byChecklist) {
          const first = rows[0];
          const candidate = {
            id: checklistId,
            rentRollId: first.rentRollId,
            createdAt: first.createdAt,
            templateVersion: first.templateVersion,
            items: rows.map((r) => r.item),
          };
          const result = OnboardingChecklistSchema.safeParse(candidate);
          if (!result.success) {
            console.warn('Skipping unparsable onboarding checklist:', candidate, result.error.format());
            continue;
          }
          onboardings.push(reconcileWithTemplate(result.data));
        }

        resolve({ deals, rentRoll, activities, onboardings });
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

const formatNum = (n: number | null, prefix = '', suffix = ''): string =>
  n === null ? '' : `${prefix}${n}${suffix}`;
const formatCurrency = (n: number | null): string => (n === null ? '' : `$${n.toFixed(2)}`);
const formatPercent = (n: number | null): string => (n === null ? '' : `${n}%`);
const formatStars = (n: number | null): string => (n === null ? '' : '★'.repeat(n));

function buildWorkbook(
  deals: Deal[],
  rentRoll: RentRollRow[],
  activities: ActivityEntry[],
  onboardings: OnboardingChecklist[] = []
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  if (deals.length > 0) {
    const prospectsData = deals.map((d) => ({
      'Deal Name': d.dealName,
      'Space ID': d.spaceId ?? '',
      'Building': d.building ?? '',
      'Deal ID': d.dealId ?? '',
      'Min SF': d.minSF ?? '',
      'Max SF': d.maxSF ?? '',
      'Prospect / Tenant': d.prospectTenant ?? '',
      'Broker / Rep': d.brokerRep ?? '',
      'Transaction': d.transaction ?? '',
      'Status': d.status,
      'Last Reval UW Rent ($/SF)': formatCurrency(d.lastRevalUWRent),
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

  if (rentRoll.length > 0) {
    const rrData = rentRoll.map((r) => ({
      'Deal ID': r.dealId ?? '',
      'Deal Name': r.dealName ?? '',
      'Market': r.market ?? '',
      'Property Type': r.propertyType ?? '',
      'Tenant Name': r.tenantName ?? '',
      'Tenant Rating (1-5)': formatStars(r.tenantRating),
      'Building ID': r.buildingId ?? '',
      'Space ID': r.spaceId ?? '',
      'Building': r.building ?? '',
      'Building Type': r.buildingType ?? '',
      'Leasable SF': r.leasableSF ?? '',
      'Occupied?': r.occupied ? 'Yes' : 'No',
      'Actual or Prospective UW': r.uwBasis ?? '',
      'Lease Start': r.leaseStart ?? '',
      'Lease Term (Months)': r.leaseTermMonths ?? '',
      'Lease End': r.leaseEnd ?? '',
      'Free Rent (Months)': r.freeRentMonths ?? '',
      'Annual Rent Bumps (%)': formatPercent(r.annualRentBumpsPct),
      '$ TI/ TI Allowance': r.tiPerSF !== null ? formatCurrency(r.tiPerSF) : r.tiNote ?? '',
      'Underwritten TI ($/SF)': formatCurrency(r.uwTiPerSF),
      'Spec Office': r.specOffice ? 'Yes' : 'No',
      'Spec TI ($/SF)': formatCurrency(r.specTIPerSF),
      'Leasing Commission Structure': formatPercent(r.commissionStructurePct),
      'Leasing Commission $': r.commissionDollar ?? '',
      'Last Reval UW Rent ($/SF)': formatCurrency(r.lastRevalUWRent),
      'Starting Annual Rent ($/SF)': formatCurrency(r.startingAnnualRentPSF),
      'In-Place Rent': r.inPlaceRent ?? '',
      'Current Summary': r.currentSummary ?? '',
      'Notes': r.notes ?? '',
      'ID': r.id,
    }));
    const wsR = XLSX.utils.json_to_sheet(rrData);
    XLSX.utils.book_append_sheet(wb, wsR, 'Rent Roll');
  }

  if (activities.length > 0) {
    // Denormalize the parent's display name onto each activity row so the
    // sheet is readable in Excel without cross-referencing IDs. Parent ID
    // remains the source of truth on import.
    const dealNameById = new Map(deals.map((d) => [d.id, d.dealName]));
    const rrNameById = new Map(
      rentRoll.map((r) => [r.id, r.dealName ?? r.tenantName ?? r.spaceId ?? ''])
    );
    const aData = activities.map((a) => ({
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

  if (onboardings.length > 0) {
    // Flatten to one row per (checklist, item) pair. Department / Group /
    // Item columns are denormalized from the template for skimmability in
    // Excel; they're ignored on import (Item ID is the source of truth).
    const rrNameById = new Map(
      rentRoll.map((r) => [r.id, r.tenantName ?? r.dealName ?? r.spaceId ?? ''])
    );
    const oData: Record<string, string | number>[] = [];
    for (const c of onboardings) {
      for (const item of c.items) {
        const t = getTemplateItem(item.itemId);
        oData.push({
          'Checklist ID': c.id,
          'Rent Roll ID': c.rentRollId,
          'Tenant': rrNameById.get(c.rentRollId) ?? '',
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

  return wb;
}

export function buildWorkbookBlob(
  deals: Deal[],
  rentRoll: RentRollRow[],
  activities: ActivityEntry[] = [],
  onboardings: OnboardingChecklist[] = []
): Blob {
  const wb = buildWorkbook(deals, rentRoll, activities, onboardings);
  const bytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function saveToFile(
  deals: Deal[],
  rentRoll: RentRollRow[],
  activities: ActivityEntry[] = [],
  onboardings: OnboardingChecklist[] = [],
  filename: string = 'leases.xlsx'
): void {
  const wb = buildWorkbook(deals, rentRoll, activities, onboardings);
  XLSX.writeFile(wb, filename);
}
