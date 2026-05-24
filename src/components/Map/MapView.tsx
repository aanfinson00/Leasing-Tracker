// Project-level map with PortViz-style drill-down + SiteSetter-style
// parametric building placement. Deals are grouped by `dealId` — one
// marker per project. Click a pin → camera flies in (pitch 55°,
// bearing -45°), ProjectDrawer opens. Building creation is
// PARAMETRIC: the user enters W × D × rotation × bay_count in the
// drawer, then clicks anywhere on the satellite to drop a rectangle
// at that point. Each bay extrudes as its own colored block so
// demising walls fall out as real edges between them.
//
// Pins are draggable — releasing saves new lat/lng to every deal in
// the project group. Drag is suppressed during placement mode to
// avoid accidental moves.

import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Feature, Polygon } from 'geojson';
import { MapPin, Satellite, Map as MapIcon, X } from 'lucide-react';
import type {
  AcquisitionTarget,
  Building,
  Deal,
  DevelopmentProject,
  DevPhase,
  DispositionListing,
} from '../../types';
import { ProjectDrawer } from './ProjectDrawer';
import {
  listAllBuildings,
  upsertBuilding,
  deleteBuilding,
  subscribeBuildings,
} from '../../lib/repo/buildings';
import {
  parametricBays,
  rectangleFromCenter,
  bumpOutPolygon,
  DEFAULT_BUILDING_PARAMS,
} from '../../lib/map-utils/parametric';
import { bayColor, detectFrontageSide } from '../../lib/map-utils/demising';
import { buildingDockDoors } from '../../lib/map-utils/dockDoors';
import {
  truckCourtPolygon,
  trailersAtDocks,
} from '../../lib/map-utils/groundProps';
import { autoSpaceId } from '../../types';

const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_TOKEN ?? '').trim();

const STYLE_SATELLITE = 'mapbox://styles/mapbox/satellite-streets-v12';
const STYLE_LIGHT = 'mapbox://styles/mapbox/light-v11';

const DEFAULT_CENTER: [number, number] = [-98.5795, 39.8283];
const DEFAULT_ZOOM = 3.2;

const BUILDINGS_SOURCE = 'lt-buildings';
const BUILDINGS_LAYER_FILL = 'lt-buildings-extrusion';
const BUILDINGS_LAYER_OUTLINE = 'lt-buildings-outline';
// Dock doors live on their own source/layer so the extrusion height
// and color can differ from the parent building extrusion (short +
// dark gray to read as a separate visual element).
const DOCK_DOORS_SOURCE = 'lt-dock-doors';
const DOCK_DOORS_LAYER = 'lt-dock-doors-extrusion';
// Truck court — flat concrete pad in front of the frontage edge.
// Renders as a low-opacity fill (no extrusion) at z=0 so it reads as
// ground texture without obscuring the satellite below.
const TRUCK_COURT_SOURCE = 'lt-truck-court';
const TRUCK_COURT_LAYER = 'lt-truck-court-fill';
// Trailers parked at a subset of dock doors. Short extrusion (~13.5ft)
// in dark gray so they read as separate objects from the building.
const TRUCKS_SOURCE = 'lt-trucks';
const TRUCKS_LAYER = 'lt-trucks-extrusion';

const FT_TO_METERS = 0.3048;

// ── Project model (derived from deals) ────────────────────────────

