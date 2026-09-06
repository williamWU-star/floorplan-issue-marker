/*
 * Field Notes detail style: this page reads like a single inspection sheet.
 * Preserve the trace from code and plan position to evidence; photos are user
 * supplied records only, never fabricated examples.
 */
import { useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import {
  ArrowLeft, ArrowUpRight, Camera, Check, ClipboardList, ExternalLink,
  FilePlus2, ImagePlus, MapPin, MoreHorizontal, Trash2, Upload, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useIssues, type IssueSeverity, type IssueStatus } from "@/contexts/IssuesContext";

const FLOORPLAN_URL = "/assets/floorplan-house.png";
const LOGO_URL = "/assets/surveyor-mark.png";
const statusOptions: IssueStatus[] = ["待處理", "處理中", "已完成"];
const severityOptions: IssueSeverity[] = ["高", "中", "低"];

function statusClass(status: IssueStatus) {
  if (status === "已完成") return "status-done";
  if (status === "處理中") return "status-progress";
  return "status-pending";
}

export default function IssueDetail() {
  const [, params] = useRoute("/issues/:id");
  const [, navigate] = useLocation();
  const { issues, updateIssue, deleteIssue, addPhotoFile, addExternalPhoto, removePhoto, floorplanUrl } = useIssues();
  const issue = issues.find((item) => item.id === params?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [externalPhotoAdding, setExternalPhotoAdding] = useState(false);
  const [externalPhotoError, setExternalPhotoError] = useState("");
  const [note, setNote] = useState(issue?.description ?? "");
  const [saved, setSaved] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  if (!issue) {
    return (
      <div className="not-found-page"><img src={LOGO_URL} alt="" className="brand-mark" /><p className="eyebrow">RECORD NOT FOUND / 404</p><h1>找不到這筆問題紀錄</h1><p>這筆標註可能已被移除，或目前的資料尚未載入。</p><Link href="/" className="back-link"><ArrowLeft size={16} />回到問題定位圖</Link></div>
    );
  }

  const record = issue;

  function saveNote() {
    updateIssue(record.id, { description: note });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPhotoUploading(true);
    try {
      await addPhotoFile(record.id, file, photoCaption.trim() || file.name);
      setPhotoCaption("");
    } catch {
      // The shared IssuesContext error state records the detailed failure.
      // Keep the page usable and let the user retry the upload.
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleAddExternalPhoto(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setExternalPhotoError("");
    const url = photoUrl.trim();
    if (!url) {
      setExternalPhotoError("請先輸入照片網址。");
      return;
    }
    setExternalPhotoAdding(true);
    try {
      await addExternalPhoto(record.id, url, photoCaption.trim() || "外部照片");
      setPhotoUrl("");
      setPhotoCaption("");
    } catch (err) {
      setExternalPhotoError(err instanceof Error ? err.message : "加入外部照片失敗");
    } finally {
      setExternalPhotoAdding(false);
    }
  }

  function removeIssue() {
    deleteIssue(record.id);
    navigate("/");
  }

  return (
    <div className="field-app min-h-screen">
      <header className="topbar">
        <div className="brand-lockup"><img src={LOGO_URL} alt="現場勘查標誌" className="brand-mark" /><div><div className="brand-name">SITE / TRACE</div><div className="brand-subtitle">房屋問題標註簿</div></div></div>
        <div className="topbar-meta"><span className="archive-pill"><span className="archive-dot" />檢查紀錄 / {issue.code}</span><Link href="/" className="back-link compact"><ArrowLeft size={15} />回到圖面</Link></div>
      </header>

      <main className="detail-page">
        <div className="detail-breadcrumb"><Link href="/">問題定位圖</Link><span>/</span><span>{issue.floor} · {issue.code}</span></div>
        <div className="detail-layout">
          <section className="detail-main">
            <div className="detail-title-row"><div><p className="eyebrow">INSPECTION RECORD / {issue.floor}</p><h1>{issue.title}</h1><p className="detail-location"><MapPin size={15} />{issue.location}</p></div><span className={`status-badge large ${statusClass(issue.status)}`}><span />{issue.status}</span></div>
            <div className="record-strip"><div><span className="strip-label">紀錄編號</span><strong className="mono">{issue.code}</strong></div><div><span className="strip-label">建立日期</span><strong className="mono">{issue.createdAt.replaceAll("-", ".")}</strong></div><div><span className="strip-label">優先級</span><strong>{issue.severity}優先</strong></div><div><span className="strip-label">照片</span><strong className="mono">{String(issue.photos.length).padStart(2, "0")}</strong></div></div>

            <div className="photo-section-head"><div><p className="eyebrow">EVIDENCE / 01</p><h2>現場照片</h2></div><div className="photo-section-actions"><Button variant="outline" size="sm" disabled={photoUploading} onClick={() => fileInputRef.current?.click()}>{photoUploading ? "上傳中…" : <><Upload size={15} />上傳照片</>} </Button><input ref={fileInputRef} type="file" accept="image/*,.heic,.heif" hidden onChange={handleFileChange} /></div></div>
            {issue.photos.length === 0 ? (
              <div className="photo-empty"><div className="photo-empty-icon"><Camera size={25} /></div><h3>尚未加入現場照片</h3><p>照片只會來自你的上傳或外部圖片網址，不會自動產生示範影像。</p><Button className="copper-button" disabled={photoUploading} onClick={() => fileInputRef.current?.click()}><ImagePlus size={16} />{photoUploading ? "上傳中…" : "選擇照片"}</Button></div>
            ) : (
              <div className="photo-grid">{issue.photos.map((photo, index) => <figure className="photo-card" key={photo.id}><div className="photo-frame"><img src={photo.url} alt={photo.caption} /><button type="button" className="photo-remove" onClick={() => removePhoto(issue.id, photo.id)} aria-label={`刪除照片 ${index + 1}`}><Trash2 size={14} /></button></div><figcaption><span className="mono">{String(index + 1).padStart(2, "0")}</span>{photo.caption}</figcaption></figure>)}</div>
            )}

            <div className="evidence-add"><div className="evidence-add-title"><FilePlus2 size={17} /><strong>加入外部照片網址</strong></div><p>適合使用已上傳到圖片服務或 GitHub 的公開圖片連結。</p><form onSubmit={handleAddExternalPhoto} className="external-photo-form"><input type="url" value={photoUrl} onChange={(event) => { setPhotoUrl(event.target.value); setExternalPhotoError(""); }} placeholder="https://…" aria-label="外部照片網址" disabled={externalPhotoAdding} /><input value={photoCaption} onChange={(event) => setPhotoCaption(event.target.value)} placeholder="照片說明（選填）" aria-label="照片說明" disabled={externalPhotoAdding} /><Button type="submit" variant="outline" disabled={externalPhotoAdding}>{externalPhotoAdding ? "加入中…" : <><ExternalLink size={15} />加入</>}</Button></form>{externalPhotoError && <p role="alert" className="form-error">{externalPhotoError}</p>}</div>
          </section>

          <aside className="detail-side">
            <div className="side-card location-card"><div className="side-card-heading"><p className="eyebrow">PLAN REFERENCE</p><MapPin size={17} /></div><h3>圖面位置</h3><div className="mini-plan"><img src={floorplanUrl || FLOORPLAN_URL} alt={floorplanUrl ? "已上傳的房屋平面圖" : "平面圖位置預覽"} /><span className="mini-pin" style={{ left: `${issue.x}%`, top: `${issue.y}%` }} /></div><div className="coordinates"><span>X {issue.x.toFixed(1)}</span><span>Y {issue.y.toFixed(1)}</span><span className="mono">{issue.floor}</span></div><Link href="/" className="side-link">回到圖面查看 <ArrowUpRight size={14} /></Link></div>
            <div className="side-card"><div className="side-card-heading"><p className="eyebrow">WORKFLOW</p><ClipboardList size={17} /></div><h3>處理狀態</h3><div className="status-options">{statusOptions.map((status) => <button type="button" key={status} className={issue.status === status ? `status-option is-active ${statusClass(status)}` : "status-option"} onClick={() => updateIssue(issue.id, { status })}><span className="status-option-dot" />{status}{issue.status === status && <Check size={14} />}</button>)}</div><label className="side-label">優先級<select value={issue.severity} onChange={(event) => updateIssue(issue.id, { severity: event.target.value as IssueSeverity })}>{severityOptions.map((severity) => <option key={severity}>{severity}</option>)}</select></label></div>
            <div className="side-card note-editor"><div className="side-card-heading"><p className="eyebrow">FIELD NOTE</p><MoreHorizontal size={17} /></div><h3>檢查描述</h3><Textarea value={note} onChange={(event) => setNote(event.target.value)} rows={6} /><Button className="save-note" onClick={saveNote}>{saved ? <><Check size={15} />已保存</> : "保存描述"}</Button></div>
            <div className="danger-zone"><button type="button" onClick={() => setShowDelete(true)}><Trash2 size={14} />刪除這筆標註</button></div>
          </aside>
        </div>
      </main>

      {showDelete && <div className="modal-backdrop" role="presentation"><div className="confirm-sheet" role="dialog" aria-modal="true"><button type="button" className="modal-close" onClick={() => setShowDelete(false)} aria-label="關閉"><X size={18} /></button><p className="eyebrow">DELETE RECORD / {issue.code}</p><h2>刪除這筆標註？</h2><p>問題、狀態與已加入的照片都會從資料庫移除。這個動作無法復原。</p><div className="form-actions"><Button variant="outline" onClick={() => setShowDelete(false)}>取消</Button><Button className="danger-button" onClick={removeIssue}><Trash2 size={15} />確認刪除</Button></div></div></div>}
    </div>
  );
}
