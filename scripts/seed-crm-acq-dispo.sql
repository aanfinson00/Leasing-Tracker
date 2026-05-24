-- ───────────────────────────────────────────────────────────────────
-- Phase 2 seed — CRM (contacts + per-parent links + notes) plus
-- Acquisition Targets and Disposition Listings with pre-populated
-- lat/lng so the new map embeds light up on first load.
-- Idempotent via fixed UUIDs.
-- Run with:
--   psql $DATABASE_URL -f scripts/seed-crm-acq-dispo.sql
-- or paste into the Supabase SQL editor.
--
-- Cross-refs:
--   Dev project IDs (already in DB):
--     22222222-2222-2222-2222-222222222001  Caliber Phase II
--     22222222-2222-2222-2222-222222222002  Whisper Greenfield
--     22222222-2222-2222-2222-222222222003  Caliber Speculative 3
-- ───────────────────────────────────────────────────────────────────

-- ── contacts ────────────────────────────────────────────────────
insert into public.contacts (id, contact_type, first_name, last_name, company_name, title, phones, emails, notes) values
  ('aa000001-aaaa-aaaa-aaaa-000000000001', 'Broker',     'Maya',  'Patel',     'CBRE',                  'SVP, Industrial',          '["+1-757-555-0101"]'::jsonb, '["maya.patel@cbre.com"]'::jsonb,             'Norfolk industrial broker — primary leasing rep for Caliber Phase II.'),
  ('aa000001-aaaa-aaaa-aaaa-000000000002', 'Broker',     'Derek', 'Chen',      'JLL Capital Markets',   'Managing Director',        '["+1-704-555-0102"]'::jsonb, '["derek.chen@jll.com"]'::jsonb,              'Acq/dispo broker — covers Southeast industrial.'),
  ('aa000001-aaaa-aaaa-aaaa-000000000003', 'Attorney',   'Ellie', 'Russo',     'Hogan Lovells',         'Partner, Real Estate',     '["+1-202-555-0103"]'::jsonb, '["ellie.russo@hoganlovells.com"]'::jsonb,    'Lead RE counsel — handles PSA + closing for all live deals.'),
  ('aa000001-aaaa-aaaa-aaaa-000000000004', 'GC',         'Marcus','Brennan',   'Clayco',                'VP, Project Delivery',     '["+1-314-555-0104"]'::jsonb, '["marcus.brennan@clayco.com"]'::jsonb,       'GC on Caliber Phase II — weekly OAC meetings.'),
  ('aa000001-aaaa-aaaa-aaaa-000000000005', 'Architect',  'Liang', 'Wu',        'HKS Architects',        'Principal',                '["+1-214-555-0105"]'::jsonb, '["liang.wu@hks.com"]'::jsonb,                 'Architect of record for Caliber Speculative 3.'),
  ('aa000001-aaaa-aaaa-aaaa-000000000006', 'Title Agent','Tessa', 'Okafor',    'First American Title',  'Senior Title Officer',     '["+1-757-555-0106"]'::jsonb, '["tessa.okafor@firstam.com"]'::jsonb,         'Standing title rep for Norfolk-region acquisitions.'),
  ('aa000001-aaaa-aaaa-aaaa-000000000007', 'Owner',      'James', 'Whitfield', 'Whitfield Holdings',    'Owner / Principal',        '["+1-704-555-0107"]'::jsonb, '["james@whitfieldholdings.com"]'::jsonb,      'Seller on the Hampton Blvd target. Direct line — broker is courtesy CC.'),
  ('aa000001-aaaa-aaaa-aaaa-000000000008', 'Consultant', 'Priya', 'Singh',     'Marvin F. Poer & Co.',  'Senior Tax Consultant',    '["+1-214-555-0108"]'::jsonb, '["priya.singh@mfpoer.com"]'::jsonb,           'Property tax appeal consultant — runs all VA appeals.')
on conflict (id) do update set
  contact_type = excluded.contact_type,
  first_name   = excluded.first_name,
  last_name    = excluded.last_name,
  company_name = excluded.company_name,
  title        = excluded.title,
  phones       = excluded.phones,
  emails       = excluded.emails,
  notes        = excluded.notes,
  updated_at   = now();

-- ── acquisition_targets ────────────────────────────────────────
insert into public.acquisition_targets
  (id, target_name, market, address, property_type, status, acres, building_count, total_sf, asking_price, our_offer, earnest_money, closing_costs_estimate, rehab_budget, underwritten_irr, underwritten_eqty_multiple, first_contacted_date, loi_date, psa_date, expected_closing_date, actual_closing_date, diligence_status, risk_level, status_summary, lat, lng, notes)
