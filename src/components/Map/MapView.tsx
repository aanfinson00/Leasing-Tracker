// Project-level map. Deals are grouped by `dealId` (the project code) —
// one marker per project, never per deal. A project's lat/lng lives
// (denormalized) on each of its deals; placing a pin writes the new
// coords to all deals in the group. Deals without a dealId can't be
// placed on the map.
//
// Click a project marker → opens ProjectDrawer with the list of deals
// in that project. Click a deal in the list → opens the existing
// DealDrawer.
//
// Pattern lifted from PortViz/components/map/PortfolioMap.tsx —
// direct mapbox-gl bindings (no react-map-gl), HTML markers, satellite
// basemap default. Style toggle preserves marker layer.

import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Satellite, Map as MapIcon, X } from 'lucide-react';
import type { Deal } from '../../types';
import { ProjectDrawer } from './ProjectDrawer';

const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_TOKEN ?? '').trim();

const STYLE_SATELLITE = 'mapbox://styles/mapbox/satellite-streets-v12';
const STYLE_LIGHT = 'mapbox://styles/mapbox/light-v11';

const DEFAULT_CENTER: [number, number] = [-98.5795, 39.8283];
const DEFAULT_ZOOM = 3.2;

// ── Project model (derived) ───────────────────────────────────────
// Group deals by `dealId`. A "project" is the set of deals sharing
// that ID. lat/lng are denormalized — whichever deal in the group
// has them set wins.
export interface Project {
  /** dealId — required grouping key */
  id: string;
  /** Most-common dealName among the project's deals (fallback: id) */
  name: string;
  deals: Deal[];
  lat: number | null;
  lng: number | null;
}

