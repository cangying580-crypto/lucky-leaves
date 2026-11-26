-- Lucky Leaves 初始化：表结构 + 行级安全（RLS）
-- 在 Supabase SQL Editor 中执行本文件。

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null default '旅行者',
  birth_year int not null check (birth_year between 1920 and 2100),
  created_at timestamptz not null default now()
);

create table if not exists public.forests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.trees (
  id uuid primary key default gen_random_uuid(),
  forest_id uuid not null references public.forests (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  category text not null default 'growth',
  x double precision not null,
  y double precision not null,
  scale double precision not null default 1,
  seed text not null,
  planted_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  note text not null default '',
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_forests_user on public.forests (user_id);
create index if not exists idx_trees_forest on public.trees (forest_id);
create index if not exists idx_events_tree on public.events (tree_id);
create index if not exists idx_events_user on public.events (user_id);

-- 注册时自动创建 profile（nickname / birth_year 来自 signUp 的 options.data）
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nickname, birth_year)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nickname', '旅行者'),
    coalesce((new.raw_user_meta_data ->> 'birth_year')::int, 2000)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS：所有数据仅本人可见可写
alter table public.profiles enable row level security;
alter table public.forests enable row level security;
alter table public.trees enable row level security;
alter table public.events enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

create policy "forests_all_own" on public.forests for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "trees_all_own" on public.trees for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "events_all_own" on public.events for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);