values
  ('bb000001-bbbb-bbbb-bbbb-000000000001', 'Hampton Blvd Industrial',  'Norfolk',    '1500 Hampton Blvd, Norfolk, VA',     'Industrial', 'LOI',         12.5, 1, 185000,  18500000, 17750000, 250000, 350000, 800000, 0.165, 1.95, '2026-04-12', '2026-05-08', null,         '2026-08-15', null, '{}'::jsonb, 'Medium', 'LOI executed; PSA negotiation in week 2. Roof condition still TBD.', 36.8814, -76.3000, 'Single tenant. 8.5 yrs WALT. Tenant is investment grade.'),
  ('bb000001-bbbb-bbbb-bbbb-000000000002', 'Greenbrier Logistics Park', 'Chesapeake', '200 Greenbrier Pkwy, Chesapeake, VA', 'Industrial', 'Pursuing',    22.0, 2, 320000,  31000000, null,     null,   null,   null,   null,  null, '2026-05-01', null,         null,         null,         null, '{}'::jsonb, 'Medium', 'Off-market sourced via Derek Chen. Owner open at >$30M. Underwriting in progress.',                                          36.7682, -76.1521, 'Two-building cross-dock park. Strong tenancy mix.'),
  ('bb000001-bbbb-bbbb-bbbb-000000000003', 'Greenville Distribution Center', 'Greenville', '800 Woodruff Rd, Greenville, SC', 'Industrial', 'Sourcing', 15.4, 1, 240000, null,    null,     null,   null,   null,   null,  null, '2026-05-18', null,         null,         null,         null, '{}'::jsonb, 'Low',    'Heard about it on CBRE call. Owner unrep, may consider 1031 swap.',                                                          34.8500, -82.3000, 'Adjacent to existing Whisper Greenfield site — possible portfolio play.')
on conflict (id) do update set
  target_name              = excluded.target_name,
  market                   = excluded.market,
  address                  = excluded.address,
  property_type            = excluded.property_type,
  status                   = excluded.status,
  acres                    = excluded.acres,
  building_count           = excluded.building_count,
  total_sf                 = excluded.total_sf,
  asking_price             = excluded.asking_price,
  our_offer                = excluded.our_offer,
  earnest_money            = excluded.earnest_money,
  closing_costs_estimate   = excluded.closing_costs_estimate,
  rehab_budget             = excluded.rehab_budget,
  underwritten_irr         = excluded.underwritten_irr,
  underwritten_eqty_multiple = excluded.underwritten_eqty_multiple,
  first_contacted_date     = excluded.first_contacted_date,
  loi_date                 = excluded.loi_date,
  psa_date                 = excluded.psa_date,
  expected_closing_date    = excluded.expected_closing_date,
  diligence_status         = excluded.diligence_status,
  risk_level               = excluded.risk_level,
  status_summary           = excluded.status_summary,
  lat                      = excluded.lat,
  lng                      = excluded.lng,
  notes                    = excluded.notes,
  updated_at               = now();

-- ── disposition_listings ───────────────────────────────────────
insert into public.disposition_listings
  (id, asset_name, building_id, market, address, property_type, status, total_sf, acres, occupancy_pct, trailing_noi, forward_noi, list_price, list_cap_pct, achieved_price, achieved_cap_pct, net_proceeds, broker_commission_pct, list_date, bids_due_date, loi_executed_date, psa_executed_date, expected_closing_date, actual_closing_date, risk_level, status_summary, lat, lng, notes)
values
  ('cc000001-cccc-cccc-cccc-000000000001', 'Atlanta South Distribution', null, 'Atlanta',       '2400 Industrial Pkwy, Atlanta, GA', 'Industrial', 'Marketing',     410000, 24.0, 1.00, 4200000,  4350000, 78000000, 0.055, null,     null,  null, 0.0125, '2026-05-12', '2026-06-15', null, null, '2026-09-30', null, 'Medium', 'In marketing — JLL running process. CA executed by 22 groups so far.', 33.7490, -84.3880, 'Single-tenant cross-dock. WALT 7.2 yrs. Strong investment-grade tenant.'),
  ('cc000001-cccc-cccc-cccc-000000000002', 'Indianapolis Hub',           null, 'Indianapolis',  '5500 Hub Pkwy, Indianapolis, IN',   'Industrial', 'Under Contract',285000, 18.5, 0.93, 2750000,  2880000, 49500000, 0.058, 49000000, 0.0588, 47200000, 0.0125, '2026-03-04', '2026-04-10', '2026-04-25', '2026-05-10', '2026-06-30', null, 'Low',    'PSA executed. Closing on track for 6/30. Final walk-through 6/15.',     39.7684, -86.1581, 'Two tenants. Renewals locked through 2028.')
