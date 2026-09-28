-- Copilot foundation. Extends the inbox schema with the relational fields the
-- shared AgentContext needs. Does not create agent_runs, agent_actions,
-- agent_approvals, or sales-knowledge tables.

alter table public.businesses
  add column description text,
  add column industry text,
  add column email text,
  add column phone text,
  add column website text,
  add column logo_url text,
  add column country_code text not null default 'AO',
  add column timezone text not null default 'Africa/Luanda',
  add column locale text not null default 'pt-AO',
  add column currency text not null default 'AOA',
  add column address jsonb,
  add column business_hours jsonb,
  add column metadata jsonb,
  add column updated_at timestamptz not null default now();

alter table public.businesses
  add constraint businesses_address_is_object
    check (address is null or jsonb_typeof(address) = 'object'),
  add constraint businesses_business_hours_is_object
    check (business_hours is null or jsonb_typeof(business_hours) = 'object'),
  add constraint businesses_metadata_is_object
    check (metadata is null or jsonb_typeof(metadata) = 'object');

create table public.customers (
  id uuid primary key default extensions.gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade
    default public.current_business_id(),
  name text not null,
  email text,
  phone text,
  language text,
  timezone text,
  status text not null default 'lead'
    check (status in ('lead', 'customer', 'inactive')),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_business_idx on public.customers (business_id);
create unique index customers_business_email_idx
  on public.customers (business_id, email)
  where email is not null;

create table public.products (
  id uuid primary key default extensions.gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade
    default public.current_business_id(),
  sku text not null,
  name text not null,
  description text,
  category text,
  subcategory text,
  price numeric(18, 2) not null,
  currency text not null,
  stock integer not null check (stock >= 0),
  images jsonb not null default '[]'::jsonb
    check (jsonb_typeof(images) = 'array'),
  attributes jsonb not null default '{}'::jsonb
    check (jsonb_typeof(attributes) = 'object'),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index products_business_idx on public.products (business_id);
create unique index products_business_sku_active_idx
  on public.products (business_id, sku)
  where deleted_at is null;

alter table public.customers enable row level security;
alter table public.products enable row level security;

create policy customers_tenant on public.customers
  for all to authenticated
  using (business_id = (select public.current_business_id()))
  with check (business_id = (select public.current_business_id()));

create policy products_tenant on public.products
  for all to authenticated
  using (business_id = (select public.current_business_id()))
  with check (business_id = (select public.current_business_id()));

grant select, insert, update, delete on table
  public.customers,
  public.products
to authenticated;
