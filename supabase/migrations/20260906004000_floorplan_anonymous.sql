-- Temporarily allow anonymous access to floorplan assets so the site owner
-- can upload and view floor plans without email login.
-- This mirrors the anonymous_edit_mode pattern already applied to
-- issues / issue_photos and the issue-photos storage bucket.

-- Table-level policies for the floorplan_assets table
drop policy if exists floorplan_assets_select_member on public.floorplan_assets;
create policy floorplan_assets_select_member on public.floorplan_assets
for select to anon, authenticated
using (true);

drop policy if exists floorplan_assets_insert_editor on public.floorplan_assets;
create policy floorplan_assets_insert_editor on public.floorplan_assets
for insert to anon, authenticated
with check (true);

drop policy if exists floorplan_assets_update_editor on public.floorplan_assets;
create policy floorplan_assets_update_editor on public.floorplan_assets
for update to anon, authenticated
using (true)
with check (true);

drop policy if exists floorplan_assets_delete_owner on public.floorplan_assets;
create policy floorplan_assets_delete_owner on public.floorplan_assets
for delete to anon, authenticated
using (true);

-- Storage-level policies for the floorplan-assets bucket
drop policy if exists floorplan_assets_storage_select on storage.objects;
create policy floorplan_assets_storage_select on storage.objects
for select to anon, authenticated
using (bucket_id = 'floorplan-assets');

drop policy if exists floorplan_assets_storage_insert on storage.objects;
create policy floorplan_assets_storage_insert on storage.objects
for insert to anon, authenticated
with check (bucket_id = 'floorplan-assets');

drop policy if exists floorplan_assets_storage_delete on storage.objects;
create policy floorplan_assets_storage_delete on storage.objects
for delete to anon, authenticated
using (bucket_id = 'floorplan-assets');