on conflict (id) do update set
  asset_name             = excluded.asset_name,
  market                 = excluded.market,
  address                = excluded.address,
  property_type          = excluded.property_type,
  status                 = excluded.status,
  total_sf               = excluded.total_sf,
  acres                  = excluded.acres,
  occupancy_pct          = excluded.occupancy_pct,
  trailing_noi           = excluded.trailing_noi,
  forward_noi            = excluded.forward_noi,
  list_price             = excluded.list_price,
  list_cap_pct           = excluded.list_cap_pct,
  achieved_price         = excluded.achieved_price,
  achieved_cap_pct       = excluded.achieved_cap_pct,
  net_proceeds           = excluded.net_proceeds,
  broker_commission_pct  = excluded.broker_commission_pct,
  list_date              = excluded.list_date,
  bids_due_date          = excluded.bids_due_date,
  loi_executed_date      = excluded.loi_executed_date,
  psa_executed_date      = excluded.psa_executed_date,
  expected_closing_date  = excluded.expected_closing_date,
  risk_level             = excluded.risk_level,
  status_summary         = excluded.status_summary,
  lat                    = excluded.lat,
  lng                    = excluded.lng,
  notes                  = excluded.notes,
  updated_at             = now();

-- ── dev_project_contacts ───────────────────────────────────────
insert into public.dev_project_contacts (id, dev_project_id, contact_id, role_override, is_primary, link_notes) values
  ('dd000001-dddd-dddd-dddd-000000000001', '22222222-2222-2222-2222-222222222001', 'aa000001-aaaa-aaaa-aaaa-000000000004', 'GC',        true,  'GC on Caliber Phase II — weekly OAC.'),
  ('dd000001-dddd-dddd-dddd-000000000002', '22222222-2222-2222-2222-222222222001', 'aa000001-aaaa-aaaa-aaaa-000000000003', 'Attorney',  false, 'Drafts and reviews all change orders.'),
  ('dd000001-dddd-dddd-dddd-000000000003', '22222222-2222-2222-2222-222222222003', 'aa000001-aaaa-aaaa-aaaa-000000000005', 'Architect', true,  'Architect of record — DD package 60% complete.'),
  ('dd000001-dddd-dddd-dddd-000000000004', '22222222-2222-2222-2222-222222222002', 'aa000001-aaaa-aaaa-aaaa-000000000003', 'Attorney',  true,  'Closing counsel for site acquisition.')
on conflict (id) do update set
  role_override = excluded.role_override,
  is_primary    = excluded.is_primary,
  link_notes    = excluded.link_notes,
  updated_at    = now();

-- ── dev_project_notes ──────────────────────────────────────────
insert into public.dev_project_notes (id, dev_project_id, note_type, event_date, content, author, link) values
  ('ee000001-eeee-eeee-eeee-000000000001', '22222222-2222-2222-2222-222222222001', 'Status Update', current_date - 3,  'Foundations + tilt-up complete. Roof crew on site week of 5/27. Weather contingency: +3 days if rain.', 'Marcus Brennan', null),
  ('ee000001-eeee-eeee-eeee-000000000002', '22222222-2222-2222-2222-222222222001', 'Change Order',  current_date - 10, 'CO-014 approved: dock door upgrade from 9x10 to 9x12 on east frontage. +$48k.',                          'Marcus Brennan', null),
  ('ee000001-eeee-eeee-eeee-000000000003', '22222222-2222-2222-2222-222222222002', 'General',       current_date - 7,  'County board pushed entitlement vote to 2026-08. Schedule risk if vote slips further.',                  'PM',             null),
  ('ee000001-eeee-eeee-eeee-000000000004', '22222222-2222-2222-2222-222222222003', 'Status Update', current_date - 2,  'DD set 60% complete. GMP bids out to 4 GCs; due 2026-08-15.',                                              'Liang Wu',       null)
on conflict (id) do update set
  note_type  = excluded.note_type,
  event_date = excluded.event_date,
  content    = excluded.content,
  author     = excluded.author,
  link       = excluded.link,
  updated_at = now();

