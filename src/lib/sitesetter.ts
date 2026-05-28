// =============================================================================
// SiteSetter client — anon read of a shared site plan
//
// SiteSetter's `get_shared_project` RPC is a SECURITY DEFINER function that
// gates on share_enabled + share_token. The anon key + URL are baked into
// SiteSetter's client bundle anyway, so re-using them from Leasing-Tracker
// is the same trust boundary the user already accepted when they generated
// the share link.
//
// CORS on Supabase RPC is permissive by default — no proxy needed.
// =============================================================================

// Public, baked-into-SiteSetter's-bundle. Equivalent to copying them out
// of view-source on any sitesetter.io share-view page.
const SITESETTER_SUPABASE_URL = 'https://dayxxakuczqfwwltchto.supabase.co';
const SITESETTER_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRheXh4YWt1Y3pxZnd3bHRjaHRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4ODg1MzIsImV4cCI6MjA4NTQ2NDUzMn0.pma8GU_hIsqYrkEVto8oflYKlrLIpAIVfa0hq6MYLCs';

// ─── Types ────────────────────────────────────────────────────────────────
// Shape of `get_shared_project` payload. See SiteSetter's
// `projects-ui.js::_hydrateBuildingRow` for the canonical interpretation.

export interface SiteSetterSide {
  layers?: Array<{ depth?: number }>;
  bumpOuts?: {
    left?: { width: number; depth: number };
    right?: { width: number; depth: number };
  };
}

export interface SiteSetterBuildingRaw {
  id: string;
  position_x: number;
  position_y: number;
  rotation?: number;
  config?: {
    width?: number;
    depth?: number;
    sf?: number;
    color?: string;
    buildingType?: string;
    sides?: {
      north?: SiteSetterSide;
      east?: SiteSetterSide;
      south?: SiteSetterSide;
      west?: SiteSetterSide;
    };
    truckCourt?: { width: number; depth: number } | null;
    truckCourtSide?: 'north' | 'east' | 'south' | 'west' | null;
    name?: string;
  };
}

export interface SiteSetterPayload {
  project: {
    id: string;
    name: string;
    description?: string | null;
    updated_at?: string;
  };
  site?: {
    scale?: number;
    boundary_points?: Array<{ x: number; y: number }> | null;
  } | null;
  buildings: SiteSetterBuildingRaw[];
  zones?: unknown[];
}

// ─── URL → token ──────────────────────────────────────────────────────────

/**
 * Extract the share token from a SiteSetter view URL. Tolerates either the
 * canonical `?view=<token>` form or a bare token paste.
 */
export function parseSiteSetterToken(input: string): string | null {
  const trimmed = (input ?? '').trim();
  if (!trimmed) return null;

  // Bare UUID-ish: 32+ hex chars (loose match — SiteSetter uses crypto.randomUUID)
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const token = url.searchParams.get('view');
    if (token) return token;
  } catch {
    /* fall through */
  }

  // Last resort: regex against any ?view= occurrence
  const match = trimmed.match(/[?&]view=([^&\s]+)/);
  return match?.[1] ?? null;
}

// ─── RPC call ─────────────────────────────────────────────────────────────

/**
 * Anon call to SiteSetter's `get_shared_project`. Returns null when the
 * token is unknown or share_enabled is false (RPC returns null).
 */
export async function fetchSharedSiteSetterProject(
  token: string
): Promise<SiteSetterPayload | null> {
  const res = await fetch(
    `${SITESETTER_SUPABASE_URL}/rest/v1/rpc/get_shared_project`,
    {
      method: 'POST',
      headers: {
        apikey: SITESETTER_ANON_KEY,
        Authorization: `Bearer ${SITESETTER_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_token: token }),
    }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`SiteSetter RPC failed (${res.status}): ${body || res.statusText}`);
  }
  const data = (await res.json()) as SiteSetterPayload | null;
  return data;
}

// ─── Normalized read shape ────────────────────────────────────────────────

export interface SiteSetterBuilding {
  id: string;
  name: string;            // falls back to "Building" when SiteSetter has none
  widthFt: number;
  depthFt: number;
  sf: number;
  rotationDeg: number;
  truckCourtSide: string | null;
  buildingType: string;
}

/**
 * Walk a payload and produce a normalized list of buildings — same fields
 * regardless of legacy/modern SiteSetter row shape.
 */
export function normalizeBuildings(payload: SiteSetterPayload): SiteSetterBuilding[] {
  return payload.buildings.map((b, idx) => {
    const cfg = b.config ?? {};
    const width = cfg.width ?? 400;
    const depth = cfg.depth ?? 200;
    const sf = cfg.sf ?? width * depth;
    const name = cfg.name?.trim() || `Building ${idx + 1}`;
    return {
      id: b.id,
      name,
      widthFt: width,
      depthFt: depth,
      sf,
      rotationDeg: b.rotation ?? 0,
      truckCourtSide: cfg.truckCourtSide ?? null,
      buildingType: cfg.buildingType ?? 'layered',
    };
  });
}
