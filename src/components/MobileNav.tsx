// Bottom navigation bar shown only on narrow viewports (where the
// desktop sidebar is hidden). Mirrors the sidebar's nav items as a
// horizontally-scrollable strip of icon + label buttons pinned to
// the bottom of the screen.

import { Briefcase, Building, ClipboardCheck, BarChart3, Calculator, MapPin, HardHat, Crosshair, HandCoins, ListChecks, Database, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { View } from './Sidebar';

interface NavItem {
  id: View;
  icon: LucideIcon;
  label: string;
}

// Short labels — bottom bar real estate is tight on phones.
const NAV_ITEMS: NavItem[] = [
  { id: 'prospects', icon: Briefcase, label: 'Activity' },
  { id: 'rentroll', icon: Building, label: 'Portfolio' },
  { id: 'underwrite', icon: Calculator, label: 'Calc' },
  { id: 'comps', icon: Database, label: 'Comps' },
  { id: 'contacts', icon: Users, label: 'People' },
  { id: 'map', icon: MapPin, label: 'Map' },
  { id: 'onboarding', icon: ClipboardCheck, label: 'Onboard' },
  { id: 'reports', icon: BarChart3, label: 'Reports' },
  { id: 'acquisitions', icon: Crosshair, label: 'Acq' },
  { id: 'development', icon: HardHat, label: 'Dev' },
  { id: 'asset-mgmt', icon: ListChecks, label: 'AM Open' },
  { id: 'disposition', icon: HandCoins, label: 'Dispo' },
];

interface Props {
  view: View;
  onChangeView: (v: View) => void;
}

export function MobileNav({ view, onChangeView }: Props) {
  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-bg-elevated border-t border-border shadow-lift"
      // Safe-area inset so iPhone home indicator doesn't sit under tap targets
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary navigation"
    >
      <div className="flex items-stretch justify-around overflow-x-auto">
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
          const active = id === view;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChangeView(id)}
              className={[
                'flex flex-col items-center justify-center gap-0.5 px-2 py-2 min-w-[56px] flex-1 transition-colors',
                active ? 'text-accent' : 'text-fg-muted hover:text-fg',
              ].join(' ')}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={18} strokeWidth={active ? 2 : 1.75} />
              <span className="text-[9px] font-medium leading-none mt-0.5">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
