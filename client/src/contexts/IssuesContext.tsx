import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { rest, rpc, signStorageUrl, uploadStorageFile } from "@/lib/supabaseRest";
import { useAuth } from "@/contexts/AuthContext";

export type IssueStatus = "待處理" | "處理中" | "已完成";
export type IssueSeverity = "高" | "中" | "低";
export type IssuePhoto = { id: string; url: string; caption: string; addedAt: string; storagePath?: string };
export type Issue = { id: string; code: string; title: string; floor: string; location: string; x: number; y: number; severity: IssueSeverity; status: IssueStatus; description: string; createdAt: string; photos: IssuePhoto[] };

type DbIssue = { id: string; code: string; title: string; location: string | null; x: number; y: number; severity: string; status: string; description: string | null; created_at: string; floor_id: string };
type DbFloor = { id: string; label: string };
type DbPhoto = { id: string; issue_id: string; storage_path: string; caption: string | null; created_at: string };
type IssuesContextValue = { issues: Issue[]; loading: boolean; error: string | null; projectId: string | null; addIssue: (input: Omit<Issue, "id" | "code" | "createdAt" | "photos">) => Issue; updateIssue: (id: string, patch: Partial<Issue>) => void; deleteIssue: (id: string) => void; addPhoto: (issueId: string, photo: IssuePhoto) => void; addPhotoFile: (issueId: string, file: File, caption?: string) => Promise<void>; removePhoto: (issueId: string, photoId: string) => void; resetDemoData: () => Promise<void>; reload: () => Promise<void> };
const IssuesContext = createContext<IssuesContextValue | null>(null);
const severityToDb: Record<IssueSeverity, string> = { 高: "high", 中: "medium", 低: "low" };
const statusToDb: Record<IssueStatus, string> = { 待處理: "pending", 處理中: "in_progress", 已完成: "done" };
const dbToSeverity: Record<string, IssueSeverity> = { high: "高", medium: "中", low: "低" };
const dbToStatus: Record<string, IssueStatus> = { pending: "待處理", in_progress: "處理中", done: "已完成" };

async function loadProject() {
  const projects = await rest("/rest/v1/projects?select=id,name,address,created_at&order=created_at.desc&limit=1");
  if (projects?.[0]?.id) return projects[0].id as string;
  return rpc<string>("create_project_with_owner", { p_name: "SITE / TRACE 房屋檢查", p_address: null, p_floor_labels: ["1F", "2F", "3F"] });
}
function mapIssue(row: DbIssue, floorMap: Map<string, string>, photos: IssuePhoto[]): Issue { return { id: row.id, code: row.code, title: row.title, floor: floorMap.get(row.floor_id) || "1F", location: row.location || "未指定位置", x: Number(row.x) * 100, y: Number(row.y) * 100, severity: dbToSeverity[row.severity] || "中", status: dbToStatus[row.status] || "待處理", description: row.description || "", createdAt: row.created_at.slice(0, 10), photos }; }