function buildProjects(deals: Deal[]): Project[] {
  const groups = new Map<string, Deal[]>();
  for (const d of deals) {
    const key = d.dealId?.trim();
    if (!key) continue;
    const arr = groups.get(key) ?? [];
    arr.push(d);
    groups.set(key, arr);
  }
  const projects: Project[] = [];
  for (const [id, ds] of groups) {
    const nameCounts = new Map<string, number>();
    ds.forEach((d) => nameCounts.set(d.dealName, (nameCounts.get(d.dealName) ?? 0) + 1));
    const name =
      [...nameCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? id;
    const pinned = ds.find(
      (d) => typeof d.lat === 'number' && typeof d.lng === 'number'
    );
    projects.push({
      id,
      name,
      deals: ds,
      lat: pinned?.lat ?? null,
      lng: pinned?.lng ?? null,
    });
  }
  // Stable sort: pinned first, then alphabetical by name.
  projects.sort((a, b) => {
    const ap = a.lat != null && a.lng != null ? 1 : 0;
    const bp = b.lat != null && b.lng != null ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return a.name.localeCompare(b.name);
  });
  return projects;
}

interface Props {
  deals: Deal[];
  onSelectDeal: (deal: Deal) => void;
  /** Writes lat/lng to all deals in the given project (dealId). */
  onUpdateProjectCoords: (projectId: string, lat: number, lng: number) => void;
}

export function MapView({ deals, onSelectDeal, onUpdateProjectCoords }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  const [mapStyle, setMapStyle] = useState<'satellite' | 'light'>('satellite');
  const [placingProjectId, setPlacingProjectId] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const projects = useMemo(() => buildProjects(deals), [deals]);
  const projectsById = useMemo(() => {
    const m = new Map<string, Project>();
    for (const p of projects) m.set(p.id, p);
    return m;
  }, [projects]);
  const pinnedProjects = useMemo(
    () =>
      projects.filter(
        (p): p is Project & { lat: number; lng: number } =>
          p.lat != null && p.lng != null
      ),
    [projects]
  );
  const activeProject = activeProjectId ? projectsById.get(activeProjectId) ?? null : null;
  const placingProject = placingProjectId ? projectsById.get(placingProjectId) ?? null : null;

  // Refs so the once-bound map click handler can see the latest state.
  const placingRef = useRef<string | null>(null);
  placingRef.current = placingProjectId;
  const onUpdateRef = useRef(onUpdateProjectCoords);
  onUpdateRef.current = onUpdateProjectCoords;
  const onSelectProjectRef = useRef<(id: string) => void>(() => {});
  onSelectProjectRef.current = (id: string) => {
    setActiveProjectId(id);
    // Drill-down camera: 55° pitch, bearing -45° puts the viewer SE of
    // the pin looking NW (so on-screen "up" = NW). Zoom 17 frames a
    // single parcel — matches PortViz's BuildingExtrusionMap framing.
    const proj = projectsById.get(id);
    const map = mapRef.current;
    if (proj && proj.lat != null && proj.lng != null && map) {
      map.flyTo({
        center: [proj.lng, proj.lat],
        zoom: 17,
        pitch: 55,
        bearing: -45,
        speed: 1.2,
        curve: 1.4,
        essential: true,
      });
    }
  };

  // ── Init map once ───────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    if (!MAPBOX_TOKEN) return;
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

    map.on('click', (e) => {
      const projectId = placingRef.current;
      if (!projectId) return;
      const { lng, lat } = e.lngLat;
      onUpdateRef.current(projectId, lat, lng);
      setPlacingProjectId(null);
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(mapStyle === 'satellite' ? STYLE_SATELLITE : STYLE_LIGHT);
  }, [mapStyle]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = placingProjectId ? 'crosshair' : '';
  }, [placingProjectId]);

  // ── Sync project markers ────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existing = markersRef.current;
    const next = new Set<string>();

    for (const p of pinnedProjects) {
      next.add(p.id);
      const m = existing.get(p.id);
      if (m) {
        m.setLngLat([p.lng, p.lat]);
        const el = m.getElement();
        const label = el.querySelector('span');
        if (label) label.textContent = projectPinLabel(p);
        const sub = el.querySelector('[data-pin-sublabel]');
        if (sub) sub.textContent = `${p.deals.length} ${p.deals.length === 1 ? 'deal' : 'deals'}`;
        continue;
      }
      const el = createProjectMarkerEl(p, () => onSelectProjectRef.current(p.id));
      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([p.lng, p.lat])
        .addTo(map);
      existing.set(p.id, marker);
    }

    for (const [id, marker] of existing) {
      if (!next.has(id)) {
        marker.remove();
        existing.delete(id);
      }
    }

    if (pinnedProjects.length > 0 && !hasFitted.current) {
      const bounds = new mapboxgl.LngLatBounds();
      for (const p of pinnedProjects) bounds.extend([p.lng, p.lat]);
      map.fitBounds(bounds, {
        padding: 80,
        maxZoom: pinnedProjects.length === 1 ? 12 : 8,
        duration: 800,
      });
      hasFitted.current = true;
    }
  }, [pinnedProjects]);

  const hasFitted = useRef(false);

  if (!MAPBOX_TOKEN) return <MissingTokenState />;

  const totalProjects = projects.length;
  const totalUnpinned = projects.length - pinnedProjects.length;
  const orphanDealCount = deals.filter((d) => !d.dealId?.trim()).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm text-fg-muted flex-wrap">
          <MapPin size={14} strokeWidth={2} className="text-accent" />
          <span>
            {pinnedProjects.length} of {totalProjects}{' '}
            {totalProjects === 1 ? 'project pinned' : 'projects pinned'}
          </span>
          {totalUnpinned > 0 && (
            <>
              <span className="text-fg-subtle">·</span>
              <span className="text-fg-subtle">{totalUnpinned} unpinned</span>
            </>
          )}
          {orphanDealCount > 0 && (
            <>
              <span className="text-fg-subtle">·</span>
              <span className="text-fg-subtle" title="Deals without a Deal ID are excluded from the map">
                {orphanDealCount} deal{orphanDealCount === 1 ? '' : 's'} skipped (no Deal ID)
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PlacePinPicker
            projects={projects}
            placingProjectId={placingProjectId}
            onPick={setPlacingProjectId}
          />
          <StyleToggle style={mapStyle} onChange={setMapStyle} />
        </div>
      </div>

      {placingProject && (
        <PlacementBanner
          project={placingProject}
          onCancel={() => setPlacingProjectId(null)}
        />
      )}

      <div
        ref={containerRef}
        className="w-full h-[calc(100vh-280px)] min-h-[460px] rounded-2xl shadow-soft overflow-hidden bg-bg-subtle"
      />

      {activeProject && (
        <ProjectDrawer
          project={activeProject}
          onClose={() => setActiveProjectId(null)}
          onSelectDeal={(d) => {
            setActiveProjectId(null);
            onSelectDeal(d);
          }}
        />
      )}
    </div>
  );
}

