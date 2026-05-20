import { Briefcase, Clock, BarChart3, Settings, User } from 'lucide-react';
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
    <aside className="hidden sm:flex flex-col items-center w-[60px] shrink-0 border-r border-border bg-bg-elevated h-screen sticky top-0 py-3 z-20">
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent text-accent-fg font-bold text-sm tracking-tight mb-4">
        LT
      </div>

      <nav className="flex flex-col items-center gap-1 flex-1">
        {NAV_ITEMS.map(({ icon: Icon, label, active, disabled }) => (
          <button
            key={label}
            type="button"
            title={label}
            disabled={disabled}
            className={[
              'inline-flex items-center justify-center w-10 h-10 rounded-md transition-colors',
              active
                ? 'bg-accent-soft text-accent'
                : disabled
                  ? 'text-fg-subtle cursor-not-allowed opacity-50'
                  : 'text-fg-muted hover:text-fg hover:bg-bg-hover',
            ].join(' ')}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={20} strokeWidth={2} />
          </button>
        ))}
      </nav>

      <div className="flex flex-col items-center gap-1 mt-auto">
        <ThemeToggle />
        <button
          type="button"
          title="Account (coming soon)"
          disabled
          className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-bg-subtle text-fg-muted text-xs font-semibold cursor-not-allowed"
        >
          <User size={16} strokeWidth={2} />
        </button>
      </div>
    </aside>
  );
}
