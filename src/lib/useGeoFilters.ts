// =============================================================================
// useGeoFilters — geo-filter state + URL-hash persistence
//
// One filter object per "view scope" (dev / acq / dispo). Encoded into the
// URL hash as `<scope>.market`, `<scope>.submarket`, etc. so links share.
//
// Empty arrays / null means "no filter for that field" — semantically
// equivalent to "show all".
// =============================================================================

import { useState, useEffect, useCallback } from 'react';

export interface GeoFilters {
  market: string | null;
  submarkets: string[];
  counties: string[];
  cities: string[];
}

export const EMPTY_FILTERS: GeoFilters = {
  market: null,
  submarkets: [],
  counties: [],
  cities: [],
};

function parseHash(scope: string): GeoFilters {
  if (typeof window === 'undefined') return EMPTY_FILTERS;
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return EMPTY_FILTERS;
  try {
    const params = new URLSearchParams(hash);
    const market = params.get(`${scope}.market`);
    const submarkets = params.get(`${scope}.submarkets`);
    const counties = params.get(`${scope}.counties`);
    const cities = params.get(`${scope}.cities`);
    return {
      market: market && market.length > 0 ? market : null,
      submarkets: submarkets ? submarkets.split('|').filter(Boolean) : [],
      counties: counties ? counties.split('|').filter(Boolean) : [],
      cities: cities ? cities.split('|').filter(Boolean) : [],
    };
  } catch {
    return EMPTY_FILTERS;
  }
}

function writeHash(scope: string, filters: GeoFilters) {
  if (typeof window === 'undefined') return;
  const hash = window.location.hash.replace(/^#/, '');
  const params = new URLSearchParams(hash);

  // Remove all keys for this scope, then re-add only the non-empty ones
  for (const key of Array.from(params.keys())) {
    if (key.startsWith(`${scope}.`)) params.delete(key);
  }
  if (filters.market) params.set(`${scope}.market`, filters.market);
  if (filters.submarkets.length > 0) params.set(`${scope}.submarkets`, filters.submarkets.join('|'));
  if (filters.counties.length > 0) params.set(`${scope}.counties`, filters.counties.join('|'));
  if (filters.cities.length > 0) params.set(`${scope}.cities`, filters.cities.join('|'));

  const next = params.toString();
  const url = `${window.location.pathname}${window.location.search}${next ? '#' + next : ''}`;
  window.history.replaceState(null, '', url);
}

export function useGeoFilters(scope: string) {
  const [filters, setFiltersState] = useState<GeoFilters>(() => parseHash(scope));

  const setFilters = useCallback(
    (next: GeoFilters | ((prev: GeoFilters) => GeoFilters)) => {
      setFiltersState((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        writeHash(scope, resolved);
        return resolved;
      });
    },
    [scope]
  );

  // Reset on demand
  const reset = useCallback(() => setFilters(EMPTY_FILTERS), [setFilters]);

  // Sync if user changes hash externally (e.g. paste a shared link, back button)
  useEffect(() => {
    function onHashChange() {
      setFiltersState(parseHash(scope));
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [scope]);

  return { filters, setFilters, reset };
}

/**
 * Pure helper — apply a GeoFilters set to any list of entities that has
 * the four nullable string fields. No-op for any field where the filter
 * is empty/null.
 */
export function applyFilter<T extends { market?: string | null; submarket?: string | null; county?: string | null; city?: string | null }>(
  rows: T[],
  filters: GeoFilters
): T[] {
  return rows.filter((r) => {
    if (filters.market && r.market !== filters.market) return false;
    if (filters.submarkets.length > 0 && (!r.submarket || !filters.submarkets.includes(r.submarket))) return false;
    if (filters.counties.length > 0 && (!r.county || !filters.counties.includes(r.county))) return false;
    if (filters.cities.length > 0 && (!r.city || !filters.cities.includes(r.city))) return false;
    return true;
  });
}
