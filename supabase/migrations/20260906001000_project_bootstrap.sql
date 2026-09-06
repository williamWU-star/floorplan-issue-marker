-- Allow the authenticated owner to create a project and its first floors atomically.
create or replace function public.create_project_with_owner(
  p_name text,
  p_address text default null,
  p_floor_labels text[] default array['1F','2F','3F']
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_user_id uuid := auth.uid();
  v_label text;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  insert into public.profiles (id)
  values (v_user_id)
  on conflict (id) do nothing;

  insert into public.projects (name, address, created_by)
  values (coalesce(nullif(trim(p_name), ''), 'SITE / TRACE 專案'), p_address, v_user_id)
  returning id into v_project_id;

  insert into public.project_members (project_id, user_id, role)
  values (v_project_id, v_user_id, 'owner');

  foreach v_label in array p_floor_labels loop
    insert into public.floors (project_id, label, sort_order)
    values (v_project_id, v_label, coalesce(array_position(p_floor_labels, v_label), 1));
  end loop;

  return v_project_id;
end;
$$;

grant execute on function public.create_project_with_owner(text, text, text[]) to authenticated;
