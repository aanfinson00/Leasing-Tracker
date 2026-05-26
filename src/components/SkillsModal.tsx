import { X, Download, Eye, Cpu, Search, FileText, Bell } from 'lucide-react';

interface Skill {
  name: string;
  type: 'Watcher' | 'Intake' | 'Composer';
  description: string;
  triggers: string[];
}

const SKILLS: Skill[] = [
  {
    name: 'prospect-intake',
    type: 'Intake',
    description: 'Extracts a structured Deal record from free-form text — forwarded emails, broker call notes, or a pasted tenant inquiry.',
    triggers: ['"new prospect"', '"log this prospect"', '"add this tenant"', '"I just got off a call with X"'],
  },
  {
    name: 'lease-abstract-from-pdf',
    type: 'Intake',
    description: 'Reads a lease PDF, LOI, or proposal and extracts rent, term, escalations, TI, free rent, options, and key dates into structured data.',
    triggers: ['"abstract this lease"', '"pull terms from this"', '"extract the rent schedule"'],
  },
  {
    name: 'property-tax-appeal-intake',
    type: 'Intake',
    description: 'Logs a new property tax appeal — captures parcel, jurisdiction, tax year, assessed vs proposed value, key dates, and consultant terms.',
    triggers: ['"log an appeal"', '"new tax appeal"', '"got the assessment for X — let\'s contest"'],
  },
  {
    name: 'get-status-update',
    type: 'Composer',
    description: 'Searches Gmail for recent threads with the prospect or broker, then drafts an activity entry summarizing the latest status.',
    triggers: ['"status on X"', '"what\'s the latest with X"', '"any update from X?"'],
  },
  {
    name: 'weekly-portfolio-digest',
    type: 'Composer',
    description: 'Runs all watcher skills and synthesizes a Monday-morning portfolio brief — one page covering stale prospects, expiring leases, and drifted scenarios.',
    triggers: ['"weekly digest"', '"Monday digest"', '"portfolio pulse"', '"what should I focus on this week"'],
  },
  {
    name: 'stale-prospect-flagger',
    type: 'Watcher',
    description: 'Scans deals + activities and flags prospects with no recent activity for their current pipeline stage.',
    triggers: ['"what\'s going stale?"', '"any deals slipping?"', '"what needs follow-up?"'],
  },
  {
    name: 'lease-expiration-watcher',
    type: 'Watcher',
    description: 'Scans the rent roll for leases expiring in the next N months and flags them for renewal action.',
    triggers: ['"what\'s expiring?"', '"show me renewals coming up"', '"lease expiration pulse"'],
  },
  {
    name: 'scenario-drift-watcher',
    type: 'Watcher',
    description: 'Compares saved underwriting scenarios against current deal inputs and flags where cached results are out of sync.',
    triggers: ['"any stale scenarios?"', '"scenarios out of sync"', '"underwrite drift"'],
  },
  {
    name: 'property-tax-appeal-watcher',
    type: 'Watcher',
    description: 'Flags property tax appeals with upcoming hearings, stale "Considering" status, or missing valuation data.',
    triggers: ['"what tax appeals are coming up?"', '"tax hearing schedule"', '"any appeals slipping?"'],
  },
  {
    name: 'construction-followup-watcher',
    type: 'Watcher',
    description: 'Scans AM pending items for construction follow-ups that are overdue, due this week, or stalled.',
    triggers: ['"what construction items are open?"', '"punch list status"', '"GC chase list"'],
  },
];

const TYPE_CONFIG = {
  Watcher: { icon: Bell, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30' },
  Intake: { icon: FileText, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
  Composer: { icon: Search, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30' },
};

const REPO_URL = 'https://github.com/aanfinson00/Leasing-Tracker';

interface SkillsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SkillsModal({ open, onClose }: SkillsModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-fg/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative bg-bg rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] flex flex-col overflow-hidden border border-border">
        {/* Header */}
        <div className="sticky top-0 bg-bg/90 backdrop-blur-md border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <Cpu size={20} className="text-accent" />
            <h2 className="text-lg font-semibold text-fg">AI Skills</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-fg-muted hover:text-fg hover:bg-bg-elevated transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <p className="text-sm text-fg-muted leading-relaxed">
            These are the automated workflows Claude can run on your behalf in this app.
            Each skill is a plain-text file that defines exactly what Claude does — you can
            download and inspect them for full transparency.
          </p>

          {/* Download section */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-subtle border border-border">
            <Download size={16} className="text-fg-muted shrink-0" />
            <div className="flex-1 text-sm">
              <span className="text-fg">Download &amp; inspect all skills: </span>
              <a
                href={`${REPO_URL}/tree/main/.claude/skills`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline font-medium"
              >
                View on GitHub
              </a>
              <span className="text-fg-muted"> or </span>
              <a
                href={`${REPO_URL}/archive/refs/heads/main.zip`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline font-medium"
              >
                Download ZIP
              </a>
              <span className="text-fg-muted"> → look in </span>
              <code className="text-xs bg-bg-elevated px-1.5 py-0.5 rounded">.claude/skills/</code>
            </div>
          </div>

          {/* Type legend */}
          <div className="flex flex-wrap gap-3 text-xs">
            {Object.entries(TYPE_CONFIG).map(([type, { icon: Icon, color, bg }]) => (
              <span key={type} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${bg} ${color} font-medium`}>
                <Icon size={12} />
                {type}
              </span>
            ))}
          </div>

          {/* Skills list */}
          <div className="space-y-3">
            {SKILLS.map((skill) => {
              const { icon: TypeIcon, color, bg } = TYPE_CONFIG[skill.type];
              return (
                <div key={skill.name} className="rounded-xl border border-border p-4 space-y-2 hover:border-border-emphasis transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${color}`}>
                      <TypeIcon size={11} />
                      {skill.type}
                    </span>
                    <span className="font-mono text-sm font-medium text-fg">{skill.name}</span>
                    <a
                      href={`${REPO_URL}/blob/main/.claude/skills/${skill.name}/SKILL.md`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto inline-flex items-center gap-1 text-xs text-fg-muted hover:text-accent transition-colors"
                      title="View source"
                    >
                      <Eye size={13} />
                      Source
                    </a>
                  </div>
                  <p className="text-sm text-fg-muted leading-relaxed">{skill.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {skill.triggers.map((t) => (
                      <span key={t} className="text-xs bg-bg-subtle text-fg-muted px-2 py-0.5 rounded-md border border-border">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