export interface Project {
  id: string;
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

// ── Parametric placement mode ─────────────────────────────────────

export interface PlacementParams {
  widthFt: number;
  depthFt: number;
  rotationDeg: number;
  bayCount: number;
}

// `mode` controls which entity set the map renders and which UI chrome
// shows. Embed-mode variants ('*-only') drop the deal-side place-pin
// picker + ProjectDrawer; expected to live inside their owning view.
//   - 'all'        → deals + dev projects + acq targets + dispo listings
//   - 'dev-only'   → dev projects only
//   - 'acq-only'   → acquisition targets only
//   - 'dispo-only' → disposition listings only
export type MapMode = 'all' | 'dev-only' | 'acq-only' | 'dispo-only';

interface Props {
  deals: Deal[];
  onSelectDeal: (deal: Deal) => void;
  onUpdateProjectCoords: (projectId: string, lat: number, lng: number) => void;
  onToast?: (msg: string) => void;
  devProjects?: DevelopmentProject[];
  onSelectDevProject?: (p: DevelopmentProject) => void;
  onUpdateDevProjectCoords?: (id: string, lat: number, lng: number) => void;
  acqTargets?: AcquisitionTarget[];
  onSelectAcqTarget?: (a: AcquisitionTarget) => void;
  onUpdateAcqTargetCoords?: (id: string, lat: number, lng: number) => void;
  dispoListings?: DispositionListing[];
  onSelectDispoListing?: (d: DispositionListing) => void;
  onUpdateDispoListingCoords?: (id: string, lat: number, lng: number) => void;
  mode?: MapMode;
}

export function MapView({
  deals,
  onSelectDeal,
  onUpdateProjectCoords,
  onToast,
  devProjects = [],
  onSelectDevProject,
  onUpdateDevProjectCoords,
  acqTargets = [],
  onSelectAcqTarget,
  onUpdateAcqTargetCoords,
  dispoListings = [],
  onSelectDispoListing,
  onUpdateDispoListingCoords,
  mode = 'all',
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  const [mapStyle, setMapStyle] = useState<'satellite' | 'light'>('satellite');
  const [placingProjectId, setPlacingProjectId] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  // True once the Mapbox style is fully loaded (and re-true after every
  // style switch). The buildings/dock-doors render effect bails out
  // when this is false — bumping it on `style.load` is what forces a
  // retry so the user doesn't have to click around to coax buildings
  // onto the map.
  const [styleReady, setStyleReady] = useState(false);
  // Parametric building placement mode. When `params` is set, the
  // next map click drops a rectangle at that point with these dims.
  const [placement, setPlacement] = useState<PlacementParams | null>(null);

  const projects = useMemo(
    () => (mode === 'all' ? buildProjects(deals) : []),
    [deals, mode]
  );
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
  // Each entity type filters itself based on `mode` so the consumer
  // can keep passing the full lists; only the selected kinds render.
  const pinnedDevProjects = useMemo(
    () =>
      mode === 'acq-only' || mode === 'dispo-only'
        ? []
        : devProjects.filter(
            (p): p is DevelopmentProject & { lat: number; lng: number } =>
              typeof p.lat === 'number' && typeof p.lng === 'number'
          ),
    [devProjects, mode]
  );
  const pinnedAcqTargets = useMemo(
    () =>
      mode === 'dev-only' || mode === 'dispo-only'
        ? []
        : acqTargets.filter(
            (a): a is AcquisitionTarget & { lat: number; lng: number } =>
              typeof a.lat === 'number' && typeof a.lng === 'number'
          ),
    [acqTargets, mode]
  );
  const pinnedDispoListings = useMemo(
    () =>
      mode === 'dev-only' || mode === 'acq-only'
        ? []
        : dispoListings.filter(
            (d): d is DispositionListing & { lat: number; lng: number } =>
              typeof d.lat === 'number' && typeof d.lng === 'number'
          ),
    [dispoListings, mode]
  );
  const activeProject = activeProjectId ? projectsById.get(activeProjectId) ?? null : null;
  const placingProject = placingProjectId ? projectsById.get(placingProjectId) ?? null : null;

  // Refs for once-bound handlers.
  const placingRef = useRef<string | null>(null);
  placingRef.current = placingProjectId;
  const onUpdateRef = useRef(onUpdateProjectCoords);
  onUpdateRef.current = onUpdateProjectCoords;
  const activeProjectIdRef = useRef<string | null>(null);
  activeProjectIdRef.current = activeProjectId;
  const onToastRef = useRef(onToast);
  onToastRef.current = onToast;
  const placementRef = useRef<PlacementParams | null>(null);
  placementRef.current = placement;
  const buildingsRef = useRef<Building[]>([]);
  buildingsRef.current = buildings;
  const onSelectDevRef = useRef(onSelectDevProject);
  onSelectDevRef.current = onSelectDevProject;
  const onUpdateDevRef = useRef(onUpdateDevProjectCoords);
  onUpdateDevRef.current = onUpdateDevProjectCoords;
  const onSelectAcqRef = useRef(onSelectAcqTarget);
  onSelectAcqRef.current = onSelectAcqTarget;
  const onUpdateAcqRef = useRef(onUpdateAcqTargetCoords);
  onUpdateAcqRef.current = onUpdateAcqTargetCoords;
  const onSelectDispoRef = useRef(onSelectDispoListing);
  onSelectDispoRef.current = onSelectDispoListing;
  const onUpdateDispoRef = useRef(onUpdateDispoListingCoords);
  onUpdateDispoRef.current = onUpdateDispoListingCoords;

  const handleSelectProject = (id: string) => {
    setActiveProjectId(id);
    setPlacement(null);
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
    setPlacement(null);
    // Don't clear buildings — keep all projects' buildings on the map.
  };

  const handleStartPlacement = (params: PlacementParams) => {
    setPlacement(params);
  };

  const handleCancelPlacement = () => {
    setPlacement(null);
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
      // Building placement takes priority — drops a rectangle here.
      const params = placementRef.current;
      const projectId = activeProjectIdRef.current;
      if (params && projectId) {
        const { lng, lat } = e.lngLat;
        createBuildingAt({ lng, lat }, params, projectId);
        return;
      }
      // Otherwise, project pin placement.
      const placingId = placingRef.current;
      if (!placingId) return;
      const { lng, lat } = e.lngLat;
      onUpdateRef.current(placingId, lat, lng);
      setPlacingProjectId(null);
    });

    // Initial load fires before style.load on first construction.
    map.on('load', () => {
      ensureBuildingsLayers(map);
      setStyleReady(true);
    });
    // Fires after setStyle() — re-add our layers + retrigger render.
    map.on('style.load', () => {
      ensureBuildingsLayers(map);
      setStyleReady(true);
    });
    // Bookkeeping — when a style switch starts, drop ready so the
    // render effect waits instead of pushing data to a half-built source.
    map.on('styledataloading', () => {
      setStyleReady(false);
    });

    mapRef.current = map;

    // Mapbox doesn't observe its container's size changes — when the
    // ProjectDrawer slides in/out the flex layout, the map needs an
    // explicit resize() call or it renders the old dimensions until
    // the next interaction. ResizeObserver fires on every container
    // size change; rAF debounces so we coalesce mid-animation frames.
    let resizeFrame = 0;
    const resizeObs = new ResizeObserver(() => {
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        map.resize();
      });
    });
    resizeObs.observe(containerRef.current);

    return () => {
      resizeObs.disconnect();
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function createBuildingAt(
    center: { lng: number; lat: number },
    params: PlacementParams,
    projectId: string
  ) {
    const rectangleParams = {
      centerLat: center.lat,
      centerLng: center.lng,
      widthFt: params.widthFt,
      depthFt: params.depthFt,
      rotationDeg: params.rotationDeg,
    };
    const footprint = rectangleFromCenter(rectangleParams);
    const now = new Date().toISOString();
    // Building ordinal = next available slot within THIS project.
    // (max existing ordinal in this project) + 1 so deletes don't
    // immediately recycle.
    const projectBuildings = buildingsRef.current.filter((b) => b.projectId === projectId);
    const existingOrdinals = projectBuildings
      .map((b) => b.buildingOrdinal ?? 0)
      .filter((n) => n > 0);
    const nextOrdinal =
      existingOrdinals.length > 0 ? Math.max(...existingOrdinals) + 1 : 1;
    const next: Building = {
      id: crypto.randomUUID(),
      projectId,
      name: `Building ${nextOrdinal}`,
      footprint,
      heightFt: 30,
      color: null,
      bayCount: params.bayCount,
      frontageSide: null,
      widthFt: params.widthFt,
      depthFt: params.depthFt,
      rotationDeg: params.rotationDeg,
      centerLat: center.lat,
      centerLng: center.lng,
      bumpOuts: [],
      baySpaceIds: [],
      buildingOrdinal: nextOrdinal,
      createdAt: now,
      updatedAt: now,
    };
    setBuildings((prev) => [...prev, next]);
    upsertBuilding(next).catch((err) => {
      console.error('Save building failed:', err);
      onToastRef.current?.('Save building failed');
    });
    setPlacement(null);
    onToastRef.current?.(
      `Added ${params.widthFt}×${params.depthFt} ft building` +
        (params.bayCount > 1 ? ` · ${params.bayCount} bays` : '')
    );
  }

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(mapStyle === 'satellite' ? STYLE_SATELLITE : STYLE_LIGHT);
  }, [mapStyle]);

  // Cursor: crosshair when placing a project pin OR a building.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = placingProjectId || placement ? 'crosshair' : '';
  }, [placingProjectId, placement]);

  // Flatten + bump zoom while placing a building; restore tilt when
  // exiting placement. Only fires on placement TRANSITIONS — if this
  // also fired on activeProjectId changes (as it used to), it would
  // interrupt handleSelectProject's flyTo and wipe out the zoom +
  // center it just set. The ref tracks the previous placement value
  // so we know when we're actually transitioning vs. just re-running
  // because activeProjectId changed.
  const wasPlacementRef = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const enteringPlacement = !!placement && !wasPlacementRef.current;
    const exitingPlacement = !placement && wasPlacementRef.current;
    wasPlacementRef.current = !!placement;
    if (enteringPlacement) {
      map.easeTo({
        pitch: 0,
        bearing: 0,
        zoom: Math.max(map.getZoom(), 18.5),
        duration: 600,
      });
    } else if (exitingPlacement && activeProjectId) {
      map.easeTo({ pitch: 55, bearing: -45, duration: 600 });
    }
  }, [placement, activeProjectId]);

  // ── Sync project markers (draggable + click to drill in) ────────
  // Markers are keyed `deal:<id>` and `dev:<id>` so deal-project and
  // dev-project pins coexist without collision and each branch can
  // wire its own click + dragend handlers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const existing = markersRef.current;
    const next = new Set<string>();

    for (const p of pinnedProjects) {
      const key = `deal:${p.id}`;
      next.add(key);
      const m = existing.get(key);
      if (m) {
        m.setLngLat([p.lng, p.lat]);
        const el = m.getElement();
        const labelEl = el.querySelector('[data-pin-label]');
        if (labelEl) labelEl.textContent = projectPinLabel(p);
        const sub = el.querySelector('[data-pin-sublabel]');
        if (sub) sub.textContent = `${p.deals.length} ${p.deals.length === 1 ? 'deal' : 'deals'}`;
        m.setDraggable(!placementRef.current);
        continue;
      }
      const el = createProjectMarkerEl(p);
      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom', draggable: true })
        .setLngLat([p.lng, p.lat])
        .addTo(map);
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
      existing.set(key, marker);
    }

    for (const p of pinnedDevProjects) {
      const key = `dev:${p.id}`;
      next.add(key);
      const m = existing.get(key);
      if (m) {
        m.setLngLat([p.lng, p.lat]);
        const el = m.getElement();
        applyDevProjectMarker(el, p);
        m.setDraggable(!placementRef.current);
        continue;
      }
      const el = createDevProjectMarkerEl(p);
      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom', draggable: true })
        .setLngLat([p.lng, p.lat])
        .addTo(map);
      let wasDragged = false;
      marker.on('dragstart', () => { wasDragged = false; });
      marker.on('drag', () => { wasDragged = true; });
      marker.on('dragend', () => {
        const ll = marker.getLngLat();
        const updater = onUpdateDevRef.current;
        if (!updater) return;
        updater(p.id, ll.lat, ll.lng);
      });
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (wasDragged) {
          wasDragged = false;
          return;
        }
        onSelectDevRef.current?.(p);
      });
      existing.set(key, marker);
    }

    for (const a of pinnedAcqTargets) {
      const key = `acq:${a.id}`;
      next.add(key);
      const m = existing.get(key);
      if (m) {
        m.setLngLat([a.lng, a.lat]);
        applyAcqTargetMarker(m.getElement(), a);
        m.setDraggable(!placementRef.current);
        continue;
      }
      const el = createAcqTargetMarkerEl(a);
      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom', draggable: true })
        .setLngLat([a.lng, a.lat])
        .addTo(map);
      let wasDragged = false;
      marker.on('dragstart', () => { wasDragged = false; });
      marker.on('drag', () => { wasDragged = true; });
      marker.on('dragend', () => {
        const ll = marker.getLngLat();
        onUpdateAcqRef.current?.(a.id, ll.lat, ll.lng);
      });
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (wasDragged) {
          wasDragged = false;
          return;
        }
        onSelectAcqRef.current?.(a);
      });
      existing.set(key, marker);
    }

    for (const d of pinnedDispoListings) {
      const key = `dispo:${d.id}`;
      next.add(key);
      const m = existing.get(key);
      if (m) {
        m.setLngLat([d.lng, d.lat]);
        applyDispoListingMarker(m.getElement(), d);
        m.setDraggable(!placementRef.current);
        continue;
      }
      const el = createDispoListingMarkerEl(d);
      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom', draggable: true })
        .setLngLat([d.lng, d.lat])
        .addTo(map);
      let wasDragged = false;
      marker.on('dragstart', () => { wasDragged = false; });
      marker.on('drag', () => { wasDragged = true; });
      marker.on('dragend', () => {
        const ll = marker.getLngLat();
        onUpdateDispoRef.current?.(d.id, ll.lat, ll.lng);
      });
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (wasDragged) {
          wasDragged = false;
          return;
        }
        onSelectDispoRef.current?.(d);
      });
      existing.set(key, marker);
    }

    for (const [key, marker] of existing) {
      if (!next.has(key)) {
        marker.remove();
        existing.delete(key);
      }
    }

    const totalPinned =
      pinnedProjects.length +
      pinnedDevProjects.length +
      pinnedAcqTargets.length +
      pinnedDispoListings.length;
    if (totalPinned > 0 && !hasFitted.current && !activeProjectIdRef.current) {
      const bounds = new mapboxgl.LngLatBounds();
      for (const p of pinnedProjects) bounds.extend([p.lng, p.lat]);
      for (const p of pinnedDevProjects) bounds.extend([p.lng, p.lat]);
      for (const a of pinnedAcqTargets) bounds.extend([a.lng, a.lat]);
      for (const d of pinnedDispoListings) bounds.extend([d.lng, d.lat]);
      map.fitBounds(bounds, {
        padding: 80,
        maxZoom: totalPinned === 1 ? 12 : 8,
        duration: 800,
      });
      hasFitted.current = true;
    }
  }, [pinnedProjects, pinnedDevProjects, pinnedAcqTargets, pinnedDispoListings, placement]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasFitted = useRef(false);

  // ── Load + subscribe to ALL buildings (every project) ──────────
  // Buildings stay on the map regardless of which project the user
  // has open in the drawer — the drawer just filters to its own
  // project's list for editing.
  useEffect(() => {
    let cancelled = false;
    listAllBuildings()
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
  }, []);

  // ── Render building bays as fill-extrusion ──────────────────────
  // styleReady is in the dep array so the effect re-runs as soon as
  // the Mapbox style finishes loading — eliminates the "click a few
  // times for buildings to show up" race we had pre-2026-05-22.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!styleReady) return;
    if (!map.isStyleLoaded()) return;
    ensureBuildingsLayers(map);
    const src = map.getSource(BUILDINGS_SOURCE) as mapboxgl.GeoJSONSource | undefined;
    const dockSrc = map.getSource(DOCK_DOORS_SOURCE) as
      | mapboxgl.GeoJSONSource
      | undefined;
    const courtSrc = map.getSource(TRUCK_COURT_SOURCE) as
      | mapboxgl.GeoJSONSource
      | undefined;
    const truckSrc = map.getSource(TRUCKS_SOURCE) as
      | mapboxgl.GeoJSONSource
      | undefined;
    if (!src) return;

    const features: Feature[] = [];
    const dockFeatures: Feature[] = [];
    const courtFeatures: Feature[] = [];
    const truckFeatures: Feature[] = [];
    for (const b of buildings) {
      const heightMeters = b.heightFt * FT_TO_METERS;
      const hasParams =
        b.widthFt != null && b.depthFt != null && b.centerLat != null && b.centerLng != null;
      const rectParams = hasParams
        ? {
            centerLat: b.centerLat!,
            centerLng: b.centerLng!,
            widthFt: b.widthFt!,
            depthFt: b.depthFt!,
            rotationDeg: b.rotationDeg,
          }
        : null;

      // Main building bays.
      if (rectParams && b.bayCount > 1) {
        const bays = parametricBays(rectParams, b.bayCount);
        bays.forEach((bay, idx) => {
          const customId = b.baySpaceIds[idx];
          const spaceId =
            customId ?? autoSpaceId(b.projectId, b.buildingOrdinal, idx);
          features.push({
            type: 'Feature',
            geometry: bay,
            properties: {
              id: `${b.id}:bay-${idx}`,
              buildingId: b.id,
              kind: 'bay',
              name: `${b.name} · Bay ${idx + 1}`,
              spaceId,
              heightMeters,
              color: b.color ?? bayColor(idx),
            },
          });
        });
      } else {
        features.push({
          type: 'Feature',
          geometry: b.footprint as Polygon,
          properties: {
            id: b.id,
            buildingId: b.id,
            kind: 'bay',
            name: b.name,
            spaceId: b.baySpaceIds[0] ?? autoSpaceId(b.projectId, b.buildingOrdinal, 0),
            heightMeters,
            color: b.color ?? bayColor(0),
          },
        });
      }

      // Dock doors, truck court, parked trailers — parametric only.
      // We resolve frontage once and reuse it across all three.
      if (rectParams) {
        const side = b.frontageSide ?? detectFrontageSide(b.footprint as Polygon);

        // Truck court — flat concrete pad in front of frontage.
        courtFeatures.push({
          type: 'Feature',
          geometry: truckCourtPolygon(rectParams, side),
          properties: {
            id: `${b.id}:court`,
            buildingId: b.id,
            kind: 'truck-court',
          },
        });

        // Dock doors.
        const doors = buildingDockDoors(rectParams, side);
        const dockHeightMeters = Math.max(
          10 * FT_TO_METERS,
          Math.min(heightMeters * 0.4, 14 * FT_TO_METERS)
        );
        doors.forEach((door, idx) => {
          dockFeatures.push({
            type: 'Feature',
            geometry: door,
            properties: {
              id: `${b.id}:dock-${idx}`,
              buildingId: b.id,
              kind: 'dock-door',
              heightMeters: dockHeightMeters,
            },
          });
        });

        // Parked trailers at a subset of the docks. Slightly shorter
        // than the dock-door height so the doors still pop above them.
        const trailers = trailersAtDocks(rectParams, side);
        const trailerHeightMeters = Math.max(
          3.5,
          Math.min(dockHeightMeters - 0.5, 13.5 * FT_TO_METERS)
        );
        trailers.forEach((t) => {
          truckFeatures.push({
            type: 'Feature',
            geometry: t.geometry,
            properties: {
              id: `${b.id}:trailer-${t.dockIndex}`,
              buildingId: b.id,
              kind: 'trailer',
              heightMeters: trailerHeightMeters,
            },
          });
        });
      }

      // Bump-outs (parametric only — need building rectParams to anchor).
      if (rectParams) {
        b.bumpOuts.forEach((bo, idx) => {
          const poly = bumpOutPolygon(rectParams, bo);
          const spaceId =
            bo.spaceId ?? autoSpaceId(b.projectId, b.buildingOrdinal, b.bayCount + idx);
          features.push({
            type: 'Feature',
            geometry: poly,
            properties: {
              id: `${b.id}:bump-${bo.id}`,
              buildingId: b.id,
              kind: 'bumpout',
              name: bo.name ?? `${b.name} · ${bo.side} bump-out`,
              spaceId,
              heightMeters,
              // Subtle visual differentiation — bump-outs use a muted
              // version of the bay color to read as "extension of".
              color: b.color ?? bayColor(b.bayCount + idx),
            },
          });
        });
      }
    }
    src.setData({ type: 'FeatureCollection', features });
    dockSrc?.setData({ type: 'FeatureCollection', features: dockFeatures });
    courtSrc?.setData({ type: 'FeatureCollection', features: courtFeatures });
    truckSrc?.setData({ type: 'FeatureCollection', features: truckFeatures });
  }, [buildings, styleReady]);

  const handleSaveBuilding = (b: Building) => {
    // When parametric dims changed, regenerate the footprint so the
    // rendered polygon stays in sync.
    let next = b;
    if (
      b.widthFt != null &&
      b.depthFt != null &&
      b.centerLat != null &&
      b.centerLng != null
    ) {
      next = {
        ...b,
        footprint: rectangleFromCenter({
          centerLat: b.centerLat,
          centerLng: b.centerLng,
          widthFt: b.widthFt,
          depthFt: b.depthFt,
          rotationDeg: b.rotationDeg,
        }),
        updatedAt: new Date().toISOString(),
      };
    }
    setBuildings((prev) => prev.map((x) => (x.id === next.id ? next : x)));
    upsertBuilding(next).catch((err) => {
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

  // Any '*-only' mode is treated as an embed — hides the deal-side
  // place-pin picker + ProjectDrawer, uses compact container sizing.
  const embed = mode !== 'all';
  const totalProjects = projects.length;
  const totalUnpinned = projects.length - pinnedProjects.length;
  const orphanDealCount = embed
    ? 0
    : deals.filter((d) => !d.dealId?.trim()).length;
  const totalDevProjects = mode === 'all' || mode === 'dev-only' ? devProjects.length : 0;
  const unpinnedDev = totalDevProjects - pinnedDevProjects.length;
  const totalAcq = mode === 'all' || mode === 'acq-only' ? acqTargets.length : 0;
  const unpinnedAcq = totalAcq - pinnedAcqTargets.length;
  const totalDispo = mode === 'all' || mode === 'dispo-only' ? dispoListings.length : 0;
  const unpinnedDispo = totalDispo - pinnedDispoListings.length;

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm text-fg-muted flex-wrap">
          <MapPin size={14} strokeWidth={2} className="text-accent" />
          {!embed && (
            <>
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
            </>
          )}
          {totalDevProjects > 0 && (
            <>
              {!embed && <span className="text-fg-subtle">·</span>}
              <span>
                {pinnedDevProjects.length} of {totalDevProjects}{' '}
                {totalDevProjects === 1 ? 'dev project pinned' : 'dev projects pinned'}
              </span>
              {unpinnedDev > 0 && (
                <>
                  <span className="text-fg-subtle">·</span>
                  <span className="text-fg-subtle">{unpinnedDev} unpinned</span>
                </>
              )}
            </>
          )}
          {totalAcq > 0 && (
            <>
              <span className="text-fg-subtle">·</span>
              <span>
                {pinnedAcqTargets.length} of {totalAcq}{' '}
                {totalAcq === 1 ? 'target pinned' : 'targets pinned'}
              </span>
              {unpinnedAcq > 0 && (
                <>
                  <span className="text-fg-subtle">·</span>
                  <span className="text-fg-subtle">{unpinnedAcq} unpinned</span>
                </>
              )}
            </>
          )}
          {totalDispo > 0 && (
            <>
              <span className="text-fg-subtle">·</span>
              <span>
                {pinnedDispoListings.length} of {totalDispo}{' '}
                {totalDispo === 1 ? 'listing pinned' : 'listings pinned'}
              </span>
              {unpinnedDispo > 0 && (
                <>
                  <span className="text-fg-subtle">·</span>
                  <span className="text-fg-subtle">{unpinnedDispo} unpinned</span>
                </>
              )}
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
          {!embed && (
            <PlacePinPicker
              projects={projects}
              placingProjectId={placingProjectId}
              onPick={setPlacingProjectId}
            />
          )}
          <StyleToggle style={mapStyle} onChange={setMapStyle} />
        </div>
      </div>

      {!embed && placingProject && (
        <PlacementBanner
          project={placingProject}
          onCancel={() => setPlacingProjectId(null)}
        />
      )}

      {!embed && placement && (
        <BuildingPlacementBanner params={placement} onCancel={handleCancelPlacement} />
      )}

      {/* Map + drawer sit in a horizontal flex so the drawer pushes
          the map to the left rather than overlaying it. ResizeObserver
          calls map.resize() whenever the container changes width so
          Mapbox repaints to the new dimensions cleanly.
          In any embed mode the container takes the parent's full
          height (the owning view constrains it externally). */}
      <div
        className={
          embed
            ? 'flex-1 min-h-[320px]'
            : 'flex gap-3 h-[calc(100vh-280px)] min-h-[460px]'
        }
      >
        <div
          ref={containerRef}
          className={
            embed
              ? 'h-full w-full rounded-2xl shadow-soft overflow-hidden bg-bg-subtle'
              : 'flex-1 min-w-0 rounded-2xl shadow-soft overflow-hidden bg-bg-subtle'
          }
        />
        {!embed && activeProject && (
          <div className="w-full max-w-md shrink-0">
            <ProjectDrawer
              project={activeProject}
              buildings={buildings.filter((b) => b.projectId === activeProject.id)}
              placement={placement}
              onClose={handleCloseProject}
              onSelectDeal={(d) => onSelectDeal(d)}
              onStartPlacement={handleStartPlacement}
              onCancelPlacement={handleCancelPlacement}
              onSaveBuilding={handleSaveBuilding}
              onDeleteBuilding={handleDeleteBuilding}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Mapbox layers ────────────────────────────────────────────────

function ensureBuildingsLayers(map: mapboxgl.Map) {
  // Truck court goes FIRST so the building extrusion paints over it
  // along the frontage edge (the court overhangs slightly past the
  // building footprint — we want the building outline on top).
  if (!map.getSource(TRUCK_COURT_SOURCE)) {
    map.addSource(TRUCK_COURT_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }
  if (!map.getLayer(TRUCK_COURT_LAYER)) {
    map.addLayer({
      id: TRUCK_COURT_LAYER,
      type: 'fill',
      source: TRUCK_COURT_SOURCE,
      paint: {
        // Warm concrete tone, semi-transparent over satellite.
        'fill-color': '#a89c8d',
        'fill-opacity': 0.55,
        'fill-outline-color': '#7a6e5f',
      },
    });
  }
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
  if (!map.getSource(DOCK_DOORS_SOURCE)) {
    map.addSource(DOCK_DOORS_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }
  if (!map.getLayer(DOCK_DOORS_LAYER)) {
    map.addLayer({
      id: DOCK_DOORS_LAYER,
      type: 'fill-extrusion',
      source: DOCK_DOORS_SOURCE,
      paint: {
        // Dark gray with slight warmth to read against both the
        // satellite imagery and the copper building color.
        'fill-extrusion-color': '#2a2724',
        'fill-extrusion-height': ['coalesce', ['get', 'heightMeters'], 3.5],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.95,
      },
    });
  }
  if (!map.getSource(TRUCKS_SOURCE)) {
    map.addSource(TRUCKS_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }
  if (!map.getLayer(TRUCKS_LAYER)) {
    map.addLayer({
      id: TRUCKS_LAYER,
      type: 'fill-extrusion',
      source: TRUCKS_SOURCE,
      paint: {
        // Slightly lighter than dock doors so the rectangles read as
        // separate trailer bodies against the dock face.
        'fill-extrusion-color': '#9b9690',
        'fill-extrusion-height': ['coalesce', ['get', 'heightMeters'], 4],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.92,
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

// Lucide hard-hat SVG path. Inline because the marker DOM is hand-built
// (no React) for performance and to mirror createProjectMarkerEl.
const HARD_HAT_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1Z"/><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M4 15v-3a6 6 0 0 1 6-6"/><path d="M14 6a6 6 0 0 1 6 6v3"/></svg>';

// Phase → Tailwind class triplet for the dev-project pin badge.
// Mirrors the visual idiom of DevelopmentView's PhasePill, scaled up
// to badge size.
function devPhaseTint(phase: DevPhase): { bg: string; text: string; ring: string } {
  switch (phase) {
    case 'Construction':
      return { bg: 'bg-warning', text: 'text-white', ring: 'border-white' };
    case 'Lease-Up':
      return { bg: 'bg-success', text: 'text-white', ring: 'border-white' };
    case 'Delivered':
      return { bg: 'bg-success', text: 'text-white', ring: 'border-white' };
    case 'On Hold':
    case 'Cancelled':
      return {
        bg: 'bg-fg-subtle/40',
        text: 'text-fg-muted',
        ring: 'border-bg-elevated',
      };
    case 'Site Selection':
    case 'Entitlement':
    case 'Design':
    default:
      return { bg: 'bg-accent', text: 'text-accent-fg', ring: 'border-white' };
  }
}

function devPinTitle(p: DevelopmentProject): string {
  return `${p.projectName} — ${p.phase}${p.address ? ' · ' + p.address : ''}`;
}

function createDevProjectMarkerEl(p: DevelopmentProject): HTMLElement {
  const wrap = document.createElement('button');
  wrap.type = 'button';
  wrap.className =
    'group relative flex flex-col items-center focus:outline-none focus:ring-2 focus:ring-warning rounded-md';
  wrap.title = devPinTitle(p);
  wrap.setAttribute('aria-label', `Open dev project ${p.projectName}`);

  const tint = devPhaseTint(p.phase);
  const pin = document.createElement('div');
  pin.dataset.pinBadge = '';
  pin.className =
    `flex h-10 w-10 items-center justify-center rounded-full border-2 ${tint.ring} ` +
    `${tint.bg} ${tint.text} shadow-lift transition ` +
    'group-hover:scale-110';
  pin.innerHTML = HARD_HAT_SVG;
  wrap.appendChild(pin);

  const sub = document.createElement('div');
  sub.dataset.pinSublabel = '';
  sub.className =
    'mt-1 px-1.5 py-0.5 rounded-md bg-bg-elevated/90 text-[10px] font-medium text-fg shadow-soft pointer-events-none whitespace-nowrap';
  sub.textContent = devPinSublabel(p);
  wrap.appendChild(sub);

  return wrap;
}

function devPinSublabel(p: DevelopmentProject): string {
  if (p.riskLevel === 'High') return `${p.phase} · High risk`;
  return p.phase;
}

// Update an existing dev-project marker in place. Mirrors the inline
// label/sub update branch in the marker sync effect for deal pins.
function applyDevProjectMarker(el: HTMLElement, p: DevelopmentProject): void {
  el.title = devPinTitle(p);
  el.setAttribute('aria-label', `Open dev project ${p.projectName}`);
  const sub = el.querySelector('[data-pin-sublabel]');
  if (sub) sub.textContent = devPinSublabel(p);
  const badge = el.querySelector<HTMLElement>('[data-pin-badge]');
  if (badge) {
    const tint = devPhaseTint(p.phase);
    badge.className =
      `flex h-10 w-10 items-center justify-center rounded-full border-2 ${tint.ring} ` +
      `${tint.bg} ${tint.text} shadow-lift transition ` +
      'group-hover:scale-110';
  }
}

// ── Acquisition Target markers ────────────────────────────────────

// Lucide Target SVG — concentric circles + crosshairs.
const TARGET_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>';

function acqStatusTint(status: AcquisitionTarget['status']): {
  bg: string;
  text: string;
  ring: string;
} {
  switch (status) {
    case 'Closed':
      return { bg: 'bg-success', text: 'text-white', ring: 'border-white' };
    case 'LOI':
    case 'PSA':
    case 'Closing':
      return { bg: 'bg-warning', text: 'text-white', ring: 'border-white' };
    case 'On Hold':
    case 'Lost':
      return {
        bg: 'bg-fg-subtle/40',
        text: 'text-fg-muted',
        ring: 'border-bg-elevated',
      };
    case 'Sourcing':
    case 'Pursuing':
    default:
      return { bg: 'bg-accent', text: 'text-accent-fg', ring: 'border-white' };
  }
}

function acqPinTitle(a: AcquisitionTarget): string {
  return `${a.targetName} — ${a.status}${a.address ? ' · ' + a.address : ''}`;
}

function acqPinSublabel(a: AcquisitionTarget): string {
  return a.status;
}

function createAcqTargetMarkerEl(a: AcquisitionTarget): HTMLElement {
  const wrap = document.createElement('button');
  wrap.type = 'button';
  wrap.className =
    'group relative flex flex-col items-center focus:outline-none focus:ring-2 focus:ring-accent rounded-md';
  wrap.title = acqPinTitle(a);
  wrap.setAttribute('aria-label', `Open acquisition target ${a.targetName}`);

  const tint = acqStatusTint(a.status);
  const pin = document.createElement('div');
  pin.dataset.pinBadge = '';
  pin.className =
    `flex h-10 w-10 items-center justify-center rounded-full border-2 ${tint.ring} ` +
    `${tint.bg} ${tint.text} shadow-lift transition ` +
    'group-hover:scale-110';
  pin.innerHTML = TARGET_SVG;
  wrap.appendChild(pin);

  const sub = document.createElement('div');
  sub.dataset.pinSublabel = '';
  sub.className =
    'mt-1 px-1.5 py-0.5 rounded-md bg-bg-elevated/90 text-[10px] font-medium text-fg shadow-soft pointer-events-none whitespace-nowrap';
  sub.textContent = acqPinSublabel(a);
  wrap.appendChild(sub);

  return wrap;
}

function applyAcqTargetMarker(el: HTMLElement, a: AcquisitionTarget): void {
  el.title = acqPinTitle(a);
  el.setAttribute('aria-label', `Open acquisition target ${a.targetName}`);
  const sub = el.querySelector('[data-pin-sublabel]');
  if (sub) sub.textContent = acqPinSublabel(a);
  const badge = el.querySelector<HTMLElement>('[data-pin-badge]');
  if (badge) {
    const tint = acqStatusTint(a.status);
    badge.className =
      `flex h-10 w-10 items-center justify-center rounded-full border-2 ${tint.ring} ` +
      `${tint.bg} ${tint.text} shadow-lift transition ` +
      'group-hover:scale-110';
  }
}

// ── Disposition Listing markers ───────────────────────────────────

// Lucide Tag SVG — sale-tag silhouette for listings.
const TAG_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.59-6.59a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r="1.5" fill="currentColor"/></svg>';

function dispoStatusTint(status: DispositionListing['status']): {
  bg: string;
  text: string;
  ring: string;
} {
  switch (status) {
    case 'Closed':
      return { bg: 'bg-success', text: 'text-white', ring: 'border-white' };
    case 'Under Contract':
      return { bg: 'bg-warning', text: 'text-white', ring: 'border-white' };
    case 'Pulled':
    case 'On Hold':
      return {
        bg: 'bg-fg-subtle/40',
        text: 'text-fg-muted',
        ring: 'border-bg-elevated',
      };
    case 'Considering':
    case 'Underwriting':
    case 'Marketing':
    default:
      return { bg: 'bg-accent', text: 'text-accent-fg', ring: 'border-white' };
  }
}

function dispoPinTitle(d: DispositionListing): string {
  return `${d.assetName} — ${d.status}${d.address ? ' · ' + d.address : ''}`;
}

function dispoPinSublabel(d: DispositionListing): string {
  return d.status;
}

function createDispoListingMarkerEl(d: DispositionListing): HTMLElement {
  const wrap = document.createElement('button');
  wrap.type = 'button';
  wrap.className =
    'group relative flex flex-col items-center focus:outline-none focus:ring-2 focus:ring-accent rounded-md';
  wrap.title = dispoPinTitle(d);
  wrap.setAttribute('aria-label', `Open disposition listing ${d.assetName}`);

  const tint = dispoStatusTint(d.status);
  const pin = document.createElement('div');
  pin.dataset.pinBadge = '';
  pin.className =
    `flex h-10 w-10 items-center justify-center rounded-full border-2 ${tint.ring} ` +
    `${tint.bg} ${tint.text} shadow-lift transition ` +
    'group-hover:scale-110';
  pin.innerHTML = TAG_SVG;
  wrap.appendChild(pin);

  const sub = document.createElement('div');
  sub.dataset.pinSublabel = '';
  sub.className =
    'mt-1 px-1.5 py-0.5 rounded-md bg-bg-elevated/90 text-[10px] font-medium text-fg shadow-soft pointer-events-none whitespace-nowrap';
  sub.textContent = dispoPinSublabel(d);
  wrap.appendChild(sub);

  return wrap;
}

function applyDispoListingMarker(el: HTMLElement, d: DispositionListing): void {
  el.title = dispoPinTitle(d);
  el.setAttribute('aria-label', `Open disposition listing ${d.assetName}`);
  const sub = el.querySelector('[data-pin-sublabel]');
  if (sub) sub.textContent = dispoPinSublabel(d);
  const badge = el.querySelector<HTMLElement>('[data-pin-badge]');
  if (badge) {
    const tint = dispoStatusTint(d.status);
    badge.className =
      `flex h-10 w-10 items-center justify-center rounded-full border-2 ${tint.ring} ` +
      `${tint.bg} ${tint.text} shadow-lift transition ` +
      'group-hover:scale-110';
  }
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

function BuildingPlacementBanner({
  params,
  onCancel,
}: {
  params: PlacementParams;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-warning/10 border border-warning/40 rounded-xl text-sm">
      <div className="flex items-center gap-2 text-fg">
        <MapPin size={14} strokeWidth={2} className="text-warning shrink-0" />
        <span>
          Click the map to drop a{' '}
          <strong className="font-semibold tabular-nums">
            {params.widthFt}×{params.depthFt} ft
          </strong>{' '}
          building
          {params.rotationDeg !== 0 && (
            <span className="text-fg-muted"> · rotated {params.rotationDeg}°</span>
          )}
          {params.bayCount > 1 && (
            <span className="text-fg-muted"> · {params.bayCount} bays</span>
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

export { DEFAULT_BUILDING_PARAMS };
