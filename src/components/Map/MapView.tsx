// Mapbox-driven map tab. Phase 1 shows one pin per Deal with lat/lng;
// clicking a pin opens the existing DealDrawer. Phase 2 will add a
// drill-down with 3D building extrusions and a surrounding-comps
// overlay (per the user's spec).
//
// Pattern lifted from PortViz/components/map/PortfolioMap.tsx —
// direct mapbox-gl bindings (no react-map-gl), HTML markers, satellite
// basemap as the default. Style toggle switches between satellite-streets
// and light without losing the marker layer.

import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Satellite, Map as MapIcon } from 'lucide-react';
import type { Deal } from '../../types';

const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_TOKEN ?? '').trim();

const STYLE_SATELLITE = 'mapbox://styles/mapbox/satellite-streets-v12';
const STYLE_LIGHT = 'mapbox://styles/mapbox/light-v11';

// Continental US — centered fallback when no deal has a pin yet.
const DEFAULT_CENTER: [number, number] = [-98.5795, 39.8283];
const DEFAULT_ZOOM = 3.2;

interface Props {
  deals: Deal[];
  onSelectDeal: (deal: Deal) => void;
}

export function MapView({ deals, onSelectDeal }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const onSelectRef = useRef(onSelectDeal);
  onSelectRef.current = onSelectDeal;

  const [style, setStyle] = useState<'satellite' | 'light'>('satellite');

  // Pinned deals — drop anything without lat/lng (the bulk of records
  // until users start setting coordinates from the DealDrawer).
  const pinnedDeals = useMemo(
    () =>
      deals.filter(
        (d): d is Deal & { lat: number; lng: number } =>
          typeof d.lat === 'number' &&
          typeof d.lng === 'number' &&
          Number.isFinite(d.lat) &&
          Number.isFinite(d.lng)
      ),
    [deals]
  );

  // ── Initialize map once ──────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    if (!MAPBOX_TOKEN) return; // missing-token state is rendered below
    if (mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: STYLE_SATELLITE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: true,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new mapboxgl.FullscreenControl(), 'top-right');
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Style toggle ────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(style === 'satellite' ? STYLE_SATELLITE : STYLE_LIGHT);
  }, [style]);

  // ── Sync markers ────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existing = markersRef.current;
    const next = new Set<string>();

    for (const deal of pinnedDeals) {
      next.add(deal.id);
      const m = existing.get(deal.id);
      if (m) {
        m.setLngLat([deal.lng, deal.lat]);
        // Update label if the deal was renamed.
        const el = m.getElement();
        const label = el.querySelector('span');
        if (label) label.textContent = pinLabel(deal);
        continue;
      }
      const el = createMarkerEl(deal, () => onSelectRef.current?.(deal));
      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([deal.lng, deal.lat])
        .addTo(map);
      existing.set(deal.id, marker);
    }

    // Remove markers for deals that lost their pin or were deleted.
    for (const [id, marker] of existing) {
      if (!next.has(id)) {
        marker.remove();
        existing.delete(id);
      }
    }

    // Auto-fit on first non-empty load.
    if (pinnedDeals.length > 0 && !hasFitted.current) {
      const bounds = new mapboxgl.LngLatBounds();
      for (const d of pinnedDeals) bounds.extend([d.lng, d.lat]);
      map.fitBounds(bounds, {
        padding: 80,
        maxZoom: pinnedDeals.length === 1 ? 12 : 8,
        duration: 800,
      });
      hasFitted.current = true;
    }
  }, [pinnedDeals]);

  // Tracks whether we've already auto-fit so reordering pins doesn't
  // jump the view unexpectedly.
  const hasFitted = useRef(false);

  if (!MAPBOX_TOKEN) {
    return <MissingTokenState />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm text-fg-muted">
          <MapPin size={14} strokeWidth={2} className="text-accent" />
          <span>{pinnedDeals.length} pinned</span>
          {pinnedDeals.length < deals.length && (
            <>
              <span className="text-fg-subtle">·</span>
              <span className="text-fg-subtle">
                {deals.length - pinnedDeals.length} deals without coordinates (set lat/lng in the Deal drawer)
              </span>
            </>
          )}
        </div>
        <StyleToggle style={style} onChange={setStyle} />
      </div>

      <div
        ref={containerRef}
        className="w-full h-[calc(100vh-260px)] min-h-[480px] rounded-2xl shadow-soft overflow-hidden bg-bg-subtle"
      />
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────

function pinLabel(deal: Deal): string {
  return deal.dealName.split(/\s+/).slice(0, 1).join('').slice(0, 3).toUpperCase() || '·';
}

function createMarkerEl(deal: Deal, onClick: () => void): HTMLElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className =
    'flex h-9 w-9 items-center justify-center rounded-full border-2 border-white ' +
    'bg-accent text-xs font-semibold text-white shadow-lift transition ' +
    'hover:scale-110 hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent';
  el.title = `${deal.dealName}${deal.prospectTenant ? ` — ${deal.prospectTenant}` : ''}`;
  el.setAttribute('aria-label', `Open ${deal.dealName}`);

  const span = document.createElement('span');
  span.textContent = pinLabel(deal);
  el.appendChild(span);

  el.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  });
  return el;
}

function StyleToggle({
  style,
  onChange,
}: {
  style: 'satellite' | 'light';
  onChange: (s: 'satellite' | 'light') => void;
}) {
  return (
    <div className="inline-flex rounded-lg bg-bg-elevated border border-border shadow-soft overflow-hidden">
      <ToggleButton
        active={style === 'satellite'}
        onClick={() => onChange('satellite')}
        title="Satellite"
      >
        <Satellite size={14} strokeWidth={2} />
        <span>Satellite</span>
      </ToggleButton>
      <ToggleButton active={style === 'light'} onClick={() => onChange('light')} title="Light">
        <MapIcon size={14} strokeWidth={2} />
        <span>Light</span>
      </ToggleButton>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={[
        'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
        active ? 'bg-accent text-accent-fg' : 'text-fg-muted hover:bg-bg-hover',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function MissingTokenState() {
  return (
    <div className="flex flex-col items-center text-center py-20 px-6 bg-bg-elevated rounded-2xl shadow-soft">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-warning/10 text-warning mb-5">
        <MapPin size={22} strokeWidth={1.75} />
      </div>
      <h3 className="text-xl font-semibold text-fg tracking-[-0.02em]">Mapbox token missing</h3>
      <p className="text-sm text-fg-muted mt-2 max-w-md leading-relaxed">
        Set <code className="text-fg bg-bg-subtle px-1.5 py-0.5 rounded">VITE_MAPBOX_TOKEN</code> in your env
        (local <code className="text-fg bg-bg-subtle px-1.5 py-0.5 rounded">.env.local</code> for dev, Vercel
        Project → Environment Variables for production). You can reuse the token from PortViz.
      </p>
    </div>
  );
}
