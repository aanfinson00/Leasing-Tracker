// Mapbox forward geocoding: address string → { lat, lng } | null.
// One-shot fallback used when a dev project is saved without coordinates.
// Drag-to-move on the map is the authoritative override.

interface MapboxFeature {
  center: [number, number]; // [lng, lat]
}

interface MapboxResponse {
  features: MapboxFeature[];
}

export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  if (!token) {
    console.warn('geocodeAddress: VITE_MAPBOX_TOKEN missing — skipping.');
    return null;
  }
  const q = address.trim();
  if (!q) return null;

  try {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
      `?access_token=${token}&limit=1&types=address,place,postcode,locality,neighborhood`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`geocodeAddress: Mapbox ${res.status} for "${q}"`);
      return null;
    }
    const json = (await res.json()) as MapboxResponse;
    const f = json.features?.[0];
    if (!f) return null;
    const [lng, lat] = f.center;
    if (typeof lat !== 'number' || typeof lng !== 'number') return null;
    return { lat, lng };
  } catch (err) {
    console.warn('geocodeAddress: network/parse error', err);
    return null;
  }
}
