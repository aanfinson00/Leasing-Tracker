// ───────────────────────────────────────────────────────────────────
// Mapbox geocoding (forward only — address → lat/lng).
//
// Free tier on Mapbox is generous. We already use Mapbox for map
// rendering, so no new auth setup needed — reuses VITE_MAPBOX_TOKEN.
//
// Returns null on any failure (missing token, network error, no result,
// HTTP non-2xx). Callers should fall back to manual entry.
// ───────────────────────────────────────────────────────────────────

const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_TOKEN ?? '').trim();

export interface GeocodeResult {
  lat: number;
  lng: number;
  /** Mapbox's full canonical address string. */
  placeName: string;
  /** Approximate confidence: 'high' | 'medium' | 'low' based on relevance score. */
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Forward geocode an address string. Returns the top result, or null.
 *
 * Mapbox API doc: https://docs.mapbox.com/api/search/geocoding/
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const q = address.trim();
  if (!q || !MAPBOX_TOKEN) return null;

  const url =
    'https://api.mapbox.com/geocoding/v5/mapbox.places/' +
    encodeURIComponent(q) +
    `.json?access_token=${encodeURIComponent(MAPBOX_TOKEN)}&limit=1&country=us`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      features?: Array<{
        center?: [number, number];
        place_name?: string;
        relevance?: number;
      }>;
    };
    const feat = data.features?.[0];
    if (!feat || !feat.center) return null;
    const [lng, lat] = feat.center;
    const rel = feat.relevance ?? 0;
    const confidence: GeocodeResult['confidence'] =
      rel >= 0.9 ? 'high' : rel >= 0.6 ? 'medium' : 'low';
    return {
      lat,
      lng,
      placeName: feat.place_name ?? q,
      confidence,
    };
  } catch (err) {
    console.warn('geocodeAddress failed:', err);
    return null;
  }
}
