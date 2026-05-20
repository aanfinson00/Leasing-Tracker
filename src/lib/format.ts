export const formatCurrencyShort = (n: number): string => {
  if (!Number.isFinite(n)) return '–';
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

export const formatCurrency = (n: number | null | undefined): string =>
  n === null || n === undefined ? '–' : `$${n.toFixed(2)}`;

export const formatCurrencyWhole = (n: number | null | undefined): string =>
  n === null || n === undefined ? '–' : `$${Math.round(n).toLocaleString()}`;

export const formatSF = (n: number | null | undefined): string =>
  n === null || n === undefined ? '–' : `${n.toLocaleString()} SF`;

export const formatNumber = (n: number | null | undefined): string =>
  n === null || n === undefined ? '–' : n.toLocaleString();
