create table if not exists sales_comps (
  id uuid primary key default gen_random_uuid(),
  property_name text,
  building_address text,
  market text,
  property_type text,
  building_type text,
  sale_date text,
  sale_price numeric,
  price_psf numeric,
  cap_rate numeric,
  noi numeric,
  building_sf numeric,
  land_acres numeric,
  year_built integer,
  occupancy_pct numeric,
  buyer text,
  seller text,
  source text,
  source_url text,
  confidence text not null default 'Medium' check (confidence in ('High','Medium','Low')),
  confidential boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table sales_comps enable row level security;

create policy "Authenticated users can read sales_comps"
  on sales_comps for select to authenticated using (true);

create policy "Authenticated users can insert sales_comps"
  on sales_comps for insert to authenticated with check (true);

create policy "Authenticated users can update sales_comps"
  on sales_comps for update to authenticated using (true) with check (true);

create policy "Authenticated users can delete sales_comps"
  on sales_comps for delete to authenticated using (true);

alter publication supabase_realtime add table sales_comps;
