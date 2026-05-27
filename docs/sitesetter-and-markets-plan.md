# Plan: SiteSetter ↔ Dev Pipeline + CoStar Markets/Submarkets

Two independent integrations. Both additive — no breakage to existing
schema or UI surfaces. Sequenced so they can be reviewed and shipped one
at a time.

---

## Part 1 — SiteSetter ↔ Development Pipeline

### What SiteSetter already provides (verified by reading the repo)

- Every project row in `projects` has `share_enabled` (bool) and
  `share_token` (uuid).
- View URL pattern: `https://sitesetter.io/site_planner.html?view=<token>`
- Anon-callable Supabase RPC `get_shared_project(p_token)` returns the
  full payload — `{ project, site, buildings, zones }` with geometry —
  in one round-trip. SECURITY DEFINER on SiteSetter's side gates on
  `share_enabled` + token match.
- Tables we'd consume on the SiteSetter side: `projects`, `sites`,
  `buildings`, `zones`.

That gives us a clean, auth-free read primitive. No new SiteSetter work
needed for the MVP — we consume an existing API.

### Integration shapes — pick the right tier

| Tier | What it is | Cost | When it's right |
|---|---|---|---|
| **1. Link field** | `site_setter_url` column on `development_projects`; drawer shows a "Site Plan" card with the link + (optional) thumbnail/last-updated label fetched from `get_shared_project` | ~2 hours | MVP. Always worth shipping first. |
| **2. Live embed** | Same as Tier 1 plus an iframe of the SiteSetter view in the drawer or a dedicated "Site Plan" tab | ~half day | When users want to *look at* the plan without leaving Dev Pipeline. Risk: SiteSetter's `X-Frame-Options` / CSP `frame-ancestors` must allow our origin — check before committing. |
| **3. Deep import** | Server-side fetch of `get_shared_project` → store building footprints as GeoJSON in Leasing-Tracker's `buildings` table (or a new `dev_project_site_plan` table). Render directly on Leasing-Tracker's map. | 1–2 days | When we want submarket aggregates that include the orientations, or when SiteSetter availability shouldn't gate viewing. Adds source-of-truth question (see below). |

### MVP — Tier 1 + lightweight metadata pre-fill

Ship the simplest thing that closes the loop. Lay groundwork for Tier 3
later by keeping the parsed token + sync timestamp alongside the URL.

### Schema (additive)

```sql
ALTER TABLE development_projects
  ADD COLUMN site_setter_url TEXT,
  ADD COLUMN site_setter_token TEXT,           -- parsed from url for fast RPC lookup
  ADD COLUMN site_setter_synced_at TIMESTAMPTZ;
```

### Files (Tier 1)

```
supabase/migrations/<ts>_add_site_setter_link.sql              NEW
src/lib/sitesetter.ts                                          NEW   parse share URL → token; fetch wrapper for get_shared_project
src/components/Development/DevelopmentProjectDrawer.tsx        EDIT  "Site Plan" section: input + "Open in SiteSetter ↗" card
src/components/Development/DevelopmentView.tsx                 EDIT  small map-pin icon on rows that have a plan attached
```

### Open questions for Part 1

1. **CORS / anon access.** Does SiteSetter's Supabase project allow
   anon-key RPC calls from `leasing-tracker-psi.vercel.app`? If not,
   either (a) proxy through our own server (small added latency, no big
   deal) or (b) add the origin to SiteSetter's allow list. Pick before
   building.
2. **Direction of sync.** MVP is one-way: SiteSetter → Leasing-Tracker.
   Do we ever need "create a SiteSetter project FROM Leasing-Tracker"
   (push)? Skipped for now.
3. **Tier 3 conflict resolution (deferred).** If buildings live in both
   apps and edited in both, who wins? Recommend: SiteSetter wins (design
   tool is the source of truth), Leasing-Tracker mirrors read-only.

---

## Part 2 — CoStar Markets / Submarkets for DFW + Houston

### Goal

Every Dev Project / Deal / AcqTarget / DispoListing has a lat/lng. Use
that to auto-tag four geographic fields, then filter the views by them.

| Field | Cardinality | Examples |
|---|---|---|
| `market` | 2 (for now) | DFW · Houston |
| `submarket` | ~30 across both | GSW · DFW Airport · NW Houston · Southwest Houston |
| `county` | ~15 | Dallas · Tarrant · Collin · Harris · Fort Bend · Montgomery |
| `city` | ~50 | Grand Prairie · Coppell · Frisco · Katy · Spring · Pasadena |

### Data sources

