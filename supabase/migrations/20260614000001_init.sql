-- 案件テーブル
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_name text not null default '',
  location text not null default '',
  status text not null default '受注前' check (status in ('受注前', '進行中', '完了', '中止')),
  start_date date,
  end_date date,
  contract_amount bigint,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 日報テーブル
create table if not exists daily_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  report_date date not null,
  weather text,
  workers_count integer,
  work_content text not null default '',
  progress_note text,
  issues text,
  created_by text,
  created_at timestamptz not null default now()
);

-- 写真テーブル
create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  daily_report_id uuid references daily_reports(id) on delete set null,
  file_path text not null,
  file_name text not null,
  caption text,
  taken_at date,
  created_at timestamptz not null default now()
);

-- updated_at 自動更新
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_updated_at
  before update on projects
  for each row execute function update_updated_at();

-- RLS (Row Level Security) - 全員読み書き可 (認証後に要調整)
alter table projects enable row level security;
alter table daily_reports enable row level security;
alter table photos enable row level security;

create policy "allow all" on projects for all using (true) with check (true);
create policy "allow all" on daily_reports for all using (true) with check (true);
create policy "allow all" on photos for all using (true) with check (true);
