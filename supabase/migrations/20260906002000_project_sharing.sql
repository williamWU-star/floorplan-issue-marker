-- Project sharing RPCs.
-- NOTE: share_* columns are created by the initial schema migration.
-- This migration is intentionally idempotent for projects created before that migration was rerun.

alter table public.projects
  add column if not exists share_enabled boolean not null default false;

alter table public.projects
  add column if not exists share_token_hash text;

alter table public.projects
  add column if not exists share_created_at timestamptz;

alter table public.projects
  add column if not exists share_revoked_at timestamptz;

create unique index if not exists projects_share_token_hash_unique_idx
  on public.projects(share_token_hash)
  where share_token_hash is not null;

create index if not exists projects_share_token_hash_idx
  on public.projects(share_token_hash)
  where share_enabled = true;

create or replace function public.create_project_share_token(p_project_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  if public.project_role(p_project_id) not in ('owner', 'editor') then
    raise exception 'project editor access required';
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');
  update public.projects
  set share_enabled = true,
      share_token_hash = encode(digest(v_token, 'sha256'), 'hex'),
      share_created_at = now(),
      share_revoked_at = null,
      updated_at = now()
  where id = p_project_id;

  return v_token;
end;
$$;

grant execute on function public.create_project_share_token(uuid) to authenticated;

create or replace function public.revoke_project_share_token(p_project_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.projects
  set share_enabled = false,
      share_revoked_at = now(),
      updated_at = now()
  where id = p_project_id
    and public.project_role(id) in ('owner', 'editor');
$$;

grant execute on function public.revoke_project_share_token(uuid) to authenticated;
