# Geo data — markets, submarkets, counties, cities

This directory holds the static GeoJSON polygons that drive
`src/lib/geo-tagger.ts`. Auto-tagging is a point-in-polygon lookup at
save time — first hit wins per layer.

## Files

| File | Layer | Status | Notes |
|---|---|---|---|
| `markets.json` | Market | **Approximate.** | MSA-level bounding shapes for DFW + Houston. Tight enough that nothing outside Texas tags as either. |
| `submarkets-dfw.json` | Submarket | **Approximate.** | Hand-drawn from public knowledge of DFW industrial geography — not CoStar's exact polygons. Refine when you have CoStar boundaries. |
| `submarkets-houston.json` | Submarket | **Approximate.** | Same caveat for Houston. |
| `counties.json` | County | **Scaffold (empty FeatureCollection).** | Drop in TIGER/Line county polygons for the ~20 relevant counties when you want county tagging. |
| `cities.json` | City | **Scaffold (empty FeatureCollection).** | Same — drop in TIGER/Line "places" polygons. |

## How to refine

Each file is a standard GeoJSON `FeatureCollection`. Each `Feature.properties`
must include a `name` field — that's what `geo-tagger.ts` returns as the tag.

Submarket features additionally need `properties.market` (`"DFW"` or
`"Houston"`) so the geo-tagger can scope correctly.

Edit the files directly in any GeoJSON editor (geojson.io is free), commit,
deploy. The geo-tagger loads the JSON lazily at first call and caches in
module scope, so no rebuild incantation needed beyond a normal deploy.

## How to source the real polygons

- **CoStar submarkets:** open the Markets tab → industrial filter → screenshot
  each submarket and trace into geojson.io. Or, if your CoStar plan exposes a
  boundary export, paste that GeoJSON in directly.
- **US counties:** download the per-state county shapefile from
  `https://www.census.gov/cgi-bin/geo/shapefiles/index.php`, convert to
  GeoJSON with `mapshaper` or `ogr2ogr`, filter to just the 20-ish counties
  this app cares about to keep the bundle small.
- **Cities ("places"):** same source — the TIGER/Line "places" layer.

Keep each file under ~500 KB. Use `mapshaper -simplify 5%` if needed.