-- ── acquisition_target_contacts ────────────────────────────────
insert into public.acquisition_target_contacts (id, acquisition_target_id, contact_id, role_override, is_primary, link_notes) values
  ('ff000001-ffff-ffff-ffff-000000000001', 'bb000001-bbbb-bbbb-bbbb-000000000001', 'aa000001-aaaa-aaaa-aaaa-000000000007', 'Owner',      true,  'Seller — direct line.'),
  ('ff000001-ffff-ffff-ffff-000000000002', 'bb000001-bbbb-bbbb-bbbb-000000000001', 'aa000001-aaaa-aaaa-aaaa-000000000001', 'Broker',     false, 'Seller broker (courtesy CC).'),
  ('ff000001-ffff-ffff-ffff-000000000003', 'bb000001-bbbb-bbbb-bbbb-000000000001', 'aa000001-aaaa-aaaa-aaaa-000000000003', 'Attorney',   false, 'PSA negotiation lead.'),
  ('ff000001-ffff-ffff-ffff-000000000004', 'bb000001-bbbb-bbbb-bbbb-000000000001', 'aa000001-aaaa-aaaa-aaaa-000000000006', 'Title Agent',false, 'Title commitment pending.'),
  ('ff000001-ffff-ffff-ffff-000000000005', 'bb000001-bbbb-bbbb-bbbb-000000000002', 'aa000001-aaaa-aaaa-aaaa-000000000002', 'Broker',     true,  'Off-market sourcing broker.'),
  ('ff000001-ffff-ffff-ffff-000000000006', 'bb000001-bbbb-bbbb-bbbb-000000000003', 'aa000001-aaaa-aaaa-aaaa-000000000001', 'Broker',     true,  'Heads-up referral on unrep deal.')
on conflict (id) do update set
  role_override = excluded.role_override,
  is_primary    = excluded.is_primary,
  link_notes    = excluded.link_notes,
  updated_at    = now();

-- ── acquisition_target_notes ───────────────────────────────────
insert into public.acquisition_target_notes (id, acquisition_target_id, note_type, event_date, content, author, link) values
  ('00aaaaaa-0001-0001-0001-000000000001', 'bb000001-bbbb-bbbb-bbbb-000000000001', 'LOI',     current_date - 16, 'LOI countersigned at $17.75M. 60-day diligence, 30-day close.',                                          'Internal',     null),
  ('00aaaaaa-0001-0001-0001-000000000002', 'bb000001-bbbb-bbbb-bbbb-000000000001', 'General', current_date - 8,  'Roof inspector confirmed warranty expired 2024. Estimated 2026 reroof cost $850k — flagged for offer adjustment.', 'Diligence',    null),
  ('00aaaaaa-0001-0001-0001-000000000003', 'bb000001-bbbb-bbbb-bbbb-000000000002', 'General', current_date - 6,  'Owner waved off institutional brokers. Wants direct conversation. Lunch scheduled 5/30.',                'Internal',     null)
on conflict (id) do update set
  note_type  = excluded.note_type,
  event_date = excluded.event_date,
  content    = excluded.content,
  author     = excluded.author,
  link       = excluded.link,
  updated_at = now();

-- ── disposition_listing_contacts ───────────────────────────────
insert into public.disposition_listing_contacts (id, disposition_listing_id, contact_id, role_override, is_primary, link_notes) values
  ('11bbbbbb-0001-0001-0001-000000000001', 'cc000001-cccc-cccc-cccc-000000000001', 'aa000001-aaaa-aaaa-aaaa-000000000002', 'Broker',   true,  'JLL is sell-side broker.'),
  ('11bbbbbb-0001-0001-0001-000000000002', 'cc000001-cccc-cccc-cccc-000000000001', 'aa000001-aaaa-aaaa-aaaa-000000000003', 'Attorney', false, 'Sell-side counsel.'),
  ('11bbbbbb-0001-0001-0001-000000000003', 'cc000001-cccc-cccc-cccc-000000000002', 'aa000001-aaaa-aaaa-aaaa-000000000002', 'Broker',   true,  'JLL sell-side; tracking to close 6/30.'),
  ('11bbbbbb-0001-0001-0001-000000000004', 'cc000001-cccc-cccc-cccc-000000000002', 'aa000001-aaaa-aaaa-aaaa-000000000003', 'Attorney', false, 'Counsel on PSA.')
on conflict (id) do update set
  role_override = excluded.role_override,
  is_primary    = excluded.is_primary,
  link_notes    = excluded.link_notes,
  updated_at    = now();

-- ── disposition_listing_notes ──────────────────────────────────
insert into public.disposition_listing_notes (id, disposition_listing_id, note_type, event_date, content, author, link) values
  ('22cccccc-0001-0001-0001-000000000001', 'cc000001-cccc-cccc-cccc-000000000001', 'General', current_date - 5,  '22 CAs returned. Top-end indications hovering around $76–79M. JLL recommends bid date 6/15.', 'Derek Chen', null),
  ('22cccccc-0001-0001-0001-000000000002', 'cc000001-cccc-cccc-cccc-000000000002', 'PSA',     current_date - 12, 'PSA executed at $49.0M. EM funded. Closing 6/30.',                                            'Internal',   null)
on conflict (id) do update set
  note_type  = excluded.note_type,
  event_date = excluded.event_date,
  content    = excluded.content,
  author     = excluded.author,
  link       = excluded.link,
  updated_at = now();
