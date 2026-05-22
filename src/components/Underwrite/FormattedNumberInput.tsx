// Lifted from Lease-Calculator/components/ui/formatted-number-input.tsx
// on 2026-05-22. Number input that shows formatted (commas, $, %) when
// not focused, raw digits when focused. Strips $,%,etc on paste so
// Excel copy/paste works.

import { useState } from 'react';

export type NumberFormat = 'sf' | 'currency' | 'percent' | 'integer';

interface Props {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  format?: NumberFormat;
  /** Stored as fraction (0.03), shown as percent units (3.00). */
  percent?: boolean;
  /** Allow clearing → undefined. Otherwise empty input is ignored. */
  optional?: boolean;
  placeholder?: string;
  className?: string;
}

const BASE_CLASS =
  'h-8 w-full px-2 text-sm tabular-nums bg-bg-elevated border border-border rounded-md ' +
  'text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent/40';

export function FormattedNumberInput({
  value,
  onChange,
  format,
  percent = false,
  optional = false,
  placeholder,
  className,
}: Props) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');

  const display = focused
    ? draft
    : value == null
      ? ''
      : formatPretty(percent ? value * 100 : value, format);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      placeholder={placeholder}
      onFocus={() => {
        setFocused(true);
        setDraft(value == null ? '' : (percent ? value * 100 : value).toString());
      }}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        const v = e.target.value;
        setDraft(v);
        if (v.trim() === '') {
          if (optional) onChange(undefined);
          return;
        }
        const parsed = parseNumberInput(v);
        if (parsed == null) return;
        onChange(percent ? parsed / 100 : parsed);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      className={[BASE_CLASS, className].filter(Boolean).join(' ')}
    />
  );
}

function formatPretty(value: number, format: NumberFormat | undefined): string {
  if (!Number.isFinite(value)) return '';
  switch (format) {
    case 'sf':
      return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
    case 'currency':
      return `$${value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    case 'percent':
      return `${value.toFixed(2)}%`;
    case 'integer':
      return Math.round(value).toLocaleString('en-US');
    default:
      return value.toString();
  }
}

function parseNumberInput(s: string): number | null {
  const cleaned = s.replace(/[,$%\s]/g, '').trim();
  if (cleaned === '' || cleaned === '-') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
