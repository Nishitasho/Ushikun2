-- Google Maps参考順位のバッチ・結果保存テーブル
create table if not exists ranking_batches (
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

create table if not exists ranking_results (
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

create index if not exists ranking_results_store_keyword_checked_idx
on ranking_results (store_id, keyword, checked_at desc);

create table if not exists store_metric_snapshots (
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

create index if not exists store_metric_snapshots_store_checked_idx
on store_metric_snapshots (store_id, checked_at desc);

alter table store_metric_snapshots
drop constraint if exists store_metric_snapshots_source_check;
alter table store_metric_snapshots
add constraint store_metric_snapshots_source_check
check (source in ('google_maps_dom', 'gemini_vision', 'none'));

create table if not exists marketing_reports (
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

alter table ranking_batches enable row level security;
alter table ranking_results enable row level security;
alter table store_metric_snapshots enable row level security;
alter table marketing_reports enable row level security;

drop policy if exists "ranking_batches_member_access" on ranking_batches;
create policy "ranking_batches_member_access" on ranking_batches
for all using (can_access_store(store_id)) with check (can_access_store(store_id));

drop policy if exists "ranking_results_member_access" on ranking_results;
create policy "ranking_results_member_access" on ranking_results
for all using (can_access_store(store_id)) with check (can_access_store(store_id));

drop policy if exists "store_metric_snapshots_member_access" on store_metric_snapshots;
create policy "store_metric_snapshots_member_access" on store_metric_snapshots
for all using (can_access_store(store_id)) with check (can_access_store(store_id));

drop policy if exists "marketing_reports_member_access" on marketing_reports;
create policy "marketing_reports_member_access" on marketing_reports
for all using (can_access_store(store_id)) with check (can_access_store(store_id));
