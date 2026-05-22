-- ───────────────────────────────────────────────────────────────────
-- Synthetic seed for the four newest tables — useful for demoing the
-- new sections (Comps, Dev Pipeline, Tax Appeals, AM Pending) before
-- real data is loaded.
--
-- Idempotent: all IDs are fixed UUIDs so re-running upserts in place.
-- Run with:
--   psql $DATABASE_URL -f scripts/seed-new-tables.sql
-- or paste into the Supabase SQL editor.
--
-- Building IDs referenced (already exist in the live project):
--   1cb86189-d931-41ad-9772-6e9968d28b78 = Building 1
--   3f07910b-0834-4d38-9561-64d15258f720 = Building 2
-- ───────────────────────────────────────────────────────────────────

-- ── lease_comps ─────────────────────────────────────────────────
insert into lease_comps (
  id, property_name, building_address, market, property_type, building_type,
  tenant_name, tenant_industry, transaction_type, signed_date,
  lease_sf, building_sf, base_rent_psf, rent_type, term_months,
  free_rent_months, ti_psf, escalation_pct, options,
  source, confidence, confidential, notes
) values
  ('11111111-1111-1111-1111-111111111001',
    'Norfolk Industrial Park', '12345 Logistics Way, Norfolk VA',
    'Norfolk', 'Industrial', 'Rear Load',
    'Acme Logistics', 'Distribution', 'New Lease', '2025-11-15',
    125000, 410000, 7.50, 'NNN', 84,
    4, 12, 0.03, '2 x 5 yrs at FMV',
    'JLL Q4 2025 Industrial Report', 'High', false,
    'Comp on parent building 4001 — direct comp, broker-confirmed.'),
  ('11111111-1111-1111-1111-111111111002',
    'Suffolk Crossing 2', '845 Highway Ln, Suffolk VA',
    'Norfolk', 'Industrial', 'Front Load',
    'CHEP USA', 'Pallet pool', 'Renewal', '2026-02-20',
    72000, 200000, 6.95, 'NNN', 60,
    2, 5, 0.025, 'None',
    'Direct broker (CBRE)', 'Medium', true,
    'Renewal at slight roll-up. Tenant credit-strong; broker tip — off the record.'),
  ('11111111-1111-1111-1111-111111111003',
    'Atlanta South Hub', '4500 Industrial Pkwy, Atlanta GA',
    'Atlanta South', 'Industrial', 'Cross Dock',
    'XPO Logistics', '3PL', 'New Lease', '2025-09-08',
    240000, 240000, 8.85, 'NNN', 120,
    6, 18, 0.03, '1 x 10 yrs at 95% FMV',
    'CoStar 2025-09 listing snapshot', 'Medium', false,
    'Build-to-suit. Anchor for the park.'),
  ('11111111-1111-1111-1111-111111111004',
    'Dallas Trade Center', 'I-20 + Lancaster Rd, Dallas TX',
    'Dallas', 'Industrial', 'Rear Load',
    'Wayfair', 'E-commerce', 'Expansion', '2025-12-12',
    98000, 350000, 7.15, 'NNN', 72,
    3, 8, 0.025, '1 x 5 yrs',
    'JLL Q4 2025 Industrial Report', 'High', false,
    null)
on conflict (id) do update set
  base_rent_psf = excluded.base_rent_psf,
  updated_at = now();


-- ── development_projects ────────────────────────────────────────
insert into development_projects (
  id, project_name, market, address, phase, total_sf, acres,
  building_count, start_date, expected_delivery_date,
  total_budget, spent_to_date, pm_name, gc_name, architect,
  risk_level, status_summary
) values
  ('22222222-2222-2222-2222-222222222001',
    'Caliber Phase II', 'Norfolk', '4001 Industrial Way',
    'Construction', 410000, 28.5, 1,
    '2025-06-01', '2026-09-15',
    52000000, 31500000, 'Sarah Chen', 'Hagerman Construction', 'Ware Malcomb',
    'Medium',
    'Foundations + tilt-up complete. Roof going up next month. On schedule.'),
  ('22222222-2222-2222-2222-222222222002',
    'Whisper Greenfield', 'Greenville', 'TBD — under contract',
    'Site Selection', 320000, 22.0, 1,
    null, '2027-03-30',
    44000000, 0, 'Mike Torres', 'TBD', 'TBD',
    'High',
    'Site under contract; entitlements pending county vote 2026-08. Schedule risk if vote slips.'),
  ('22222222-2222-2222-2222-222222222003',
    'Caliber Speculative 3', 'Norfolk', '4101 Industrial Way',
    'Design', 280000, 18.0, 1,
    '2026-02-01', '2027-06-30',
    34000000, 1800000, 'Sarah Chen', 'TBD — bidding', 'Ware Malcomb',
    'Low',
    'DD set 60% complete. GMP bids due 2026-08-15.')
on conflict (id) do update set
  phase = excluded.phase,
  spent_to_date = excluded.spent_to_date,
  status_summary = excluded.status_summary,
  updated_at = now();


