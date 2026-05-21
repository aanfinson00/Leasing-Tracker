import type { OnboardingChecklist, OnboardingItem } from '../types';

export type OnboardingDept = 'D&C' | 'AM' | 'PM';

export const ONBOARDING_DEPTS: ReadonlyArray<OnboardingDept> = ['D&C', 'AM', 'PM'];

export const DEPT_LABEL: Record<OnboardingDept, string> = {
  'D&C': 'Development & Construction',
  AM: 'Asset Management',
  PM: 'Property Management',
};

export interface OnboardingTemplateItem {
  id: string;
  department: OnboardingDept;
  group: string;
  label: string;
  hint?: string;
}

// Greystar "New Customer Checklist" — firm-standard onboarding steps that
// fire once a lease is executed and promoted. IDs are stable so the
// template can evolve without orphaning per-record state.
export const ONBOARDING_TEMPLATE: ReadonlyArray<OnboardingTemplateItem> = [
  // ── Development & Construction ──────────────────────────────────
  { id: 'dc.savedown.executed-lease', department: 'D&C', group: 'Save Down',
    label: 'Fully Executed Lease' },
  { id: 'dc.savedown.executed-commission', department: 'D&C', group: 'Save Down',
    label: 'Fully Executed Commission / Listing Agreement' },
  { id: 'dc.savedown.word-lease', department: 'D&C', group: 'Save Down',
    label: 'Final Word Version of Lease' },
  { id: 'dc.savedown.word-commission', department: 'D&C', group: 'Save Down',
    label: 'Final Word Version of Commission / Listing Agreement' },

  { id: 'dc.commissions.working-capital', department: 'D&C', group: 'Commissions',
    label: 'Increase Working Capital If Required' },
  { id: 'dc.commissions.invoice-first-half', department: 'D&C', group: 'Commissions',
    label: 'Request First ½ Invoice from Both Brokers',
    hint: 'Pay as soon as possible — get with Acct on Special Request Form' },
  { id: 'dc.commissions.invoice-second-half', department: 'D&C', group: 'Commissions',
    label: 'Request Second ½ Invoice from Both Brokers',
    hint: 'Pay as soon as possible — get with Acct on Special Request Form' },

  { id: 'dc.thankyou.broker', department: 'D&C', group: 'Thank You',
    label: 'Procure broker thank you (note, lunch/dinner, etc.)' },

  { id: 'dc.finishes.review-tenant', department: 'D&C', group: 'Finish Selections',
    label: 'Review with Tenant and Select',
    hint: 'If applicable' },
  { id: 'dc.finishes.greystar-book', department: 'D&C', group: 'Finish Selections',
    label: 'Greystar Finishes Book provided' },

  { id: 'dc.comms.share-lender-equity', department: 'D&C', group: 'Communication',
    label: 'Share fully executed lease with Lender and Equity Partner' },

  { id: 'dc.docs.key-dates', department: 'D&C', group: 'Documentation',
    label: 'Document key dates in writing — save to SharePoint',
    hint: 'CO / TCO / Tenant Turnover' },

  { id: 'dc.welcomegift.order', department: 'D&C', group: 'Tenant Welcome Gift',
    label: 'Order welcome gift',
    hint: 'Locally or browse the Greystar merch store' },

  { id: 'dc.commencement.signed', department: 'D&C', group: 'Commencement Letters',
    label: 'Filled out & signed — save to SharePoint',
    hint: 'If applicable — work with D&C on dates' },

  { id: 'dc.om.cutsheets-asbuilts', department: 'D&C', group: 'O&M Manual / Warranties',
    label: 'Cutsheets, As-Builts, Warranties collected' },

  { id: 'dc.punchlist.signed', department: 'D&C', group: 'Tenant Punchlist',
    label: 'Walk with GC/CM, tenant-signed punchlist saved to SharePoint' },

  // ── Asset Management ────────────────────────────────────────────
  { id: 'am.override-fee', department: 'AM', group: 'Lease Override Fee',
    label: 'Sent to developmentap@greystar.com for normal draw cycle',
    hint: 'GLCP I deals only' },

  { id: 'am.cm-fee', department: 'AM', group: 'Construction Management Fee',
    label: 'CM fee structure and timing confirmed with accounting',
    hint: 'If Greystar is overseeing CM of TI work and collecting fees' },

  { id: 'am.touchbase.logistics', department: 'AM', group: 'Tenant Touch Base',
    label: 'Logistics leadership reached out during TI / move-in' },
  { id: 'am.touchbase.local', department: 'AM', group: 'Tenant Touch Base',
    label: 'Local team quarterly touch base invites sent',
    hint: 'Bagel drop-off, call to check in, etc.' },

  { id: 'am.ops-call', department: 'AM', group: 'Operating Performance Call',
    label: 'Recurring call with PM & DC set up',
    hint: 'Variances, distributions, budget set, reserves' },

  // ── Property Management ─────────────────────────────────────────
  { id: 'pm.coi.received', department: 'PM', group: 'Certificates of Insurance',
    label: 'COI received, confirmed correct, saved to SharePoint' },

  { id: 'pm.signage', department: 'PM', group: 'Signage',
    label: 'Building / Door / Monument / Dock numbering coordinated',
    hint: 'Provide vendor contacts, Greystar specs, ultimate approval' },

  { id: 'pm.welcome.packet', department: 'PM', group: 'Welcome Packet',
    label: 'Professional Greystar-branded packet printed',
    hint: 'Contacts, rent payment instructions, rent schedule, sample COIs, utilities' },
  { id: 'pm.welcome.letter', department: 'PM', group: 'Welcome Packet',
    label: 'Tenant Welcome Letter sent' },

  { id: 'pm.utilities.switched', department: 'PM', group: 'Utilities',
    label: 'Utilities switched over confirmed' },

  { id: 'pm.landscaping', department: 'PM', group: 'Landscaping / Snow Removal',
    label: 'Contract signed',
    hint: 'Work with D&C / AM' },

  { id: 'pm.locksmith.keys', department: 'PM', group: 'Locksmith',
    label: 'New keys delivered to tenant day of move-in' },
  { id: 'pm.locksmith.inspection', department: 'PM', group: 'Locksmith',
    label: 'Move-in Inspection Form signed, saved to SharePoint' },

  { id: 'pm.rent-deposit', department: 'PM', group: 'First Month Rent / Security Deposit',
    label: 'Paid in full confirmed' },

  { id: 'pm.hvac', department: 'PM', group: 'Preventative Maintenance HVAC',
    label: 'HVAC PM contract received from tenant' },
];

