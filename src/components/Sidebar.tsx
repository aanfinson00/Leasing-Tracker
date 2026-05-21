import { Briefcase, Building, ClipboardCheck, BarChart3, Settings, Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

const PASSWORD_HASH_CONFIGURED = !!(import.meta.env.VITE_PASSWORD_HASH ?? '').trim();

export type View = 'prospects' | 'rentroll' | 'onboarding' | 'reports';

interface NavItem {
  id: View | 'placeholder';
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'prospects', icon: Briefcase, label: 'Prospects' },
  { id: 'rentroll', icon: Building, label: 'Rent Roll' },
  { id: 'onboarding', icon: ClipboardCheck, label: 'Onboarding' },
  { id: 'reports', icon: BarChart3, label: 'Reports' },
  { id: 'placeholder', icon: Settings, label: 'Settings (coming soon)', disabled: true },
];

interface SidebarProps {
  view: View;
  onChangeView: (v: View) => void;
}

export function Sidebar({ view, onChangeView }: SidebarProps) {
  return (
    <aside className="hidden sm:flex flex-col items-center w-[68px] shrink-0 bg-bg-subtle/60 h-screen sticky top-0 py-5 z-20">
      <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-accent text-accent-fg shadow-soft mb-6">
        <span className="font-semibold text-sm leading-none tracking-tight">LT</span>
      </div>

      <nav className="flex flex-col items-center gap-1.5 flex-1">
        {NAV_ITEMS.map(({ id, icon: Icon, label, disabled }, idx) => {
          const active = !disabled && id === view;
          return (
            <button
              key={`${id}-${idx}`}
              type="button"
              title={label}
              disabled={disabled}
              onClick={() => !disabled && id !== 'placeholder' && onChangeView(id as View)}
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
