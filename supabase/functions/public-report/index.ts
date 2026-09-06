import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim();
  if (!token || token.length < 32) {
    return json({ error: "Invalid share link" }, 400);
  }

  const tokenHash = await sha256Hex(token);
  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("id, name, address, created_at, updated_at")
    .eq("share_token_hash", tokenHash)
    .eq("share_enabled", true)
    .is("share_revoked_at", null)
    .maybeSingle();

  if (projectError || !project) {
    return json({ error: "This share link is invalid or has been revoked" }, 404);
  }

  const [floorsResult, issuesResult] = await Promise.all([
    admin
      .from("floors")
      .select("id, label, sort_order, floorplan_assets(id, storage_path, width, height, version)")
      .eq("project_id", project.id)
      .order("sort_order"),
    admin
      .from("issues")
      .select("id, floor_id, floorplan_asset_id, code, title, location, x, y, severity, status, description, created_at, updated_at, issue_photos(id, storage_path, caption, taken_at, width, height, created_at)")
      .eq("project_id", project.id)
      .order("code"),
  ]);

  if (floorsResult.error || issuesResult.error) {
    return json({ error: "Unable to load this report" }, 500);
  }

  const issues = await Promise.all(
    (issuesResult.data ?? []).map(async (issue) => {
      const photos = await Promise.all(
        (issue.issue_photos ?? []).map(async (photo) => {
          const { data } = await admin.storage
            .from("issue-photos")
            .createSignedUrl(photo.storage_path, 60 * 60);
          return {
            id: photo.id,
            caption: photo.caption,
            taken_at: photo.taken_at,
            width: photo.width,
            height: photo.height,
            created_at: photo.created_at,
            url: data?.signedUrl ?? null,
          };
        }),
      );

      return { ...issue, issue_photos: photos };
    }),
  );

  const floors = await Promise.all(
    (floorsResult.data ?? []).map(async (floor) => {
      const assets = await Promise.all(
        (floor.floorplan_assets ?? []).map(async (asset) => {
          const { data } = await admin.storage
            .from("floorplan-assets")
            .createSignedUrl(asset.storage_path, 60 * 60);
          return { ...asset, url: data?.signedUrl ?? null };
        }),
      );
      return { ...floor, floorplan_assets: assets };
    }),
  );

  return json({ project, floors, issues, expires_in_seconds: 60 * 60 });
});