// ── Marker helpers ────────────────────────────────────────────────

function projectPinLabel(p: Project): string {
  // Prefer the project code (dealId) since it's the identity the user
  // typed. Truncate to 4 chars so e.g. "2205" / "5001" fit cleanly.
  return p.id.slice(0, 4);
}

function createProjectMarkerEl(p: Project, onClick: () => void): HTMLElement {
  const wrap = document.createElement('button');
  wrap.type = 'button';
  wrap.className =
    'group relative flex flex-col items-center focus:outline-none focus:ring-2 focus:ring-accent rounded-md';
  wrap.title = `${p.name} (${p.id}) — ${p.deals.length} ${p.deals.length === 1 ? 'deal' : 'deals'}`;
  wrap.setAttribute('aria-label', `Open project ${p.name}`);

  const pin = document.createElement('div');
  pin.className =
    'flex h-10 w-10 items-center justify-center rounded-full border-2 border-white ' +
    'bg-accent text-[11px] font-semibold tabular-nums text-white shadow-lift transition ' +
    'group-hover:scale-110 group-hover:bg-accent-hover';
  const span = document.createElement('span');
  span.textContent = projectPinLabel(p);
  pin.appendChild(span);
  wrap.appendChild(pin);

  // Sublabel chip under the pin showing deal count.
  const sub = document.createElement('div');
  sub.dataset.pinSublabel = '';
  sub.className =
    'mt-1 px-1.5 py-0.5 rounded-md bg-bg-elevated/90 text-[10px] font-medium text-fg shadow-soft pointer-events-none';
  sub.textContent = `${p.deals.length} ${p.deals.length === 1 ? 'deal' : 'deals'}`;
  wrap.appendChild(sub);

  wrap.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  });
  return wrap;
}

// ── Toolbar bits ──────────────────────────────────────────────────

function StyleToggle({
  style,
  onChange,
}: {
  style: 'satellite' | 'light';
  onChange: (s: 'satellite' | 'light') => void;
}) {
  return (
    <div className="inline-flex rounded-lg bg-bg-elevated border border-border shadow-soft overflow-hidden">
      <ToggleButton active={style === 'satellite'} onClick={() => onChange('satellite')} title="Satellite">
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

function PlacePinPicker({
  projects,
  placingProjectId,
  onPick,
}: {
  projects: Project[];
  placingProjectId: string | null;
  onPick: (id: string | null) => void;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg bg-bg-elevated border border-border shadow-soft pl-3 pr-1 py-1">
      <MapPin size={13} strokeWidth={2} className="text-accent" />
      <select
        value={placingProjectId ?? ''}
        onChange={(e) => onPick(e.target.value || null)}
        className="bg-transparent text-xs font-medium text-fg focus:outline-none cursor-pointer py-1 pr-2 max-w-[260px]"
      >
        <option value="">Place pin for project…</option>
        {projects.map((p) => {
          const hasPin = p.lat != null && p.lng != null;
          return (
            <option key={p.id} value={p.id}>
              {hasPin ? '📍 ' : '+ '}
              {p.name} · {p.id} ({p.deals.length} {p.deals.length === 1 ? 'deal' : 'deals'})
            </option>
          );
        })}
      </select>
    </div>
  );
}

function PlacementBanner({ project, onCancel }: { project: Project; onCancel: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-accent-tint border border-accent/30 rounded-xl text-sm">
      <div className="flex items-center gap-2 text-fg">
        <MapPin size={14} strokeWidth={2} className="text-accent shrink-0" />
        <span>
          Click the map to place a pin for{' '}
          <strong className="font-semibold">{project.name}</strong>{' '}
          <span className="text-fg-muted">({project.id})</span>
          {project.deals.length > 1 && (
            <span className="text-fg-muted"> · applies to all {project.deals.length} deals</span>
          )}
        </span>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-fg-muted hover:text-fg hover:bg-bg-hover transition-colors"
      >
        <X size={12} strokeWidth={2} />
        Cancel
      </button>
    </div>
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
        Project → Environment Variables for production).
      </p>
    </div>
  );
}
