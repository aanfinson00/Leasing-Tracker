import { Briefcase, Clock, BarChart3, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface NavItem {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  disabled?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { icon: Briefcase, label: 'Deals', active: true },
  { icon: Clock, label: 'Expiring (coming soon)', disabled: true },
  { icon: BarChart3, label: 'Reports (coming soon)', disabled: true },
  { icon: Settings, label: 'Settings (coming soon)', disabled: true },
];

export function Sidebar() {
  return (
    <aside className="hidden sm:flex flex-col items-center w-[68px] shrink-0 bg-bg-subtle/60 h-screen sticky top-0 py-5 z-20">
      <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-accent text-accent-fg shadow-soft mb-6">
        <span className="font-semibold text-sm leading-none tracking-tight">LT</span>
      </div>

      <nav className="flex flex-col items-center gap-1.5 flex-1">
        {NAV_ITEMS.map(({ icon: Icon, label, active, disabled }) => (
          <button
            key={label}
            type="button"
            title={label}
            disabled={disabled}
            className={[
              'inline-flex items-center justify-center w-11 h-11 rounded-xl transition-all',
              active
                ? 'bg-bg-elevated text-accent shadow-soft'
                : disabled
                  ? 'text-fg-subtle/60 cursor-not-allowed'
                  : 'text-fg-muted hover:text-fg hover:bg-bg-elevated/70',
            ].join(' ')}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={19} strokeWidth={1.75} />
          </button>
        ))}
      </nav>

      <ThemeToggle />
    </aside>
  );
}
