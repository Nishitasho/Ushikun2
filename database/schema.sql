-- KUROKO AI MVP Supabase schema draft
-- Initial product uses local storage for the demo app, but these tables map to the intended production model.

create type proposal_status as enum ('draft', 'approved', 'rejected', 'posted');
create type proposal_category as enum (
  'google_business_profile_post',
  'note_article',
  'line_message',
  'review_reply',
  'faq_aeo_article',
  'store_improvement',
  'gbp_review_reply',
  'gbp_post'
);
create type proposal_platform as enum ('google_business_profile', 'note', 'line', 'website', 'internal');
create type automation_mode as enum ('approval', 'semi_auto', 'full_auto');
create type reply_status as enum (
  'unprocessed',
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'replied',
  'failed',
  'skipped'
);
create type gbp_post_status as enum (
  'draft',
  'pending_approval',
  'approved',
  'scheduled',
  'posted',
  'rejected',
  'failed'
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (organization_id, profile_id)
);

create table stores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  industry text not null,
  address text,
  phone_number text,
  business_hours jsonb,
  regular_holidays text,
  services text,
  strengths text,
  target_customers text,
  competitors text[] not null default '{}',
  post_tone text,
  ng_expressions text[] not null default '{}',
  post_automation_mode automation_mode not null default 'approval',
  review_automation_mode automation_mode not null default 'approval',
  post_frequency_per_month int not null default 20,
  gbp_account_name text,
  gbp_location_name text,
  gbp_place_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table store_keywords (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  keyword text not null,
  priority int not null default 1 check (priority between 1 and 20),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, keyword)
);

