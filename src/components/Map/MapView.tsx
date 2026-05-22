// Project-level map with PortViz-style drill-down. Deals are grouped
// by `dealId` (the project code) — one marker per project. Click a
// pin → camera flies in (pitch 55°, bearing -45°, view from SE) and
// the side ProjectDrawer opens. While zoomed in, buildings drawn
// for that project render as 3D fill-extrusions, and the drawer
// surfaces the building editor (add via mapbox-gl-draw with right-
// angle snap, edit height, delete).
//
// Pins are draggable — releasing a pin saves new lat/lng to every
// deal in the project group via onUpdateProjectCoords. Drag is
// disabled while the user is in draw mode to avoid accidental moves.
//
// Pattern lifted from PortViz/components/map/{PortfolioMap,
// BuildingExtrusionMap,FootprintEditor}.tsx — direct mapbox-gl
// bindings, no react-map-gl, HTML markers, satellite default.

import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import type { Feature, Polygon } from 'geojson';
import { MapPin, Satellite, Map as MapIcon, X } from 'lucide-react';
import type { Building, Deal } from '../../types';
import { ProjectDrawer } from './ProjectDrawer';
import {
  listBuildingsForProject,
  upsertBuilding,
  deleteBuilding,
  subscribeBuildings,
} from '../../lib/repo/buildings';
import { squareOffPolygonLngLat } from '../../lib/map-utils/squareOffLngLat';

const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_TOKEN ?? '').trim();

const STYLE_SATELLITE = 'mapbox://styles/mapbox/satellite-streets-v12';
const STYLE_LIGHT = 'mapbox://styles/mapbox/light-v11';

const DEFAULT_CENTER: [number, number] = [-98.5795, 39.8283];
const DEFAULT_ZOOM = 3.2;

const BUILDINGS_SOURCE = 'lt-buildings';
const BUILDINGS_LAYER_FILL = 'lt-buildings-extrusion';
const BUILDINGS_LAYER_OUTLINE = 'lt-buildings-outline';

const FT_TO_METERS = 0.3048;

// ── Project model (derived from deals) ────────────────────────────

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
  const out: Project[] = [];
  for (const [id, ds] of groups) {
    const nameCounts = new Map<string, number>();
    ds.forEach((d) => nameCounts.set(d.dealName, (nameCounts.get(d.dealName) ?? 0) + 1));
    const name =
      [...nameCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? id;
    const pinned = ds.find(
      (d) => typeof d.lat === 'number' && typeof d.lng === 'number'
    );
    out.push({
      id,
      name,
      deals: ds,
      lat: pinned?.lat ?? null,
      lng: pinned?.lng ?? null,
    });
  }
  out.sort((a, b) => {
    const ap = a.lat != null && a.lng != null ? 1 : 0;
    const bp = b.lat != null && b.lng != null ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return a.name.localeCompare(b.name);
  });
  return out;
}

interface Props {
  deals: Deal[];
  onSelectDeal: (deal: Deal) => void;
  onUpdateProjectCoords: (projectId: string, lat: number, lng: number) => void;
  onToast?: (msg: string) => void;
}

