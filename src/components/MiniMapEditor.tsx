import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Search, X } from 'lucide-react';
import { geocodeAddress } from '../lib/geocoding';

const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_TOKEN ?? '').trim();
const STYLE = 'mapbox://styles/mapbox/satellite-streets-v12';

interface MiniMapEditorProps {
  lat: number | null;
  lng: number | null;
  /** When non-empty, "Geocode from address" button becomes active. */
  address?: string | null;
  onChange: (lat: number | null, lng: number | null) => void;
  /** Optional label for the panel. */
  label?: string;
  /** Height in px. Default 200. */
  height?: number;
}

/**
 * Small embedded Mapbox map for editing a single point. Two ways to set:
 *   1. Click the geocode button (uses provided address)
 *   2. Drag the pin
 *
 * Falls back to a static panel + numeric inputs if MAPBOX_TOKEN is missing.
 */
export function MiniMapEditor({
  lat,
  lng,
  address,
  onChange,
  label,
  height = 200,
}: MiniMapEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  // Initialize map once.
  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: STYLE,
      center: lat != null && lng != null ? [lng, lat] : [-96.8, 32.8], // DFW fallback
      zoom: lat != null && lng != null ? 15 : 4,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('click', (e) => {
      onChange(e.lngLat.lat, e.lngLat.lng);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync marker to lat/lng. Re-creates marker when coords change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    if (lat != null && lng != null) {
      const marker = new mapboxgl.Marker({ draggable: true, color: '#d4895a' })
        .setLngLat([lng, lat])
        .addTo(map);
      marker.on('dragend', () => {
        const { lat: nLat, lng: nLng } = marker.getLngLat();
        onChange(nLat, nLng);
      });
      markerRef.current = marker;
      map.flyTo({ center: [lng, lat], zoom: 15, essential: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  const handleGeocode = async () => {
    if (!address) return;
    const res = await geocodeAddress(address);
    if (res) {
      onChange(res.lat, res.lng);
    }
  };

  const handleClear = () => onChange(null, null);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="rounded-xl border border-border bg-bg p-3 text-xs text-fg-muted">
        Mapbox token missing — set VITE_MAPBOX_TOKEN to enable map editing.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-bg">
      {label && (
        <div className="px-3 py-2 text-[10px] font-medium text-fg-muted border-b border-border bg-bg">
          {label}
        </div>
      )}
      <div
        ref={containerRef}
        className="w-full"
        style={{ height: `${height}px` }}
      />
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-border bg-bg">
        <div className="text-[10px] text-fg-subtle tabular-nums">
          {lat != null && lng != null ? (
            <>
              <MapPin size={10} className="inline mr-1" />
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </>
          ) : (
            <span>Click map or geocode to place pin</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {address && (
            <button
              type="button"
              onClick={handleGeocode}
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] text-fg-muted hover:text-fg bg-bg-hover rounded-md transition-colors"
              title={`Geocode "${address}"`}
            >
              <Search size={10} />
              Geocode
            </button>
          )}
          {lat != null && lng != null && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] text-fg-muted hover:text-fg bg-bg-hover rounded-md transition-colors"
              title="Clear pin"
            >
              <X size={10} />
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
