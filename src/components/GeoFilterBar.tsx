// =============================================================================
// GeoFilterBar — shared market / submarket / county / city filter chips
//
// Drops into DevelopmentView / AcquisitionsView / DispositionView. Drives
// the GeoFilters state (see useGeoFilters). Counties / cities controls are
// hidden when there are no polygons of that layer available, so the empty
// scaffold files don't surface dead controls.
// =============================================================================

import { useMemo, useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import {
  AVAILABLE_MARKETS,
  AVAILABLE_COUNTIES,
  AVAILABLE_CITIES,
  submarketsForMarket,
} from '../lib/geo-tagger';
import type { GeoFilters } from '../lib/useGeoFilters';

interface Props {
  filters: GeoFilters;
  onChange: (next: GeoFilters | ((prev: GeoFilters) => GeoFilters)) => void;
  onReset: () => void;
  // Optional: surface available submarket/county/city values found in the
  // current row set so chips reflect what's actually filterable. Falls back
  // to AVAILABLE_* constants when omitted.
  visibleSubmarkets?: string[];
  visibleCounties?: string[];
  visibleCities?: string[];
}

const MarketChip = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={[
      'inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer select-none whitespace-nowrap',
      active
        ? 'bg-accent-soft text-accent shadow-soft'
        : 'bg-bg-elevated text-fg-muted hover:text-fg hover:bg-bg-hover shadow-soft',
    ].join(' ')}
  >
    {label}
  </button>
);

interface MultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}

function MultiSelect({ label, options, selected, onChange }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const summary = useMemo(() => {
    if (selected.length === 0) return `${label} (all)`;
    if (selected.length === 1) return `${label}: ${selected[0]}`;
    return `${label}: ${selected.length} selected`;
  }, [label, selected]);

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={[
          'inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer select-none whitespace-nowrap shadow-soft',
          selected.length > 0
            ? 'bg-accent-soft text-accent'
            : 'bg-bg-elevated text-fg-muted hover:text-fg hover:bg-bg-hover',
        ].join(' ')}
        aria-expanded={open}
      >
        {summary}
        <span className="ml-1 opacity-60">▾</span>
      </button>

      {open && (
        <div
          className="absolute z-30 mt-1 min-w-[200px] max-h-[280px] overflow-y-auto rounded-md bg-bg-elevated shadow-lift border border-border py-1"
          style={{ right: 0 }}
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-fg-muted">No {label.toLowerCase()} available</div>
          ) : (
            options.map((opt) => {
              const checked = selected.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggle(opt)}
                  className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs hover:bg-bg-hover"
                >
                  <span
                    className={[
                      'inline-block w-3 h-3 rounded-sm border',
                      checked ? 'bg-accent border-accent' : 'border-border bg-transparent',
                    ].join(' ')}
                  />
                  <span className={checked ? 'text-fg' : 'text-fg-muted'}>{opt}</span>
                </button>
              );
            })
          )}
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full text-left px-3 py-1.5 text-[11px] text-fg-muted hover:bg-bg-hover border-t border-border mt-1"
            >
              Clear {label.toLowerCase()}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function GeoFilterBar({
  filters,
  onChange,
  onReset,
  visibleSubmarkets,
  visibleCounties,
  visibleCities,
}: Props) {
  const submarketOptions = useMemo(() => {
    const fromMarket = submarketsForMarket(filters.market);
    if (!visibleSubmarkets) return fromMarket;
    // Only show submarkets that are both (a) in the selected market and
    // (b) actually present in the row set, so dead options don't appear.
    const set = new Set(visibleSubmarkets);
    return fromMarket.filter((s) => set.has(s));
  }, [filters.market, visibleSubmarkets]);

  const countyOptions = useMemo(() => {
    if (visibleCounties && visibleCounties.length > 0) return visibleCounties;
    return AVAILABLE_COUNTIES;
  }, [visibleCounties]);

  const cityOptions = useMemo(() => {
    if (visibleCities && visibleCities.length > 0) return visibleCities;
    return AVAILABLE_CITIES;
  }, [visibleCities]);

  const hasAny =
    !!filters.market ||
    filters.submarkets.length > 0 ||
    filters.counties.length > 0 ||
    filters.cities.length > 0;

  const setMarket = (next: string | null) => {
    onChange((prev) => ({
      ...prev,
      market: next,
      // Drop submarket selections that don't belong to the new market
      submarkets: next
        ? prev.submarkets.filter((s) => submarketsForMarket(next).includes(s))
        : prev.submarkets,
    }));
  };

  return (
    <div className="flex flex-wrap items-center gap-2 py-3">
      <span className="text-[11px] uppercase tracking-wide text-fg-muted font-medium mr-1">Filter</span>

      <MarketChip label="All markets" active={filters.market === null} onClick={() => setMarket(null)} />
      {AVAILABLE_MARKETS.map((m) => (
        <MarketChip
          key={m}
          label={m}
          active={filters.market === m}
          onClick={() => setMarket(filters.market === m ? null : m)}
        />
      ))}

      <span className="w-px h-4 bg-border mx-1" />

      <MultiSelect
        label="Submarket"
        options={submarketOptions}
        selected={filters.submarkets}
        onChange={(submarkets) => onChange((prev) => ({ ...prev, submarkets }))}
      />

      {countyOptions.length > 0 && (
        <MultiSelect
          label="County"
          options={countyOptions}
          selected={filters.counties}
          onChange={(counties) => onChange((prev) => ({ ...prev, counties }))}
        />
      )}

      {cityOptions.length > 0 && (
        <MultiSelect
          label="City"
          options={cityOptions}
          selected={filters.cities}
          onChange={(cities) => onChange((prev) => ({ ...prev, cities }))}
        />
      )}

      {hasAny && (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-fg-muted hover:text-fg"
        >
          <X size={12} /> Clear
        </button>
      )}
    </div>
  );
}