export function MapView({ deals, onSelectDeal, onUpdateProjectCoords, onToast }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const drawRef = useRef<MapboxDraw | null>(null);

  const [mapStyle, setMapStyle] = useState<'satellite' | 'light'>('satellite');
  const [placingProjectId, setPlacingProjectId] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [drawMode, setDrawMode] = useState(false);

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

  // Refs for the once-bound listeners.
  const placingRef = useRef<string | null>(null);
  placingRef.current = placingProjectId;
  const onUpdateRef = useRef(onUpdateProjectCoords);
  onUpdateRef.current = onUpdateProjectCoords;
  const activeProjectIdRef = useRef<string | null>(null);
  activeProjectIdRef.current = activeProjectId;
  const onToastRef = useRef(onToast);
  onToastRef.current = onToast;
  const drawModeRef = useRef(false);
  drawModeRef.current = drawMode;

  const handleSelectProject = (id: string) => {
    setActiveProjectId(id);
    const proj = projectsById.get(id);
    const map = mapRef.current;
    if (proj?.lat != null && proj.lng != null && map) {
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

  const handleCloseProject = () => {
    setActiveProjectId(null);
    setDrawMode(false);
    setBuildings([]);
  };

  // ── Init map ────────────────────────────────────────────────────
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
      // Skip if the click is being consumed by the draw tool.
      if (drawModeRef.current) return;
      const projectId = placingRef.current;
      if (!projectId) return;
      const { lng, lat } = e.lngLat;
      onUpdateRef.current(projectId, lat, lng);
      setPlacingProjectId(null);
    });

    // (Re-)install the buildings source + layer on every style load
    // so satellite ↔ light swaps don't lose them.
    map.on('style.load', () => {
      ensureBuildingsLayers(map);
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      if (drawRef.current) {
        try { map.removeControl(drawRef.current); } catch { /* style may have unloaded */ }
        drawRef.current = null;
      }
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

  // ── Flatten camera in draw mode ─────────────────────────────────
  // 55° pitch is great for the cinematic project arrival, awful for
  // polygon tracing — perspective makes click-to-place feel imprecise
  // near the bottom of the screen. Flatten to top-down satellite for
  // draw mode, restore the tilt when the user finishes or cancels.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (drawMode) {
      map.easeTo({ pitch: 0, bearing: 0, duration: 600 });
    } else if (activeProjectId) {
      map.easeTo({ pitch: 55, bearing: -45, duration: 600 });
    }
  }, [drawMode, activeProjectId]);

  // ── Sync project markers (draggable, opens drawer on click) ─────
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
        // Update label + deal-count chip in case the project changed.
        const el = m.getElement();
        const labelEl = el.querySelector('[data-pin-label]');
        if (labelEl) labelEl.textContent = projectPinLabel(p);
        const sub = el.querySelector('[data-pin-sublabel]');
        if (sub) sub.textContent = `${p.deals.length} ${p.deals.length === 1 ? 'deal' : 'deals'}`;
        m.setDraggable(!drawModeRef.current);
        continue;
      }
      const el = createProjectMarkerEl(p);
      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom', draggable: true })
        .setLngLat([p.lng, p.lat])
        .addTo(map);
      // Click on the pin element opens the project drawer; drag does not.
      // mapbox-gl-marker fires a synthetic click after dragend, which we
      // suppress via the `wasDragged` flag.
      let wasDragged = false;
      marker.on('dragstart', () => { wasDragged = false; });
      marker.on('drag', () => { wasDragged = true; });
      marker.on('dragend', () => {
        const ll = marker.getLngLat();
        onUpdateRef.current(p.id, ll.lat, ll.lng);
        onToastRef.current?.(
          `Moved ${p.name} (${p.id}) to ${ll.lat.toFixed(4)}, ${ll.lng.toFixed(4)}`
        );
      });
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (wasDragged) {
          wasDragged = false;
          return;
        }
        handleSelectProject(p.id);
      });
      existing.set(p.id, marker);
    }

    for (const [id, marker] of existing) {
      if (!next.has(id)) {
        marker.remove();
        existing.delete(id);
      }
    }

    if (pinnedProjects.length > 0 && !hasFitted.current && !activeProjectIdRef.current) {
      const bounds = new mapboxgl.LngLatBounds();
      for (const p of pinnedProjects) bounds.extend([p.lng, p.lat]);
      map.fitBounds(bounds, {
        padding: 80,
        maxZoom: pinnedProjects.length === 1 ? 12 : 8,
        duration: 800,
      });
      hasFitted.current = true;
    }
  }, [pinnedProjects, drawMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasFitted = useRef(false);

  // ── Load + subscribe to buildings for the active project ────────
  useEffect(() => {
    if (!activeProjectId) {
      setBuildings([]);
      return;
    }
    let cancelled = false;
    listBuildingsForProject(activeProjectId)
      .then((rows) => {
        if (!cancelled) setBuildings(rows);
      })
      .catch((err) => {
        console.error('Failed to load buildings:', err);
        onToastRef.current?.('Failed to load buildings');
      });
    const unsub = subscribeBuildings({
      onUpsert: (b) =>
        setBuildings((prev) => {
          if (b.projectId !== activeProjectIdRef.current) return prev;
          const idx = prev.findIndex((x) => x.id === b.id);
          if (idx === -1) return [...prev, b];
          const next = prev.slice();
          next[idx] = b;
          return next;
        }),
      onDelete: (id) => setBuildings((prev) => prev.filter((b) => b.id !== id)),
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [activeProjectId]);

  // ── Render buildings as fill-extrusion ──────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!map.isStyleLoaded()) {
      // style.load handler will re-add layers + a subsequent effect
      // run will sync the source.
      return;
    }
    ensureBuildingsLayers(map);
    const src = map.getSource(BUILDINGS_SOURCE) as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;
    src.setData({
      type: 'FeatureCollection',
      features: buildings.map<Feature>((b) => ({
        type: 'Feature',
        geometry: b.footprint as Polygon,
        properties: {
          id: b.id,
          name: b.name,
          heightMeters: b.heightFt * FT_TO_METERS,
          color: b.color ?? null,
        },
      })),
    });
  }, [buildings]);

  // ── Draw mode lifecycle ─────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (drawMode && !drawRef.current) {
      const draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: { polygon: true, trash: true },
        defaultMode: 'draw_polygon',
      });
      map.addControl(draw, 'top-left');
      drawRef.current = draw;

      map.on('draw.create', onDrawCreate);
    }
    if (!drawMode && drawRef.current) {
      try { map.removeControl(drawRef.current); } catch { /* noop */ }
      drawRef.current = null;
      map.off('draw.create', onDrawCreate);
    }

    function onDrawCreate(e: { features: Feature[] }) {
      const projectId = activeProjectIdRef.current;
      if (!projectId) return;
      const feat = e.features[0];
      if (!feat || feat.geometry.type !== 'Polygon') return;

      // Snap freehand right-angles to true 90° to clean up the trace.
      const snapped = squareOffPolygonLngLat(feat.geometry as Polygon, 10);
      const now = new Date().toISOString();
      const next: Building = {
        id: crypto.randomUUID(),
        projectId,
        name: `Building ${(buildings.length + 1).toString()}`,
        footprint: snapped,
        heightFt: 30,
        color: null,
        createdAt: now,
        updatedAt: now,
      };
      // Optimistic local update.
      setBuildings((prev) => [...prev, next]);
      upsertBuilding(next).catch((err) => {
        console.error('Save building failed:', err);
        onToastRef.current?.('Save building failed');
      });

      // Exit draw mode after a successful trace; the user can re-enter
      // from the drawer to add another.
      const drawInstance = drawRef.current;
      if (drawInstance) {
        try { drawInstance.deleteAll(); } catch { /* noop */ }
      }
      setDrawMode(false);
      onToastRef.current?.(`Added building (${snapped.coordinates[0]?.length ?? 0} corners)`);
    }
  }, [drawMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveBuilding = (b: Building) => {
    setBuildings((prev) => prev.map((x) => (x.id === b.id ? b : x)));
    upsertBuilding(b).catch((err) => {
      console.error('Save building failed:', err);
      onToastRef.current?.('Save building failed');
    });
  };

  const handleDeleteBuilding = (id: string) => {
    setBuildings((prev) => prev.filter((b) => b.id !== id));
    deleteBuilding(id).catch((err) => {
      console.error('Delete building failed:', err);
      onToastRef.current?.('Delete building failed');
    });
  };

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
              <span
                className="text-fg-subtle"
                title="Deals without a Deal ID are excluded from the map"
              >
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

      {drawMode && (
        <DrawModeBanner onCancel={() => setDrawMode(false)} />
      )}

      <div
        ref={containerRef}
        className="w-full h-[calc(100vh-280px)] min-h-[460px] rounded-2xl shadow-soft overflow-hidden bg-bg-subtle"
      />

      {activeProject && (
        <ProjectDrawer
          project={activeProject}
          buildings={buildings}
          drawMode={drawMode}
          onClose={handleCloseProject}
          onSelectDeal={(d) => {
            // Don't fully unmount the drawer — App.tsx opens the deal
            // drawer on top, and we want to return to the project view
            // when it closes. So just hand off the deal.
            onSelectDeal(d);
          }}
          onStartDraw={() => setDrawMode(true)}
          onSaveBuilding={handleSaveBuilding}
          onDeleteBuilding={handleDeleteBuilding}
        />
      )}
    </div>
  );
}

