import type { Deal, RentRollRow, ActivityEntry, Scenario, PropertyTaxAppeal, AMPendingItem } from '../types';

type ReportRow = Record<string, string | number | null>;

/** Whole-day difference: floor((a - b) / 86 400 000). */
const daysBetween = (a: Date, b: Date) =>
  Math.floor((a.getTime() - b.getTime()) / 86400000);

/** Parse an ISO date string; returns null on invalid input. */
const safeDate = (v: string | null | undefined): Date | null => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Format a Date as YYYY-MM-DD for report cells. */
const fmtDate = (d: Date | null): string | null =>
  d ? d.toISOString().slice(0, 10) : null;

// ──────────────────────────────────────────────────────────────────
// 1. Stale Prospect Report
// ──────────────────────────────────────────────────────────────────

const STAGE_THRESHOLDS: Record<string, number> = {
  'New Prospect': 7,
  'RFP Requested': 10,
  'Proposal Sent': 14,
  'Proposal Pending Approval': 7,
  'LOI Negotiations': 10,
  'Lease Negotiations': 14,
  'Drafting Unsolicited': 14,
};
const DEFAULT_THRESHOLD = 14;

export function buildStaleProspectReport(
  deals: Deal[],
  activities: ActivityEntry[],
  today: Date = new Date(),
): ReportRow[] {
  const terminalStatuses = new Set(['Executed', 'On Hold', 'Lost']);
  const activeDeals = deals.filter((d) => !terminalStatuses.has(d.status));

  const rows: (ReportRow & { _sevOrder: number; _days: number })[] = [];

  for (const deal of activeDeals) {
    // Find the most recent activity for this deal
    const dealActivities = activities
      .filter((a) => a.parentId === deal.id)
      .map((a) => safeDate(a.createdAt))
      .filter((d): d is Date => d !== null);

    let lastActivityDate: Date | null = null;
    if (dealActivities.length > 0) {
      lastActivityDate = dealActivities.reduce((max, d) => (d > max ? d : max));
    }
    if (!lastActivityDate) {
      lastActivityDate = safeDate(deal.lastUpdated) ?? safeDate(deal.lastUpdated);
    }
    // If still nothing, skip — we can't compute staleness
    if (!lastActivityDate) continue;

    const daysSinceActivity = daysBetween(today, lastActivityDate);
    const threshold = STAGE_THRESHOLDS[deal.status] ?? DEFAULT_THRESHOLD;
    const ratio = daysSinceActivity / threshold;

    let severity: string;
    let sevOrder: number;
    let action: string;
    if (ratio >= 3) {
      severity = 'Critical';
      sevOrder = 0;
      action = 'Immediate follow-up required';
    } else if (ratio >= 2) {
      severity = 'Overdue';
      sevOrder = 1;
      action = 'Follow up this week';
    } else if (ratio >= 1) {
      severity = 'Due';
      sevOrder = 2;
      action = 'Schedule follow-up';
    } else {
      continue; // not stale
    }

    rows.push({
      'Deal Name': deal.dealName,
      'Tenant': deal.prospectTenant,
      'Broker': deal.brokerRep,
      'Stage': deal.status,
      'Priority': deal.priority,
      'Last Activity Date': fmtDate(lastActivityDate),
      'Days Since Activity': daysSinceActivity,
      'Threshold (days)': threshold,
      'Severity': severity,
      'Recommended Action': action,
      _sevOrder: sevOrder,
      _days: daysSinceActivity,
    });
  }

  // Sort: severity asc (Critical first), then days desc
  rows.sort((a, b) => a._sevOrder - b._sevOrder || b._days - a._days);

  // Strip internal sort keys
  return rows.map(({ _sevOrder: _s, _days: _d, ...rest }) => rest);
}

// ──────────────────────────────────────────────────────────────────
// 2. Lease Expiration Report
// ──────────────────────────────────────────────────────────────────

