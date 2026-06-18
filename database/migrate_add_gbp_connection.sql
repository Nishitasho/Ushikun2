-- GBP OAuth accounts and per-store location links.
-- Run this after the base schema when adding real Google Business Profile integration.

create table if not exists google_accounts (
  id uuid primary key default gen_random_uuid(),
  google_account_name text,
  account_name text,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  scopes text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (google_account_name)
);

create table if not exists store_gbp_locations (
  id uuid primary key default gen_random_uuid(),
  google_account_id uuid references google_accounts(id) on delete cascade,
  store_id uuid references stores(id) on delete set null,
  google_account_name text not null,
  account_name text,
  location_name text not null,
  title text not null,
  store_code text,
  place_id text,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (location_name)
);

create unique index if not exists gbp_posts_proposal_id_key
on gbp_posts (proposal_id);

alter table google_accounts enable row level security;
alter table store_gbp_locations enable row level security;

drop policy if exists "google_accounts_authenticated_access" on google_accounts;
create policy "google_accounts_authenticated_access" on google_accounts
for all to authenticated using (true) with check (true);

drop policy if exists "store_gbp_locations_member_access" on store_gbp_locations;
create policy "store_gbp_locations_member_access" on store_gbp_locations
for all using (store_id is null or can_access_store(store_id))
with check (store_id is null or can_access_store(store_id));
