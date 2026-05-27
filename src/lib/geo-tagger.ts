// =============================================================================
// GEO-TAGGER
//
// Point-in-polygon lookup over four static GeoJSON layers (markets,
// submarkets, counties, cities). Called from every drawer save path that
// includes lat/lng — see Development/Acquisition/Disposition/DealDrawer.
//
// Polygons live in src/lib/geo-data/. Submarkets are scoped to a market via
// `properties.market` so DFW points only match DFW submarkets (and vice
// versa) — keeps overlaps at the metro edge from misfiring.
//
// Returns null per layer when no polygon contains the point. The two
// `*-scaffold*` files (counties.json, cities.json) ship empty, so those
// fields stay null until you drop in real TIGER/Line data.
// =============================================================================

import { booleanPointInPolygon, point as turfPoint } from '@turf/turf';
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson';

import marketsJson from './geo-data/markets.json';
import submarketsDfwJson from './geo-data/submarkets-dfw.json';
import submarketsHoustonJson from './geo-data/submarkets-houston.json';
import countiesJson from './geo-data/counties.json';
import citiesJson from './geo-data/cities.json';

export interface GeoTags {
  market: string | null;
  submarket: string | null;
  county: string | null;
  city: string | null;
}

type PolyFeature = Feature<Polygon | MultiPolygon, { name: string; market?: string }>;

// Type assertions: the JSON imports are statically known, the cast tells TS
// to trust the shape. Loaded once per module instance — Vite/ESM hoists.
const MARKETS = (marketsJson as unknown as FeatureCollection<Polygon | MultiPolygon>).features as PolyFeature[];
const SUBMARKETS: PolyFeature[] = [
  ...((submarketsDfwJson as unknown as FeatureCollection<Polygon | MultiPolygon>).features as PolyFeature[]),
  ...((submarketsHoustonJson as unknown as FeatureCollection<Polygon | MultiPolygon>).features as PolyFeature[]),
];
const COUNTIES = (countiesJson as unknown as FeatureCollection<Polygon | MultiPolygon>).features as PolyFeature[];
const CITIES = (citiesJson as unknown as FeatureCollection<Polygon | MultiPolygon>).features as PolyFeature[];

function firstHitName(point: ReturnType<typeof turfPoint>, features: PolyFeature[]): string | null {
  for (const f of features) {
    if (booleanPointInPolygon(point, f as unknown as Feature<Polygon | MultiPolygon>)) {
      return f.properties.name;
    }
  }
  return null;
}

function firstSubmarketHitForMarket(
  point: ReturnType<typeof turfPoint>,
  market: string | null
): string | null {
  for (const f of SUBMARKETS) {
    if (market && f.properties.market !== market) continue;
    if (booleanPointInPolygon(point, f as unknown as Feature<Polygon | MultiPolygon>)) {
      return f.properties.name;
    }
  }
  return null;
}

export function geoTag(input: { lat: number | null | undefined; lng: number | null | undefined }): GeoTags {
  const { lat, lng } = input;
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { market: null, submarket: null, county: null, city: null };
  }

  const pt = turfPoint([lng, lat]);
  const market = firstHitName(pt, MARKETS);
  const submarket = firstSubmarketHitForMarket(pt, market);
  const county = firstHitName(pt, COUNTIES);
  const city = firstHitName(pt, CITIES);

  return { market, submarket, county, city };
}

/**
 * Apply tags to an entity object in-place if its lat/lng resolves to any
 * tag. Doesn't overwrite existing fields with null — preserves manually-set
 * values when lat/lng falls outside known polygons.
 */
export function applyGeoTags<T extends { lat?: number | null; lng?: number | null; market?: string | null; submarket?: string | null; county?: string | null; city?: string | null }>(entity: T): T {
  const tags = geoTag({ lat: entity.lat ?? null, lng: entity.lng ?? null });
  return {
    ...entity,
    market: tags.market ?? entity.market ?? null,
    submarket: tags.submarket ?? entity.submarket ?? null,
    county: tags.county ?? entity.county ?? null,
    city: tags.city ?? entity.city ?? null,
  };
}
