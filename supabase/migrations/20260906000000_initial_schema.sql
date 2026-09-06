-- SITE / TRACE — initial Supabase schema
-- Run this migration in Supabase SQL Editor or through Supabase CLI migrations.
-- The browser must only use the publishable/anon key. Never expose service_role.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'editor', 'viewer')),
  joined_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.floors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (project_id, label)
);

create table if not exists public.floorplan_assets (
  id uuid primary key default gen_random_uuid(),
  floor_id uuid not null references public.floors(id) on delete cascade,
  storage_path text not null unique,
  width integer,
  height integer,
  version integer not null default 1,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.issues (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  floor_id uuid not null references public.floors(id) on delete restrict,
  floorplan_asset_id uuid references public.floorplan_assets(id) on delete set null,
  code text not null,
  title text not null,
  location text,
  x numeric(8,6) not null check (x >= 0 and x <= 1),
  y numeric(8,6) not null check (y >= 0 and y <= 1),
  severity text not null default 'medium' check (severity in ('high', 'medium', 'low')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'done')),
  description text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, code)
);

create table if not exists public.issue_photos (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  storage_path text not null unique,
  caption text,
  taken_at timestamptz,
  width integer,
  height integer,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.issue_events (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  event_type text not null check (event_type in ('created', 'updated', 'status_changed', 'photo_added', 'photo_removed', 'deleted')),
  before_json jsonb,
  after_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists project_members_user_id_idx on public.project_members(user_id);
create index if not exists floors_project_id_idx on public.floors(project_id);
create index if not exists issues_project_id_idx on public.issues(project_id);
create index if not exists issues_floor_id_idx on public.issues(floor_id);
create index if not exists issue_photos_issue_id_idx on public.issue_photos(issue_id);
create index if not exists issue_events_issue_id_created_at_idx on public.issue_events(issue_id, created_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.project_role(p_project_id uuid)
returns text
language sql
stable
security definer set search_path = public
as $$
  select role from public.project_members
  where project_id = p_project_id and user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select public.project_role(p_project_id) is not null;
$$;

create or replace function public.safe_uuid(value text)
returns uuid
language plpgsql
immutable
as $$
begin
  return value::uuid;
exception when others then
  return null;
end;
$$;

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.floors enable row level security;
alter table public.floorplan_assets enable row level security;
alter table public.issues enable row level security;
alter table public.issue_photos enable row level security;
alter table public.issue_events enable row level security;

drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles for select to authenticated using (id = auth.uid());

drop policy if exists projects_select_member on public.projects;
create policy projects_select_member on public.projects for select to authenticated using (public.is_project_member(id));
drop policy if exists projects_insert_self on public.projects;
create policy projects_insert_self on public.projects for insert to authenticated with check (created_by = auth.uid());
drop policy if exists projects_update_owner on public.projects;
create policy projects_update_owner on public.projects for update to authenticated using (public.project_role(id) = 'owner') with check (public.project_role(id) = 'owner');
drop policy if exists projects_delete_owner on public.projects;
create policy projects_delete_owner on public.projects for delete to authenticated using (public.project_role(id) = 'owner');

drop policy if exists project_members_select_member on public.project_members;
create policy project_members_select_member on public.project_members for select to authenticated using (public.is_project_member(project_id));
drop policy if exists project_members_insert_owner on public.project_members;
create policy project_members_insert_owner on public.project_members for insert to authenticated with check (public.project_role(project_id) = 'owner');
drop policy if exists project_members_update_owner on public.project_members;
create policy project_members_update_owner on public.project_members for update to authenticated using (public.project_role(project_id) = 'owner') with check (public.project_role(project_id) = 'owner');
drop policy if exists project_members_delete_owner on public.project_members;
create policy project_members_delete_owner on public.project_members for delete to authenticated using (public.project_role(project_id) = 'owner');

-- The creator must add the owner membership in the same transaction as project creation.
-- A server-side RPC or Edge Function should perform that transaction in production.

drop policy if exists floors_select_member on public.floors;
create policy floors_select_member on public.floors for select to authenticated using (public.is_project_member(project_id));
drop policy if exists floors_write_editor on public.floors;
create policy floors_write_editor on public.floors for insert to authenticated with check (public.project_role(project_id) in ('owner', 'editor'));
drop policy if exists floors_update_editor on public.floors;
create policy floors_update_editor on public.floors for update to authenticated using (public.project_role(project_id) in ('owner', 'editor')) with check (public.project_role(project_id) in ('owner', 'editor'));
drop policy if exists floors_delete_owner on public.floors;
create policy floors_delete_owner on public.floors for delete to authenticated using (public.project_role(project_id) = 'owner');

drop policy if exists floorplan_assets_select_member on public.floorplan_assets;
create policy floorplan_assets_select_member on public.floorplan_assets for select to authenticated using (exists (select 1 from public.floors f where f.id = floor_id and public.is_project_member(f.project_id)));
drop policy if exists floorplan_assets_insert_editor on public.floorplan_assets;
create policy floorplan_assets_insert_editor on public.floorplan_assets for insert to authenticated with check (exists (select 1 from public.floors f where f.id = floor_id and public.project_role(f.project_id) in ('owner', 'editor')));
drop policy if exists floorplan_assets_delete_owner on public.floorplan_assets;
create policy floorplan_assets_delete_owner on public.floorplan_assets for delete to authenticated using (exists (select 1 from public.floors f where f.id = floor_id and public.project_role(f.project_id) = 'owner'));

drop policy if exists issues_select_member on public.issues;
create policy issues_select_member on public.issues for select to authenticated using (public.is_project_member(project_id));
drop policy if exists issues_insert_editor on public.issues;
create policy issues_insert_editor on public.issues for insert to authenticated with check (created_by = auth.uid() and public.project_role(project_id) in ('owner', 'editor'));
drop policy if exists issues_update_editor on public.issues;
create policy issues_update_editor on public.issues for update to authenticated using (public.project_role(project_id) in ('owner', 'editor')) with check (public.project_role(project_id) in ('owner', 'editor'));
drop policy if exists issues_delete_editor on public.issues;
create policy issues_delete_editor on public.issues for delete to authenticated using (public.project_role(project_id) in ('owner', 'editor'));

drop policy if exists issue_photos_select_member on public.issue_photos;
create policy issue_photos_select_member on public.issue_photos for select to authenticated using (exists (select 1 from public.issues i where i.id = issue_id and public.is_project_member(i.project_id)));
drop policy if exists issue_photos_insert_editor on public.issue_photos;
create policy issue_photos_insert_editor on public.issue_photos for insert to authenticated with check (uploaded_by = auth.uid() and exists (select 1 from public.issues i where i.id = issue_id and public.project_role(i.project_id) in ('owner', 'editor')));
drop policy if exists issue_photos_delete_editor on public.issue_photos;
create policy issue_photos_delete_editor on public.issue_photos for delete to authenticated using (exists (select 1 from public.issues i where i.id = issue_id and public.project_role(i.project_id) in ('owner', 'editor')));

drop policy if exists issue_events_select_member on public.issue_events;
create policy issue_events_select_member on public.issue_events for select to authenticated using (exists (select 1 from public.issues i where i.id = issue_id and public.is_project_member(i.project_id)));
drop policy if exists issue_events_insert_editor on public.issue_events;
create policy issue_events_insert_editor on public.issue_events for insert to authenticated with check (actor_id = auth.uid() and exists (select 1 from public.issues i where i.id = issue_id and public.project_role(i.project_id) in ('owner', 'editor')));

insert into storage.buckets (id, name, public)
values ('issue-photos', 'issue-photos', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists issue_photos_storage_select on storage.objects;
create policy issue_photos_storage_select on storage.objects for select to authenticated
using (
  bucket_id = 'issue-photos'
  and public.is_project_member(public.safe_uuid((storage.foldername(name))[2]))
);

drop policy if exists issue_photos_storage_insert on storage.objects;
create policy issue_photos_storage_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'issue-photos'
  and public.project_role(public.safe_uuid((storage.foldername(name))[2])) in ('owner', 'editor')
);

drop policy if exists issue_photos_storage_delete on storage.objects;
create policy issue_photos_storage_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'issue-photos'
  and public.project_role(public.safe_uuid((storage.foldername(name))[2])) in ('owner', 'editor')
);
