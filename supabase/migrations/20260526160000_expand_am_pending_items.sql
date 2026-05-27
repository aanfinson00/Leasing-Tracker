-- Expand am_pending_items with cadence tracking and send-to audit trail.
-- Supports the Logistics AM Playbook integration: 8 new item types tracked
-- at monthly/quarterly/bi-annual/annual cadences, with the ability to push
-- completed items to destination tabs (rent roll, underwrite, etc.).

ALTER TABLE am_pending_items
  ADD COLUMN IF NOT EXISTS cadence text NOT NULL DEFAULT 'One-Time',
  ADD COLUMN IF NOT EXISTS sent_to_tab text,
  ADD COLUMN IF NOT EXISTS sent_to_id text;

CREATE INDEX IF NOT EXISTS idx_am_pending_items_cadence ON am_pending_items (cadence);
