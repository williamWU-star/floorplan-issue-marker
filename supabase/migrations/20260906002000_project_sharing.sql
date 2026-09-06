-- Create/recreate an unguessable public share token for the current owner/editor.
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
  set share_enabled = false, share_revoked_at = now(), updated_at = now()
  where id = p_project_id and public.project_role(id) in ('owner', 'editor');
$$;

grant execute on function public.revoke_project_share_token(uuid) to authenticated;