const TEMPLATE_BY_ID: Map<string, OnboardingTemplateItem> = new Map(
  ONBOARDING_TEMPLATE.map((t) => [t.id, t])
);

export function getTemplateItem(itemId: string): OnboardingTemplateItem | undefined {
  return TEMPLATE_BY_ID.get(itemId);
}

export function getOnboardingFor(
  all: OnboardingChecklist[],
  rentRollId: string
): OnboardingChecklist | undefined {
  return all.find((o) => o.rentRollId === rentRollId);
}

export interface OnboardingProgress {
  done: number;
  total: number;
  pct: number;
  byDept: Record<OnboardingDept, { done: number; total: number }>;
  isComplete: boolean;
}

export function computeProgress(checklist: OnboardingChecklist): OnboardingProgress {
  const byDept: Record<OnboardingDept, { done: number; total: number }> = {
    'D&C': { done: 0, total: 0 },
    AM: { done: 0, total: 0 },
    PM: { done: 0, total: 0 },
  };
  const checkedByItemId = new Map(checklist.items.map((i) => [i.itemId, i.checked]));
  for (const t of ONBOARDING_TEMPLATE) {
    byDept[t.department].total += 1;
    if (checkedByItemId.get(t.id) === true) byDept[t.department].done += 1;
  }
  const total = ONBOARDING_TEMPLATE.length;
  const done = byDept['D&C'].done + byDept.AM.done + byDept.PM.done;
  return {
    done,
    total,
    pct: total === 0 ? 0 : Math.round((done / total) * 100),
    byDept,
    isComplete: done === total && total > 0,
  };
}

// Reconcile a loaded checklist with the current template:
//  - Inject template items missing from the stored record (forward-compat).
//  - Preserve unknown itemIds so a downgrade still round-trips.
export function reconcileWithTemplate(c: OnboardingChecklist): OnboardingChecklist {
  const haveIds = new Set(c.items.map((i) => i.itemId));
  const missing: OnboardingItem[] = [];
  for (const t of ONBOARDING_TEMPLATE) {
    if (!haveIds.has(t.id)) {
      missing.push({
        itemId: t.id,
        checked: false,
        notes: null,
        link: null,
        completedAt: null,
      });
    }
  }
  if (missing.length === 0) return c;
  return { ...c, items: [...c.items, ...missing] };
}

export function makeBlankItems(): OnboardingItem[] {
  return ONBOARDING_TEMPLATE.map((t) => ({
    itemId: t.id,
    checked: false,
    notes: null,
    link: null,
    completedAt: null,
  }));
}