export function buildLeaseExpirationReport(
  rentRoll: RentRollRow[],
  deals: Deal[],
  today: Date = new Date(),
): ReportRow[] {
  const horizon = new Date(today);
  horizon.setMonth(horizon.getMonth() + 18);

  const rows: (ReportRow & { _urgOrder: number; _sf: number; _daysToExp: number })[] = [];

  for (const row of rentRoll) {
    if (!row.occupied) continue;
    const leaseEndDate = safeDate(row.leaseEnd);
    if (!leaseEndDate) continue;
    if (leaseEndDate > horizon) continue;

    const daysToExpiration = daysBetween(leaseEndDate, today);

    let urgency: string;
    let urgOrder: number;
    let action: string;
    if (daysToExpiration <= 180) {
      urgency = 'Urgent';
      urgOrder = 0;
      action = 'Start renewal negotiations immediately';
    } else if (daysToExpiration <= 365) {
      urgency = 'Active';
      urgOrder = 1;
      action = 'Initiate renewal discussions';
    } else {
      urgency = 'On Radar';
      urgOrder = 2;
      action = 'Add to renewal pipeline';
    }

    // Check if a renewal deal exists: tenant name loosely matches
    const tenantLower = (row.tenantName ?? '').toLowerCase().trim();
    const renewalDeal = tenantLower
      ? deals.find((d) => {
          if (d.status === 'Executed' || d.status === 'Lost') return false;
          const prospect = (d.prospectTenant ?? '').toLowerCase().trim();
          return prospect === tenantLower || prospect.includes(tenantLower) || tenantLower.includes(prospect);
        })
      : undefined;

    const inPlaceRent = row.inPlaceRent != null && row.leasableSF
      ? Math.round((row.inPlaceRent / row.leasableSF) * 100) / 100
      : row.inPlaceRent;

    rows.push({
      'Tenant': row.tenantName,
      'Building': row.building,
      'Space ID': row.spaceId,
      'Leasable SF': row.leasableSF,
      'In-Place Rent ($/SF)': inPlaceRent,
      'Lease End': fmtDate(leaseEndDate),
      'Days to Expiration': daysToExpiration,
      'Urgency': urgency,
      'Existing Renewal Deal': renewalDeal ? renewalDeal.dealName : null,
      'Tenant Rating': row.tenantRating,
      'Action Required': action,
      _urgOrder: urgOrder,
      _sf: row.leasableSF ?? 0,
      _daysToExp: daysToExpiration,
    });
  }

  // Sort: urgency bucket asc, leasable SF desc, days to expiration asc
  rows.sort(
    (a, b) => a._urgOrder - b._urgOrder || b._sf - a._sf || a._daysToExp - b._daysToExp,
  );

  return rows.map(({ _urgOrder: _u, _sf: _s, _daysToExp: _d, ...rest }) => rest);
}

// ──────────────────────────────────────────────────────────────────
// 3. Scenario Drift Report
// ──────────────────────────────────────────────────────────────────

interface ScenarioInputs {
  baseRatePSF?: number | null;
  leaseTermMonths?: number | null;
  freeRentMonths?: number | null;
  tiAllowancePSF?: number | null;
  proposedLeaseSF?: number | null;
}

function parseDriftValue(a: number | null | undefined, b: number | null | undefined): string | null {
  if (a == null || b == null) return null;
  if (a === b) return null;
  return `${a} → ${b}`;
}

export function buildScenarioDriftReport(
  scenarios: Scenario[],
  deals: Deal[],
  today: Date = new Date(),
): ReportRow[] {
  const terminalStatuses = new Set(['Executed', 'Lost', 'On Hold']);
  const activeDeals = deals.filter((d) => !terminalStatuses.has(d.status));

  const rows: (ReportRow & { _sevOrder: number; _driftCount: number })[] = [];

  for (const deal of activeDeals) {
    // Find the newest scenario for this deal
    const dealScenarios = scenarios.filter((s) => s.dealId === deal.id);
    if (dealScenarios.length === 0) continue;

    const newest = dealScenarios.reduce((best, s) => {
      const bestDate = safeDate(best.updatedAt);
      const sDate = safeDate(s.updatedAt);
      if (!bestDate) return s;
      if (!sDate) return best;
      return sDate > bestDate ? s : best;
    });

    const scenarioUpdatedAt = safeDate(newest.updatedAt);
    const daysSinceUpdate = scenarioUpdatedAt ? daysBetween(today, scenarioUpdatedAt) : 0;

    // Parse inputs — stored as unknown/JSON
    const inputs: ScenarioInputs =
      newest.inputs && typeof newest.inputs === 'object' ? (newest.inputs as ScenarioInputs) : {};

    const rentDrift = parseDriftValue(inputs.baseRatePSF, deal.targetRent);
    const termDrift = parseDriftValue(inputs.leaseTermMonths, deal.proposedTermMonths);
    const freeRentDrift = parseDriftValue(inputs.freeRentMonths, deal.freeRentMonths);
    const tiDrift = parseDriftValue(inputs.tiAllowancePSF, deal.tiPerSF);
    const sfDrift = parseDriftValue(inputs.proposedLeaseSF, deal.maxSF);

    const driftCount = [rentDrift, termDrift, freeRentDrift, tiDrift, sfDrift].filter(
      (v) => v !== null,
    ).length;

    if (driftCount === 0) continue;

    let severity: string;
    let sevOrder: number;
    let action: string;
    if (driftCount >= 4 || (driftCount >= 1 && daysSinceUpdate > 60)) {
      severity = 'Major';
      sevOrder = 0;
      action = 'Re-run underwriting immediately';
    } else if (driftCount >= 2) {
      severity = 'Moderate';
      sevOrder = 1;
      action = 'Review and refresh scenario';
    } else {
      severity = 'Minor';
      sevOrder = 2;
      action = 'Check at next review';
    }

    rows.push({
      'Deal Name': deal.dealName,
      'Scenario Name': newest.name,
      'Last Updated': fmtDate(scenarioUpdatedAt),
      'Days Since Update': daysSinceUpdate,
      'Rent Drift': rentDrift,
      'Term Drift': termDrift,
      'Free Rent Drift': freeRentDrift,
      'TI Drift': tiDrift,
      'SF Drift': sfDrift,
      'Drift Count': driftCount,
      'Severity': severity,
      'Suggested Action': action,
      _sevOrder: sevOrder,
      _driftCount: driftCount,
    });
  }

  rows.sort((a, b) => a._sevOrder - b._sevOrder || b._driftCount - a._driftCount);

  return rows.map(({ _sevOrder: _s, _driftCount: _d, ...rest }) => rest);
}

