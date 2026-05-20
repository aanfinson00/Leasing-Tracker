import { useTheme } from '../theme';

export interface ChartColors {
  accent: string;
  accentSoft: string;
  success: string;
  danger: string;
  warning: string;
  fg: string;
  fgMuted: string;
  fgSubtle: string;
  border: string;
  bgElevated: string;
  bgSubtle: string;
  // A 6-color rotating palette for categorical data (markets, deals)
  // Picked to be distinguishable in both themes.
  palette: string[];
}

const LIGHT: ChartColors = {
  accent: '#c96442',
  accentSoft: 'rgba(201, 100, 66, 0.18)',
  success: '#4f8a4d',
  danger: '#c54a3a',
  warning: '#c98a42',
  fg: '#1f1e1b',
  fgMuted: '#58564f',
  fgSubtle: '#8e8b81',
  border: '#e4e1d3',
  bgElevated: '#ffffff',
  bgSubtle: '#f0efe8',
  palette: ['#c96442', '#4f8a4d', '#5b7fb8', '#a07cb0', '#c98a42', '#5fa5a0'],
};

const DARK: ChartColors = {
  accent: '#d97757',
  accentSoft: 'rgba(217, 119, 87, 0.22)',
  success: '#6ba968',
  danger: '#e07060',
  warning: '#e0a05a',
  fg: '#f5f4ed',
  fgMuted: '#a5a29c',
  fgSubtle: '#75736d',
  border: '#3a3833',
  bgElevated: '#2a2826',
  bgSubtle: '#34322e',
  palette: ['#d97757', '#6ba968', '#7a9fd0', '#b596c8', '#e0a05a', '#7dc1bb'],
};

export function useChartColors(): ChartColors {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === 'dark' ? DARK : LIGHT;
}

// Stable color picker for a categorical key (e.g., market name)
export function colorFor(key: string, palette: string[]): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return palette[Math.abs(hash) % palette.length];
}
