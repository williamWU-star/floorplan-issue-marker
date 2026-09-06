import { useEffect, useState } from "react";
import { MapPin, Camera, AlertTriangle } from "lucide-react";
import { useRoute } from "wouter";
import { SUPABASE_URL } from "@/lib/supabaseRest";
import { LOGO_URL, FLOORPLAN_URL } from "@/const";

type ReportIssue = { id: string; code: string; title: string; location: string | null; x: number; y: number; severity: string; status: string; description: string | null; floor_id: string; photos: { id: string; caption: string | null; url: string }[] };
type Report = { project: { id: string; name: string; address: string | null }; floors: { id: string; label: string; sort_order: number }[]; issues: ReportIssue[] };

const status: Record<string, string> = { pending: "待處理", in_progress: "處理中", done: "已完成" };
const severity: Record<string, string> = { high: "高優先", medium: "中優先", low: "低優先" };

export default function ShareReport() {
  const [, params] = useRoute("/share/:token");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = params?.token;
    if (!token) return;
    fetch(`${SUPABASE_URL}/functions/v1/public-report?token=${encodeURIComponent(token)}`)
      .then(async (res) => { const body = await res.json(); if (!res.ok) throw new Error(body.error || "分享連結無效或已撤銷"); return body as Report; })
      .then(setReport)
      .catch((err) => setError(err instanceof Error ? err.message : "無法載入公開檢查報告"));
  }, [params?.token]);

  if (error) return <div className="not-found-page"><img src={LOGO_URL} alt="" className="brand-mark" /><p className="eyebrow">PUBLIC REPORT / 404</p><h1>無法開啟這份報告</h1><p>{error}</p></div>;
  if (!report) return <div className="not-found-page"><p className="eyebrow">PUBLIC REPORT</p><h1>正在載入報告…</h1></div>;

  const floorMap = new Map(report.floors.map((floor) => [floor.id, floor.label]));
  return (
    <div className="field-app min-h-screen">
      <header className="topbar"><div className="brand-lockup"><img src={LOGO_URL} alt="現場勘查標誌" className="brand-mark" /><div><div className="brand-name">SITE / TRACE</div><div className="brand-subtitle">公開檢查報告</div></div></div><span className="archive-pill"><span className="archive-dot" />僅供閱覽</span></header>
      <main className="workspace" style={{ gridTemplateColumns: "1fr" }}>
        <section className="plan-column">
          <div className="section-heading"><div><p className="eyebrow">PUBLIC REPORT / {report.issues.length.toString().padStart(2, "0")}</p><h1>{report.project.name}</h1><p className="lede">{report.project.address || "房屋檢查現場紀錄"}</p></div></div>
          <div className="plan-shell"><div className="plan-toolbar"><span>問題定位圖</span><span className="mono">READ ONLY</span></div><div className="plan-stage"><img src={FLOORPLAN_URL} alt="房屋平面圖" className="floorplan-image" /><div className="plan-wash" />{report.issues.map((issue) => <span key={issue.id} className="issue-pin" style={{ left: `${Number(issue.x) * 100}%`, top: `${Number(issue.y) * 100}%` }} title={`${issue.code} ${issue.title}`}><span className="pin-halo" /><span className="pin-core">{issue.code.split("-")[1]}</span></span>)}</div></div>
          <div className="issue-list" style={{ marginTop: 24 }}>{report.issues.map((issue) => <article key={issue.id} className="issue-card"><div className="issue-card-top"><span className="issue-code mono">{issue.code}</span><span className="severity-tag severity-medium">{severity[issue.severity] || issue.severity}</span></div><h3>{issue.title}</h3><p className="issue-location"><MapPin size={13} />{floorMap.get(issue.floor_id) || ""} · {issue.location || "未指定位置"}</p><p className="issue-description">{issue.description || ""}</p><div className="issue-card-bottom"><span className="status-badge"><span />{status[issue.status] || issue.status}</span><span>{issue.photos.length} <Camera size={13} /></span></div>{issue.photos.length > 0 && <div className="photo-grid" style={{ marginTop: 14 }}>{issue.photos.map((photo) => <figure className="photo-card" key={photo.id}><div className="photo-frame"><img src={photo.url} alt={photo.caption || "現場照片"} /></div><figcaption>{photo.caption || "現場照片"}</figcaption></figure>)}</div>}</article>)}</div>
          {report.issues.length === 0 && <div className="empty-state"><AlertTriangle size={26} /><strong>目前沒有公開的問題紀錄</strong></div>}
        </section>
      </main>
    </div>
  );
}