// ──────────────────────────────────────────────────────────────────
// 4. Tax Appeal Report
// ──────────────────────────────────────────────────────────────────

const TAX_URGENCY_ORDER: Record<string, number> = {
  'Hearing This Week': 0,
  'Hearing This Month': 1,
  'Hearing in 30-60 Days': 2,
  'Stalled': 3,
  'Missing Data': 4,
};

export function buildTaxAppealReport(
  appeals: PropertyTaxAppeal[],
  today: Date = new Date(),
): ReportRow[] {
  const openStatuses = new Set(['Considering', 'Filed', 'Under Review', 'Hearing Scheduled']);
  const openAppeals = appeals.filter((a) => openStatuses.has(a.status));

  const rows: (ReportRow & { _urgOrder: number; _daysToHearing: number })[] = [];

  for (const appeal of openAppeals) {
    const hearingDate = safeDate(appeal.hearingDate);
    const daysToHearing = hearingDate ? daysBetween(hearingDate, today) : null;
    const updatedAt = safeDate(appeal.updatedAt);
    const daysSinceUpdate = updatedAt ? daysBetween(today, updatedAt) : 0;

    let urgency: string | null = null;
    let action: string | null = null;

    if (hearingDate && daysToHearing !== null && daysToHearing <= 7) {
      urgency = 'Hearing This Week';
      action = 'Prepare for hearing';
    } else if (hearingDate && daysToHearing !== null && daysToHearing <= 30) {
      urgency = 'Hearing This Month';
      action = 'Finalize preparation';
    } else if (hearingDate && daysToHearing !== null && daysToHearing <= 60) {
      urgency = 'Hearing in 30-60 Days';
      action = 'Schedule preparation';
    } else if (appeal.status === 'Considering' && daysSinceUpdate > 30) {
      urgency = 'Stalled';
      action = 'Make file/withdraw decision';
    } else if (
      appeal.proposedValue == null ||
      appeal.marketValue == null ||
      appeal.parcelNumber == null
    ) {
      urgency = 'Missing Data';
      action = 'Complete appeal data';
    } else {
      continue; // nothing to flag
    }

    // Estimated savings: (assessed - proposed) * 2% mill rate
    const savingsEstimate =
      appeal.assessedValue != null && appeal.proposedValue != null
        ? Math.round((appeal.assessedValue - appeal.proposedValue) * 0.02)
        : null;

    // Missing data fields
    const missingFields: string[] = [];
    if (appeal.proposedValue == null) missingFields.push('proposedValue');
    if (appeal.marketValue == null) missingFields.push('marketValue');
    if (appeal.parcelNumber == null) missingFields.push('parcelNumber');

    rows.push({
      'Building': appeal.building,
      'Tax Year': appeal.taxYear,
      'Parcel Number': appeal.parcelNumber,
      'Jurisdiction': appeal.jurisdiction,
      'Assessed Value': appeal.assessedValue,
      'Proposed Value': appeal.proposedValue,
      'Savings Estimate': savingsEstimate,
      'Hearing Date': fmtDate(hearingDate),
      'Days to Hearing': daysToHearing,
      'Status': appeal.status,
      'Consultant': appeal.consultantName,
      'Fee %': appeal.consultantFeePct != null ? Math.round(appeal.consultantFeePct * 10000) / 100 : null,
      'Missing Data': missingFields.length > 0 ? missingFields.join(', ') : null,
      'Urgency': urgency,
      'Action': action,
      _urgOrder: TAX_URGENCY_ORDER[urgency] ?? 99,
      _daysToHearing: daysToHearing ?? 9999,
    });
  }

  rows.sort((a, b) => a._urgOrder - b._urgOrder || a._daysToHearing - b._daysToHearing);

  return rows.map(({ _urgOrder: _u, _daysToHearing: _d, ...rest }) => rest);
}