| Layer | Source | Format | Notes |
|---|---|---|---|
| Market | Hardcoded enum | `['DFW', 'Houston']` | trivial |
| **Submarket** | **CoStar** definitions | GeoJSON, committed as a static asset | The only one with proprietary boundaries. Two viable paths — see below |
| County | US Census TIGER/Line | GeoJSON | public, free |
| City | US Census TIGER/Line "places" | GeoJSON | public, free |

**Submarket polygon-acquisition options:**

- **(a)** Trace from CoStar's "Markets" map screenshots into GeoJSON
  using `geojson.io` or similar (~2 hours of manual work for ~30
  polygons). Honest, manual, ours forever. *My pick.*
- **(b)** Export from a CoStar boundary download if the user has one
  available — fastest if data exists, but unclear whether their plan
  includes it.
- **(c)** Pay for a third-party MSA submarket dataset. Overkill for two
  metros.

### Schema (additive)

```sql
ALTER TABLE development_projects
  ADD COLUMN market    TEXT,         -- 'DFW' | 'Houston' | null
  ADD COLUMN submarket TEXT,
  ADD COLUMN county    TEXT,
  ADD COLUMN city      TEXT;

CREATE INDEX idx_dev_projects_market    ON development_projects(market);
CREATE INDEX idx_dev_projects_submarket ON development_projects(submarket);
```

Same four columns added to `deals`, `acquisition_targets`, and
`disposition_listings` so the auto-tag pattern reuses everywhere.

The existing free-text `market` column on `deals` stays as-is during
the migration; the new logic just over-writes it with the canonical
value on next save (and a one-shot backfill script normalizes
historical rows).

### Auto-tagging logic

```
src/lib/geo-tagger.ts
  geoTag({ lat, lng }: LatLng) → { market, submarket, county, city }
```

- Loads four GeoJSON files lazily, caches in module scope.
- For each layer, runs Turf's `booleanPointInPolygon`; returns first hit.
- Used by every "save with new lat/lng" path:
  - `DevelopmentProjectDrawer` (on save)
  - `AcquisitionTargetDrawer` (same)
  - `DispositionListingDrawer` (same)
  - `DealDrawer` (where lat/lng is settable)
- A one-shot `scripts/backfill-geo-tags.ts` walks every existing row,
  tags it, writes back.

Performance: GeoJSON files for ~30 submarkets + ~15 counties + ~50
cities total well under 1 MB unminified. PIP across all four layers is
microseconds. Safe at write time.

### Filter UI (Phase 2)

Top of `DevelopmentView`, `AcquisitionsView`, `DispositionView`:

```
Markets:    [DFW] [Houston] [All]
Submarket:  [▾  GSW, DFW Airport, +3 ]   ← multi, scoped to current market
County:     [▾  Dallas, Tarrant ]
City:       [▾  +6 ]
```

- Selecting a market collapses the submarket list to that market's set.
- Filter state encoded into the URL hash so links share.
- Empty selection = no filter (all rows visible).

### Phasing

**Phase 1 — schema + tagging (~half day)**
- Migration
- Static GeoJSON files committed (`src/lib/geo-data/dfw-submarkets.json`,
  `src/lib/geo-data/houston-submarkets.json`, `counties.json`,
  `cities.json`)
- `geo-tagger.ts`
- Wire into the four drawers' save paths
- One-shot backfill script

**Phase 2 — filters (~half day)**
- Filter chips component in shared `ReportsFilterBar` style
- Wire into the four list views
- URL-hash persistence

**Phase 3 — overlays + reports (later)**
- Toggle button on the map to render submarket polygons as an overlay
- Per-submarket aggregates on the Reports tab (count, total SF, $/SF)

### Open questions for Part 2

1. **Submarket polygon source.** Trace from CoStar UI, or do you have a
   data export I should use? Affects only the first half-day.
2. **Enum exactness.** Use CoStar's exact submarket strings (so reports
   cross-reference cleanly) or our own shorthand? Recommend: exact.
3. **Backfill scope.** Tag only Dev Projects, or also Deals + AcqTargets
   + DispoListings on the same backfill? Recommend: all four — same
   util, same loop.

---

## Recommended sequence

1. **Markets Phase 1** — biggest UX payoff for least new dependency.
2. **SiteSetter Tier 1** — quick win, shippable in an afternoon.
3. **Markets Phase 2** (filters) — multiplies Phase 1.
4. **SiteSetter Tier 3** (deep import) — only if the link-only Tier 1
   feels too thin in practice.

Parts 1 and 2 don't touch the same files, so they can run in parallel
if you want both started at once.