-- ── property_tax_appeals ────────────────────────────────────────
insert into property_tax_appeals (
  id, building_id, building, parcel_number, jurisdiction, tax_year,
  assessed_value, proposed_value, market_value, status,
  filed_date, hearing_date,
  initial_assessed_value, consultant_name, consultant_fee_pct, notes
) values
  ('33333333-3333-3333-3333-333333333001',
    '1cb86189-d931-41ad-9772-6e9968d28b78', 'Building 1', '12-345-678',
    'Norfolk County, VA', 2026,
    18500000, 14200000, 13800000, 'Hearing Scheduled',
    '2026-03-15', current_date + interval '12 days',
    18500000, 'Drucker & Falk', 0.30,
    'Comp set: 2025-09 sale at $138/SF vs implied $185/SF in assessment.'),
  ('33333333-3333-3333-3333-333333333002',
    '3f07910b-0834-4d38-9561-64d15258f720', 'Building 2', '12-345-679',
    'Norfolk County, VA', 2026,
    9200000, 7400000, 7200000, 'Filed',
    '2026-04-02', current_date + interval '45 days',
    9200000, 'Drucker & Falk', 0.30,
    null),
  ('33333333-3333-3333-3333-333333333003',
    '1cb86189-d931-41ad-9772-6e9968d28b78', 'Building 1', '12-345-678',
    'Norfolk County, VA', 2025,
    17800000, 14000000, 13900000, 'Settled',
    '2025-03-10', '2025-06-22',
    17800000, 'Drucker & Falk', 0.30,
    'Settled at $14.6M — $3.2M reduction.'),
  ('33333333-3333-3333-3333-333333333004',
    null, 'Greenville Tract (under contract)', null,
    'Greenville County, SC', 2026,
    null, null, null, 'Considering',
    null, null,
    null, null, null,
    'Watching the assessment process — appeal window if assessment > $1.2M when issued.')
on conflict (id) do update set
  status = excluded.status,
  hearing_date = excluded.hearing_date,
  updated_at = now();


-- ── am_pending_items ────────────────────────────────────────────
insert into am_pending_items (
  id, item_type, title, description,
  building_id, building_name, owner, status, priority,
  due_date, source, notes
) values
  ('44444444-4444-4444-4444-444444444001',
    'Construction Followup', 'Replace damaged dock seal #4',
    'Damaged during last week''s delivery — leaking. GC says under warranty.',
    '1cb86189-d931-41ad-9772-6e9968d28b78', 'Building 1',
    'Hagerman GC', 'Waiting', 'High',
    current_date - interval '3 days',
    'Punch list 2026-04', null),
  ('44444444-4444-4444-4444-444444444002',
    'Construction Followup', 'TI completion — Suite A office buildout',
    'Tenant accepting space conditional on office TI sign-off. ~95% complete.',
    '1cb86189-d931-41ad-9772-6e9968d28b78', 'Building 1',
    'Hagerman GC', 'In Progress', 'High',
    current_date + interval '5 days',
    'Tenant move-in coordinator email 2026-05-15', null),
  ('44444444-4444-4444-4444-444444444003',
    'Deliverable', 'Send LOI redline to Acme Logistics counsel',
    'Outstanding red-line responses on TI definition + early-termination right.',
    '1cb86189-d931-41ad-9772-6e9968d28b78', 'Building 1',
    'Internal counsel', 'Open', 'High',
    current_date + interval '2 days',
    'Acme broker call 2026-05-20', null),
  ('44444444-4444-4444-4444-444444444004',
    'Deliverable', 'Estoppel certificate — Frosch lease',
    'Lender requesting for refi. Tenant has 10 business days to return.',
    '3f07910b-0834-4d38-9561-64d15258f720', 'Building 2',
    'Property mgmt', 'Open', 'Medium',
    current_date + interval '10 days',
    'Refi closing checklist', null),
  ('44444444-4444-4444-4444-444444444005',
    'Tenant Request', 'Additional truck parking request — Walmart',
    'Tenant asking for 8 additional dedicated trailer parking spots on east lot.',
    '3f07910b-0834-4d38-9561-64d15258f720', 'Building 2',
    'AM team', 'Open', 'Medium',
    current_date + interval '14 days',
    'Walmart property contact email', null),
  ('44444444-4444-4444-4444-444444444006',
    'Building Monitoring', 'Roof inspection — Building 1',
    'Annual roof inspection per warranty. Last inspection 2025-04.',
    '1cb86189-d931-41ad-9772-6e9968d28b78', 'Building 1',
    'JLL property mgmt', 'Open', 'Medium',
    current_date + interval '45 days',
    'Roof warranty doc', null),
  ('44444444-4444-4444-4444-444444444007',
    'Building Monitoring', 'Sprinkler 5-year certification',
    'Required by AHJ. Due before 2026-08-15.',
    '3f07910b-0834-4d38-9561-64d15258f720', 'Building 2',
    'Fire prevention vendor', 'Open', 'Low',
    '2026-08-15',
    'Fire marshal compliance calendar', null),
  ('44444444-4444-4444-4444-444444444008',
    'Capital Vendor', 'HVAC service contract renewal',
    '3-year preventive maintenance contract up for renewal. Get 3 bids.',
    '1cb86189-d931-41ad-9772-6e9968d28b78', 'Building 1',
    'AM team', 'In Progress', 'Medium',
    current_date + interval '20 days',
    'Vendor calendar', null),
  ('44444444-4444-4444-4444-444444444009',
    'Capital Vendor', 'LED retrofit — Building 1 warehouse',
    'Quoted at $185k, 3.2yr payback. Decision needed for Q3 cap-ex.',
    '1cb86189-d931-41ad-9772-6e9968d28b78', 'Building 1',
    'AM team', 'Open', 'Low',
    null,
    'Cap-ex budget review', 'High-priority on the analysis side but no hard deadline.')
on conflict (id) do update set
  status = excluded.status,
  due_date = excluded.due_date,
  updated_at = now();