// ──────────────────────────────────────────────────────────────────
// 5. Construction Followup Report
// ──────────────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
const CONSTRUCTION_URGENCY_ORDER: Record<string, number> = {
  'Overdue': 0,
  'Due This Week': 1,
  'Due This Month': 2,
  'Stalled': 3,
  'No Due Date': 4,
};

export function buildConstructionFollowupReport(
  items: AMPendingItem[],
  today: Date = new Date(),
): ReportRow[] {
  const activeStatuses = new Set(['Open', 'In Progress', 'Waiting']);
  const filtered = items.filter(
    (i) => i.itemType === 'Construction Followup' && activeStatuses.has(i.status),
  );

  const rows: (ReportRow & {
    _priOrder: number;
    _urgOrder: number;
    _daysOverdue: number;
    _daysToDue: number;
  })[] = [];

  for (const item of filtered) {
    const dueDate = safeDate(item.dueDate);
    const updatedAt = safeDate(item.updatedAt);
    const daysSinceUpdate = updatedAt ? daysBetween(today, updatedAt) : 0;

    let daysOverdueOrToDue: number | null = null;
    if (dueDate) {
      daysOverdueOrToDue = daysBetween(today, dueDate); // positive = overdue
    }

    let urgency: string | null = null;
    let action: string | null = null;

    if (dueDate && daysOverdueOrToDue !== null && daysOverdueOrToDue > 0) {
      urgency = 'Overdue';
      action = 'Follow up immediately';
    } else if (dueDate && daysOverdueOrToDue !== null && -daysOverdueOrToDue <= 7) {
      urgency = 'Due This Week';
      action = 'Complete this week';
    } else if (dueDate && daysOverdueOrToDue !== null && -daysOverdueOrToDue <= 30) {
      urgency = 'Due This Month';
      action = 'Schedule completion';
    } else if (
      (item.status === 'Waiting' && daysSinceUpdate > 14) ||
      daysSinceUpdate > 30
    ) {
      urgency = 'Stalled';
      action = 'Request update from owner';
    } else if (dueDate == null && item.priority === 'High') {
      urgency = 'No Due Date';
      action = 'Assign due date';
    } else {
      continue; // nothing to flag
    }

    // Display column: positive = overdue, negative = days until due
    const displayDays = daysOverdueOrToDue ?? null;

    rows.push({
      'Title': item.title,
      'Building': item.buildingName,
      'Owner': item.owner,
      'Priority': item.priority,
      'Due Date': fmtDate(dueDate),
      'Days Overdue / To Due': displayDays,
      'Status': item.status,
      'Description': item.description,
      'Source': item.source,
      'Last Updated': fmtDate(updatedAt),
      'Urgency': urgency,
      'Action': action,
      _priOrder: PRIORITY_ORDER[item.priority] ?? 99,
      _urgOrder: CONSTRUCTION_URGENCY_ORDER[urgency] ?? 99,
      _daysOverdue: daysOverdueOrToDue !== null && daysOverdueOrToDue > 0 ? daysOverdueOrToDue : 0,
      _daysToDue: daysOverdueOrToDue !== null && daysOverdueOrToDue <= 0 ? -daysOverdueOrToDue : 9999,
    });
  }

  // Sort: priority (High first), then days overdue desc (for overdue), then days to due asc
  rows.sort(
    (a, b) =>
      a._priOrder - b._priOrder ||
      b._daysOverdue - a._daysOverdue ||
      a._daysToDue - b._daysToDue,
  );

  return rows.map(({ _priOrder: _p, _urgOrder: _u, _daysOverdue: _o, _daysToDue: _t, ...rest }) => rest);
}
