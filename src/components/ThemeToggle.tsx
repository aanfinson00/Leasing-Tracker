import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../theme';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const cycle = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  const Icon = theme === 'system' ? Monitor : theme === 'dark' ? Moon : Sun;
  const label =
    theme === 'system' ? 'System theme' : theme === 'dark' ? 'Dark theme' : 'Light theme';

  return (
    <button
      type="button"
      onClick={cycle}
      title={`${label} (click to change)`}
      className="inline-flex items-center justify-center w-9 h-9 rounded-md text-fg-muted hover:text-fg hover:bg-bg-hover transition-colors"
      aria-label={label}
    >
      <Icon size={18} strokeWidth={2} />
    </button>
  );
}