// ── Mapbox layers ────────────────────────────────────────────────

function ensureBuildingsLayers(map: mapboxgl.Map) {
  if (!map.getSource(BUILDINGS_SOURCE)) {
    map.addSource(BUILDINGS_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }
  if (!map.getLayer(BUILDINGS_LAYER_FILL)) {
    map.addLayer({
      id: BUILDINGS_LAYER_FILL,
      type: 'fill-extrusion',
      source: BUILDINGS_SOURCE,
      paint: {
        'fill-extrusion-color': ['coalesce', ['get', 'color'], '#c96442'],
        'fill-extrusion-height': ['coalesce', ['get', 'heightMeters'], 10],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.85,
      },
    });
  }
  if (!map.getLayer(BUILDINGS_LAYER_OUTLINE)) {
    map.addLayer({
      id: BUILDINGS_LAYER_OUTLINE,
      type: 'line',
      source: BUILDINGS_SOURCE,
      paint: {
        'line-color': '#1f1e1b',
        'line-width': 1,
      },
    });
  }
}

// ── Marker helpers ────────────────────────────────────────────────

function projectPinLabel(p: Project): string {
  return p.id.slice(0, 4);
}

function createProjectMarkerEl(p: Project): HTMLElement {
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
  span.dataset.pinLabel = '';
  span.textContent = projectPinLabel(p);
  pin.appendChild(span);
  wrap.appendChild(pin);

  const sub = document.createElement('div');
  sub.dataset.pinSublabel = '';
  sub.className =
    'mt-1 px-1.5 py-0.5 rounded-md bg-bg-elevated/90 text-[10px] font-medium text-fg shadow-soft pointer-events-none';
  sub.textContent = `${p.deals.length} ${p.deals.length === 1 ? 'deal' : 'deals'}`;
  wrap.appendChild(sub);

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

function DrawModeBanner({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-warning/10 border border-warning/40 rounded-xl text-sm">
      <div className="flex items-center gap-2 text-fg">
        <MapPin size={14} strokeWidth={2} className="text-warning shrink-0" />
        <span>
          Click corners to trace a building footprint. Double-click to finish — right
          angles will snap automatically.
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
