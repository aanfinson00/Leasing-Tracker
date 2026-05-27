import { Briefcase, Building, ClipboardCheck, BarChart3, Calculator, MapPin, HardHat, Crosshair, HandCoins, ListChecks, Database, Users, Lock, Cpu, ExternalLink } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { ParceIcon } from './ParceIcon';

const PASSWORD_HASH_CONFIGURED = !!(import.meta.env.VITE_PASSWORD_HASH ?? '').trim();

export type View =
  | 'prospects'
  | 'rentroll'
  | 'underwrite'
  | 'comps'
  | 'contacts'
  | 'map'
  | 'onboarding'
  | 'reports'
  | 'acquisitions'
  | 'development'
  | 'disposition'
  | 'asset-mgmt';

interface NavItem {
  id: View | 'placeholder' | `external:${string}`;
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
  href?: string;   // When set, the button opens this URL in a new tab and
                   // does NOT change the internal view.
}

// Display LABELS only — the internal `view` keys ('prospects',
// 'rentroll', 'underwrite') stay unchanged so realtime/persistence
// keyed on them keeps working.
const NAV_ITEMS: NavItem[] = [
  { id: 'prospects', icon: Briefcase, label: 'Leasing Activity' },
  { id: 'rentroll', icon: Building, label: 'Portfolio' },
  { id: 'underwrite', icon: Calculator, label: 'Lease Calculator' },
  { id: 'comps', icon: Database, label: 'Comps Library' },
  { id: 'contacts', icon: Users, label: 'Contacts' },
  { id: 'map', icon: MapPin, label: 'Map' },
  { id: 'onboarding', icon: ClipboardCheck, label: 'Onboarding' },
  { id: 'reports', icon: BarChart3, label: 'Reports' },
  // Lifecycle pipeline tabs — placeholders for now.
  { id: 'acquisitions', icon: Crosshair, label: 'Acquisitions Pipeline' },
  { id: 'development', icon: HardHat, label: 'Development Pipeline' },
  { id: 'asset-mgmt', icon: ListChecks, label: 'Asset Mgmt Pending' },
  { id: 'disposition', icon: HandCoins, label: 'Disposition Tracking' },
  // External links — open in a new tab, not an internal view.
  { id: 'external:sitesetter', icon: ExternalLink, label: 'SiteSetter ↗', href: 'https://sitesetter.io' },
];

interface SidebarProps {
  view: View;
  onChangeView: (v: View) => void;
  onOpenSkills: () => void;
}

export function Sidebar({ view, onChangeView, onOpenSkills }: SidebarProps) {
  return (
    <aside className="hidden sm:flex flex-col items-center w-[68px] shrink-0 bg-bg-subtle/60 h-screen sticky top-0 py-5 z-20">
      {/* Parce mark — 3x3 copper grid with the playbook tilt. */}
      <div className="flex items-center justify-center w-11 h-11 mb-6" title="parce">
        <ParceIcon size="sm" variant="on-light" />
      </div>

      <nav className="flex flex-col items-center gap-1.5 flex-1">
        {NAV_ITEMS.map(({ id, icon: Icon, label, disabled, href }, idx) => {
          const isExternal = !!href;
          const active = !disabled && !isExternal && id === view;
          return (
            <button
              key={`${id}-${idx}`}
              type="button"
              title={label}
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                if (isExternal && href) {
                  window.open(href, '_blank', 'noopener,noreferrer');
                  return;
                }
                if (id !== 'placeholder' && !id.startsWith('external:')) {
                  onChangeView(id as View);
                }
              }}
              className={[
                'inline-flex items-center justify-center w-11 h-11 rounded-xl transition-all',
                active
                  ? 'bg-bg-elevated text-accent shadow-soft'
                  : disabled
                    ? 'text-fg-subtle cursor-not-allowed opacity-50'
                    : 'text-fg-muted hover:text-fg hover:bg-bg-elevated/70',
              ].join(' ')}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={19} strokeWidth={1.75} />
            </button>
          );
        })}
      </nav>

      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={onOpenSkills}
          title="AI Skills"
          aria-label="AI Skills"
          className="inline-flex items-center justify-center w-11 h-11 rounded-xl text-fg-muted hover:text-fg hover:bg-bg-elevated/70 transition-all"
        >
          <Cpu size={19} strokeWidth={1.75} />
        </button>
        <ThemeToggle />
        {PASSWORD_HASH_CONFIGURED && (
          <button
            type="button"
            onClick={() => {
              if (confirm('Log out? You will need to re-enter the password.')) {
                localStorage.removeItem('app:unlocked');
                window.location.reload();
              }
            }}
            title="Log out"
            aria-label="Log out"
            className="inline-flex items-center justify-center w-11 h-11 rounded-xl text-fg-muted hover:text-fg hover:bg-bg-elevated/70 transition-all"
          >
            <Lock size={19} strokeWidth={1.75} />
          </button>
        )}
      </div>
    </aside>
  );
}