create table ai_proposals (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  title text not null,
  category proposal_category not null,
  body text not null,
  platform proposal_platform not null,
  goal text,
  target_keywords text[] not null default '{}',
  status proposal_status not null default 'draft',
  source_type text not null default 'ai',
  risk_notes text[] not null default '{}',
  prompt_template_id uuid,
  prompt_version int,
  ai_model text,
  generation_input jsonb,
  generation_output jsonb,
  generation_error text,
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  rejected_reason text,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table proposal_revisions (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references ai_proposals(id) on delete cascade,
  edited_by uuid references profiles(id),
  title text not null,
  body text not null,
  goal text,
  target_keywords text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table proposal_status_events (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references ai_proposals(id) on delete cascade,
  from_status proposal_status,
  to_status proposal_status not null,
  actor_id uuid references profiles(id),
  reason text,
  created_at timestamptz not null default now()
);

create table review_reply_templates (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  industry text,
  template_name text not null,
  template_body text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table google_reviews (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  google_review_id text not null,
  reviewer_name text,
  rating int not null check (rating between 1 and 5),
  comment text,
  review_created_at timestamptz not null,
  reply_status reply_status not null default 'unprocessed',
  reply_body text,
  replied_at timestamptz,
  risk_flags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, google_review_id)
);

create table gbp_posts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  proposal_id uuid references ai_proposals(id) on delete set null,
  title text not null,
  body text not null,
  category text not null,
  target_keywords text[] not null default '{}',
  image_url text,
  google_post_id text,
  status gbp_post_status not null default 'draft',
  scheduled_at timestamptz,
  posted_at timestamptz,
  risk_flags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ranking_batches (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  provider text not null default 'playwright' check (provider in ('playwright', 'serpapi', 'dataforseo')),
  status text not null default 'running' check (status in ('running', 'succeeded', 'partial', 'failed')),
  requested_count int not null default 0,
  succeeded_count int not null default 0,
  failed_count int not null default 0,
  retry_of uuid references ranking_batches(id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table ranking_results (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references ranking_batches(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  keyword text not null,
  rank_position int check (rank_position is null or rank_position > 0),
  matched_store_name text,
  status text not null check (status in ('succeeded', 'not_found', 'failed')),
  detection_source text not null default 'none' check (detection_source in ('dom', 'gemini_vision', 'none')),
  confidence numeric(4, 3) not null default 0 check (confidence between 0 and 1),
  result_count int not null default 0,
  attempt_count int not null default 1,
  screenshot_path text,
  error text,
  is_reference boolean not null default true,
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index ranking_results_store_keyword_checked_idx
on ranking_results (store_id, keyword, checked_at desc);

create table store_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references ranking_batches(id) on delete set null,
  store_id uuid not null references stores(id) on delete cascade,
  rating numeric(2, 1) check (rating is null or rating between 0 and 5),
  review_count int check (review_count is null or review_count >= 0),
  status text not null check (status in ('succeeded', 'failed')),
  source text not null default 'none' check (source in ('google_maps_dom', 'gemini_vision', 'none')),
  error text,
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index store_metric_snapshots_store_checked_idx
on store_metric_snapshots (store_id, checked_at desc);

create table marketing_reports (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  summary text not null,
  ranking_summary text not null,
  review_summary text not null,
  recommended_keywords text[] not null default '{}',
  actions jsonb not null default '[]'::jsonb,
  ai_provider text,
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table profiles enable row level security;
alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table stores enable row level security;
alter table store_keywords enable row level security;
alter table ai_proposals enable row level security;
alter table proposal_revisions enable row level security;
alter table proposal_status_events enable row level security;
alter table review_reply_templates enable row level security;
alter table google_reviews enable row level security;
alter table gbp_posts enable row level security;
alter table ranking_batches enable row level security;
alter table ranking_results enable row level security;
alter table store_metric_snapshots enable row level security;
alter table marketing_reports enable row level security;

create or replace function is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from organization_members
    where organization_id = target_organization_id
      and profile_id = auth.uid()
  );
$$;

create or replace function can_access_store(target_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from stores
    where id = target_store_id
      and is_organization_member(organization_id)
  );
$$;

create or replace function is_organization_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from organization_members
    where organization_id = target_organization_id
      and profile_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

create policy "profiles_select_own" on profiles
for select using (id = auth.uid());
create policy "profiles_update_own" on profiles
for update using (id = auth.uid()) with check (id = auth.uid());

create policy "organizations_insert_authenticated" on organizations
for insert to authenticated with check (true);
create policy "organizations_member_access" on organizations
for all using (is_organization_member(id)) with check (is_organization_member(id));

create policy "organization_members_select_member" on organization_members
for select using (is_organization_member(organization_id));
create policy "organization_members_insert_self" on organization_members
for insert to authenticated with check (profile_id = auth.uid());
create policy "organization_members_manage_admin" on organization_members
for all using (is_organization_admin(organization_id))
with check (is_organization_admin(organization_id));

create policy "stores_member_access" on stores
for all using (is_organization_member(organization_id))
with check (is_organization_member(organization_id));

create policy "store_keywords_member_access" on store_keywords
for all using (can_access_store(store_id)) with check (can_access_store(store_id));
create policy "ai_proposals_member_access" on ai_proposals
for all using (can_access_store(store_id)) with check (can_access_store(store_id));
create policy "review_templates_member_access" on review_reply_templates
for all using (can_access_store(store_id)) with check (can_access_store(store_id));
create policy "google_reviews_member_access" on google_reviews
for all using (can_access_store(store_id)) with check (can_access_store(store_id));
create policy "gbp_posts_member_access" on gbp_posts
for all using (can_access_store(store_id)) with check (can_access_store(store_id));
create policy "ranking_batches_member_access" on ranking_batches
for all using (can_access_store(store_id)) with check (can_access_store(store_id));
create policy "ranking_results_member_access" on ranking_results
for all using (can_access_store(store_id)) with check (can_access_store(store_id));
create policy "store_metric_snapshots_member_access" on store_metric_snapshots
for all using (can_access_store(store_id)) with check (can_access_store(store_id));
create policy "marketing_reports_member_access" on marketing_reports
for all using (can_access_store(store_id)) with check (can_access_store(store_id));

create policy "proposal_revisions_member_access" on proposal_revisions
for all using (
  exists (
    select 1 from ai_proposals
    where ai_proposals.id = proposal_revisions.proposal_id
      and can_access_store(ai_proposals.store_id)
  )
);
create policy "proposal_events_member_access" on proposal_status_events
for all using (
  exists (
    select 1 from ai_proposals
    where ai_proposals.id = proposal_status_events.proposal_id
      and can_access_store(ai_proposals.store_id)
  )
);
