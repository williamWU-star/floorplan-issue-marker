const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export type Session = { access_token: string; refresh_token: string; expires_at?: number; user: { id: string; email?: string } };
const SESSION_KEY = "site-trace-session";

function requireConfig() { if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("尚未設定 Supabase 網站環境變數"); }
export function getSession(): Session | null { try { const raw = localStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) as Session : null; } catch { return null; } }
function saveSession(session: Session | null) { if (!session) localStorage.removeItem(SESSION_KEY); else localStorage.setItem(SESSION_KEY, JSON.stringify(session)); }

async function supabaseFetch(path: string, init: RequestInit = {}, accessToken?: string) {
  requireConfig(); const headers = new Headers(init.headers); headers.set("apikey", SUPABASE_KEY); headers.set("Content-Type", "application/json"); if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(`${SUPABASE_URL}${path}`, { ...init, headers }); const text = await response.text(); let body: any = null; try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new Error(body?.message || body?.error_description || body?.error || `Supabase request failed (${response.status})`); return body;
}
export async function requestMagicLink(email: string) { const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`; await supabaseFetch("/auth/v1/otp", { method: "POST", body: JSON.stringify({ email, create_user: true, options: { email_redirect_to: redirectTo } }) }); }
export async function consumeAuthRedirect() {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash; if (!hash) return getSession(); const params = new URLSearchParams(hash); const accessToken = params.get("access_token"); const refreshToken = params.get("refresh_token"); if (!accessToken || !refreshToken) return getSession();
  const session: Session = { access_token: accessToken, refresh_token: refreshToken, expires_at: Number(params.get("expires_at") || 0) || undefined, user: { id: "" } }; const user = await supabaseFetch("/auth/v1/user", {}, accessToken); session.user = { id: user.id, email: user.email }; saveSession(session); history.replaceState(null, "", window.location.pathname + window.location.search); return session;
}
export async function refreshSessionIfNeeded() { const session = getSession(); if (!session) return null; if (!session.expires_at || session.expires_at * 1000 > Date.now() + 60_000) return session; try { const next = await supabaseFetch("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: session.refresh_token }) }); const refreshed: Session = { access_token: next.access_token, refresh_token: next.refresh_token, expires_at: Math.floor(Date.now() / 1000) + Number(next.expires_in || 3600), user: { id: next.user?.id || session.user.id, email: next.user?.email || session.user.email } }; saveSession(refreshed); return refreshed; } catch { saveSession(null); return null; } }
export async function signOut() { const session = getSession(); if (session) { try { await supabaseFetch("/auth/v1/logout", { method: "POST" }, session.access_token); } catch { /* local sign-out still succeeds */ } } saveSession(null); }
export async function rest(path: string, init: RequestInit = {}) { const session = await refreshSessionIfNeeded(); if (!session) throw new Error("尚未登入"); return supabaseFetch(path, init, session.access_token); }
export async function rpc<T = any>(name: string, args: Record<string, unknown> = {}) { return rest(`/rest/v1/rpc/${name}`, { method: "POST", body: JSON.stringify(args) }) as Promise<T>; }
export async function signStorageUrl(bucket: string, path: string, expiresIn = 3600) { const encodedPath = path.split("/").map(encodeURIComponent).join("/"); const result = await rest(`/storage/v1/object/sign/${encodeURIComponent(bucket)}/${encodedPath}`, { method: "POST", body: JSON.stringify({ expiresIn }) }); const signed = result.signedURL || result.signedUrl; return signed.startsWith("http") ? signed : `${SUPABASE_URL}/storage/v1${signed}`; }
export async function uploadStorageFile(bucket: string, path: string, file: File) { requireConfig(); const encodedPath = path.split("/").map(encodeURIComponent).join("/"); const session = await refreshSessionIfNeeded(); if (!session) throw new Error("尚未登入"); const headers = new Headers({ apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}`, "Content-Type": file.type || "application/octet-stream", "x-upsert": "false" }); const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedPath}`, { method: "POST", headers, body: file }); if (!response.ok) throw new Error(await response.text()); }
export { SUPABASE_URL };
