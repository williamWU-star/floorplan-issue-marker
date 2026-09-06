-- Temporary single-user mode:
-- allow the site owner to edit/upload without email login.
-- Re-tighten these policies and restore auth-bound created_by/uploaded_by later.

alter table public.projects alter column created_by drop not null;
alter table public.floorplan_assets alter column created_by drop not null;
alter table public.issues alter column created_by drop not null;
alter table public.issue_photos alter column uploaded_by drop not null;

create or replace function public.get_or_create_public_project()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
begin
  select id into v_project_id
  from public.projects
  order by created_at asc
  limit 1;

  if v_project_id is null then
    insert into public.projects (name, address, created_by)
    values ('SITE / TRACE 房屋檢查', null, null)
    returning id into v_project_id;

    insert into public.floors (project_id, label, sort_order)
    values
      (v_project_id, '1F', 1),
      (v_project_id, '2F', 2),
      (v_project_id, '3F', 3);
  end if;

  return v_project_id;
end;
$$;

grant execute on function public.get_or_create_public_project() to anon, authenticated;

-- Anonymous visitors can use the single project while this temporary mode is active.
drop policy if exists projects_select_member on public.projects;
create policy projects_select_member on public.projects
for select to anon, authenticated
using (true);

drop policy if exists floors_select_member on public.floors;
create policy floors_select_member on public.floors
for select to anon, authenticated
using (true);

drop policy if exists issues_select_member on public.issues;
create policy issues_select_member on public.issues
for select to anon, authenticated
using (true);

drop policy if exists issues_insert_editor on public.issues;
create policy issues_insert_editor on public.issues
for insert to anon, authenticated
with check (true);

drop policy if exists issues_update_editor on public.issues;
create policy issues_update_editor on public.issues
for update to anon, authenticated
using (true)
with check (true);

drop policy if exists issues_delete_editor on public.issues;
create policy issues_delete_editor on public.issues
for delete to anon, authenticated
using (true);

drop policy if exists issue_photos_select_member on public.issue_photos;
create policy issue_photos_select_member on public.issue_photos
for select to anon, authenticated
using (true);

drop policy if exists issue_photos_insert_editor on public.issue_photos;
create policy issue_photos_insert_editor on public.issue_photos
for insert to anon, authenticated
with check (true);

drop policy if exists issue_photos_delete_editor on public.issue_photos;
create policy issue_photos_delete_editor on public.issue_photos
for delete to anon, authenticated
using (true);

-- Temporary anonymous storage access for the issue photo bucket.
drop policy if exists issue_photos_storage_select on storage.objects;
create policy issue_photos_storage_select on storage.objects
for select to anon, authenticated
using (bucket_id = 'issue-photos');

drop policy if exists issue_photos_storage_insert on storage.objects;
create policy issue_photos_storage_insert on storage.objects
for insert to anon, authenticated
with check (bucket_id = 'issue-photos');

drop policy if exists issue_photos_storage_delete on storage.objects;
create policy issue_photos_storage_delete on storage.objects
for delete to anon, authenticated
using (bucket_id = 'issue-photos');
