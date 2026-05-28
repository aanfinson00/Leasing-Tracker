-- SiteSetter share-link URL on each development project.
-- Powers the "Preview rent roll from site plan" Excel export — see
-- src/lib/sitesetter.ts (parse token + fetch) and
-- src/lib/sitesetter-export.ts (build workbook).
ALTER TABLE development_projects
  ADD COLUMN IF NOT EXISTS site_setter_url TEXT;
