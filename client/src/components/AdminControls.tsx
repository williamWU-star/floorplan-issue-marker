import { useState } from "react";
import { Copy, LogOut, Share2, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useIssues } from "@/contexts/IssuesContext";
import { rpc } from "@/lib/supabaseRest";

export default function AdminControls() {
  const { session, signOut } = useAuth();
  const { projectId } = useIssues();
  const [shareUrl, setShareUrl] = useState("");
  const [busy, setBusy] = useState(false);
  if (!session || !projectId) return null;

  async function createShareLink() {
    setBusy(true);
    try {
      const token = await rpc<string>("create_project_share_token", { p_project_id: projectId });
      const url = `${window.location.origin}${import.meta.env.BASE_URL}share/${token}`;
      setShareUrl(url);
      try { await navigator.clipboard.writeText(url); } catch { /* clipboard permission is optional */ }
    } finally { setBusy(false); }
  }

  return (
    <>
      <div style={{ position: "fixed", right: 18, bottom: 18, zIndex: 40, display: "flex", gap: 8, padding: 8, border: "1px solid rgba(40,32,24,.15)", borderRadius: 999, background: "rgba(255,252,247,.96)", boxShadow: "0 8px 30px rgba(0,0,0,.12)" }}>
        <button type="button" className="draw-button" onClick={createShareLink} disabled={busy} style={{ borderRadius: 999, padding: "9px 14px" }}><Share2 size={15} />{busy ? "建立中…" : "分享閱覽連結"}</button>
        <button type="button" className="icon-button" onClick={() => void signOut()} aria-label="登出"><LogOut size={16} /></button>
      </div>
      {shareUrl && <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 50, display: "grid", placeItems: "center", background: "rgba(20,16,12,.35)" }}>
        <div className="modal-sheet" style={{ maxWidth: 560, width: "calc(100% - 32px)" }}>
          <button type="button" className="modal-close" onClick={() => setShareUrl("")} aria-label="關閉"><X size={18} /></button>
          <p className="eyebrow">PUBLIC LINK / READY</p><h2>閱覽連結已建立</h2>
          <p className="modal-intro">這個連結不要求閱覽者登入，只能查看公開報告。</p>
          <input value={shareUrl} readOnly onFocus={(event) => event.currentTarget.select()} style={{ width: "100%" }} />
          <div className="form-actions"><button type="button" className="draw-button" onClick={() => navigator.clipboard?.writeText(shareUrl)}><Copy size={15} />複製連結</button><button type="button" className="draw-button" onClick={() => setShareUrl("")}>關閉</button></div>
        </div>
      </div>}
    </>
  );
}