export function IssuesProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]); const [projectId, setProjectId] = useState<string | null>(null); const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null);
  const reload = async () => {
    if (!session) { setIssues([]); setProjectId(null); return; }
    setLoading(true); setError(null);
    try {
      const pid = await loadProject(); setProjectId(pid);
      const floors = await rest(`/rest/v1/floors?select=id,label&project_id=eq.${pid}&order=sort_order.asc`) as DbFloor[];
      const floorMap = new Map(floors.map((f) => [f.id, f.label]));
      const rows = await rest(`/rest/v1/issues?select=id,code,title,location,x,y,severity,status,description,created_at,floor_id&project_id=eq.${pid}&order=created_at.desc`) as DbIssue[];
      const photoRows = rows.length ? await rest(`/rest/v1/issue_photos?select=id,issue_id,storage_path,caption,created_at&issue_id=in.(${rows.map((r) => r.id).join(",")})&order=created_at.asc`) as DbPhoto[] : [];
      const grouped = new Map<string, IssuePhoto[]>();
      for (const photo of photoRows) { try { const url = await signStorageUrl("issue-photos", photo.storage_path, 3600); const list = grouped.get(photo.issue_id) || []; list.push({ id: photo.id, url, caption: photo.caption || "現場照片", addedAt: photo.created_at, storagePath: photo.storage_path }); grouped.set(photo.issue_id, list); } catch { /* ignore missing photo */ } }
      setIssues(rows.map((row) => mapIssue(row, floorMap, grouped.get(row.id) || [])));
    } catch (err) { setError(err instanceof Error ? err.message : "資料載入失敗"); } finally { setLoading(false); }
  };
  useEffect(() => { void reload(); }, [session?.access_token]);

  const value = useMemo<IssuesContextValue>(() => ({
    issues, loading, error, projectId,
    addIssue: (input) => {
      const temporary: Issue = { ...input, id: `pending-${Date.now()}`, code: `${input.floor}-NEW`, createdAt: new Date().toISOString().slice(0, 10), photos: [] };
      if (!projectId || !session) return temporary;
      void (async () => { try {
        const floors = await rest(`/rest/v1/floors?select=id,label&project_id=eq.${projectId}&label=eq.${encodeURIComponent(input.floor)}`) as DbFloor[]; const floor = floors[0]; if (!floor) throw new Error("找不到樓層");
        const existing = await rest(`/rest/v1/issues?select=code&project_id=eq.${projectId}&order=created_at.desc&limit=1`) as { code: string }[];
        const last = existing[0]?.code?.match(/(\d+)$/); const number = last ? Number(last[1]) + 1 : issues.length + 1; const prefix = input.floor === "1F" ? "F1" : input.floor === "2F" ? "F2" : "F3"; const code = `${prefix}-${String(number).padStart(3, "0")}`;
        await rest("/rest/v1/issues", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ project_id: projectId, floor_id: floor.id, code, title: input.title, location: input.location, x: input.x / 100, y: input.y / 100, severity: severityToDb[input.severity], status: "pending", description: input.description, created_by: session.user.id }) }); await reload();
      } catch (err) { setError(err instanceof Error ? err.message : "新增標註失敗"); } })();
      return temporary;
    },
    updateIssue: (id, patch) => { const current = issues.find((item) => item.id === id); setIssues((list) => list.map((item) => item.id === id ? { ...item, ...patch } : item)); if (!current || !projectId) return; void (async () => { const body: Record<string, unknown> = {}; if (patch.title !== undefined) body.title = patch.title; if (patch.location !== undefined) body.location = patch.location; if (patch.description !== undefined) body.description = patch.description; if (patch.x !== undefined) body.x = patch.x / 100; if (patch.y !== undefined) body.y = patch.y / 100; if (patch.severity !== undefined) body.severity = severityToDb[patch.severity]; if (patch.status !== undefined) body.status = statusToDb[patch.status]; if (Object.keys(body).length) await rest(`/rest/v1/issues?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(body) }); })().catch((err) => setError(err instanceof Error ? err.message : "更新失敗")); },
    deleteIssue: (id) => { setIssues((list) => list.filter((item) => item.id !== id)); void rest(`/rest/v1/issues?id=eq.${id}`, { method: "DELETE" }).catch((err) => setError(err instanceof Error ? err.message : "刪除失敗")); },
    addPhoto: (issueId, photo) => {
      if (!projectId || !session || !photo.url.startsWith("data:")) return;
      void (async () => { try { const comma = photo.url.indexOf(","); const meta = photo.url.slice(0, comma); const bytes = Uint8Array.from(atob(photo.url.slice(comma + 1)), (c) => c.charCodeAt(0)); const mime = meta.match(/data:([^;]+)/)?.[1] || "image/jpeg"; const file = new File([bytes], `${photo.id}.jpg`, { type: mime }); await uploadStorageFile("issue-photos", `${projectId}/${issueId}/${photo.id}.jpg`, file); const path = `${projectId}/${issueId}/${photo.id}.jpg`; await rest("/rest/v1/issue_photos", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ issue_id: issueId, storage_path: path, caption: photo.caption || file.name, uploaded_by: session.user.id }) }); await reload(); } catch (err) { setError(err instanceof Error ? err.message : "照片上傳失敗"); } })();
    },
    addPhotoFile: async (issueId, file, caption) => { if (!projectId || !session) throw new Error("尚未登入"); const path = `${projectId}/${issueId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`; await uploadStorageFile("issue-photos", path, file); await rest("/rest/v1/issue_photos", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ issue_id: issueId, storage_path: path, caption: caption || file.name, uploaded_by: session.user.id }) }); await reload(); },
    removePhoto: (issueId, photoId) => { const photo = issues.find((item) => item.id === issueId)?.photos.find((p) => p.id === photoId); setIssues((list) => list.map((item) => item.id === issueId ? { ...item, photos: item.photos.filter((p) => p.id !== photoId) } : item)); void (async () => { await rest(`/rest/v1/issue_photos?id=eq.${photoId}`, { method: "DELETE" }); if (photo?.storagePath) await rest(`/storage/v1/object/issue-photos/${photo.storagePath.split("/").map(encodeURIComponent).join("/")}`, { method: "DELETE" }); })().catch((err) => setError(err instanceof Error ? err.message : "照片刪除失敗")); },
    resetDemoData: async () => { await reload(); }, reload,
  }), [error, issues, loading, projectId, session]);
  return <IssuesContext.Provider value={value}>{children}</IssuesContext.Provider>;
}
export function useIssues() { const context = useContext(IssuesContext); if (!context) throw new Error("useIssues must be used inside IssuesProvider"); return context; }
