import { FormEvent, useState } from "react";
import { Mail, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { LOGO_URL } from "@/const";

export default function Login() {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    setBusy(true); setError("");
    try { await signInWithEmail(email.trim()); setSent(true); }
    catch (err) { setError(err instanceof Error ? err.message : "登入連結寄送失敗"); }
    finally { setBusy(false); }
  }

  return (
    <div className="field-app min-h-screen">
      <header className="topbar"><div className="brand-lockup"><img src={LOGO_URL} alt="現場勘查標誌" className="brand-mark" /><div><div className="brand-name">SITE / TRACE</div><div className="brand-subtitle">房屋問題標註簿</div></div></div><span className="archive-pill"><span className="archive-dot" />管理者入口</span></header>
      <main className="not-found-page" style={{ maxWidth: 620 }}>
        <p className="eyebrow">ADMIN ACCESS / 00</p>
        <h1>登入檢查檔案</h1>
        <p>管理者登入後才能新增、編輯問題與上傳現場照片。閱覽者不需要登入，<Link href="/?view=1">純瀏覽模式</Link>即可查看。</p>
        {sent ? (
          <div className="note-card accent-note"><div className="note-card-mark"><CheckCircle2 size={18} /></div><div><strong>登入連結已寄出</strong><p>請打開信箱中的登入連結。完成後會自動回到這個檢查檔案。</p></div></div>
        ) : (
          <form onSubmit={submit} className="issue-form" style={{ marginTop: 28 }}>
            <label>管理者 Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required autoFocus /></label>
            {error && <p role="alert" style={{ color: "#9f2d2d" }}>{error}</p>}
            <button type="submit" className="draw-button" disabled={busy}><Mail size={16} />{busy ? "寄送中…" : "寄送登入連結"}</button>
          </form>
        )}
      </main>
    </div>
  );
}
