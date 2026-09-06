/*
 * Field Notes page style: the plan is the working surface, while the right rail
 * behaves like an indexed inspection notebook. Copper pins are the only strong
 * accent; every other color exists to explain status or floor context.
 */
import { useMemo, useRef, useState, type MouseEvent } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleHelp,
  Crosshair,
  FileText,
  Filter,
  FolderOpen,
  Layers3,
  LocateFixed,
  MapPin,
  MousePointer2,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useIssues, type Issue, type IssueSeverity, type IssueStatus } from "@/contexts/IssuesContext";

const FLOORPLAN_URL = "/assets/floorplan-house.png";
const LOGO_URL = "/assets/surveyor-mark.png";
const COMPASS_URL = "/assets/field-note-compass.png";

const statusLabel: Record<IssueStatus, string> = {
  待處理: "待處理",
  處理中: "處理中",
  已完成: "已完成",
};

const severityLabel: Record<IssueSeverity, string> = {
  高: "高優先",
  中: "中優先",
  低: "低優先",
};

function statusClass(status: IssueStatus) {
  if (status === "已完成") return "status-done";
  if (status === "處理中") return "status-progress";
  return "status-pending";
}

function severityClass(severity: IssueSeverity) {
  if (severity === "高") return "severity-high";
  if (severity === "中") return "severity-medium";
  return "severity-low";
}

export default function Home() {
  const { issues, addIssue, resetDemoData } = useIssues();
  const [, setLocation] = useLocation();
  const [activeFloor, setActiveFloor] = useState("全部");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [pendingPoint, setPendingPoint] = useState<{ x: number; y: number } | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const filteredIssues = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return issues.filter((issue) => {
      const matchesFloor = activeFloor === "全部" || issue.floor === activeFloor;
      const matchesQuery = !normalizedQuery || [issue.code, issue.title, issue.location, issue.description].some((value) => value.toLowerCase().includes(normalizedQuery));
      return matchesFloor && matchesQuery;
    });
  }, [activeFloor, issues, query]);

  const selectedIssue = issues.find((issue) => issue.id === selectedId) ?? null;
  const completedCount = issues.filter((issue) => issue.status === "已完成").length;
  const inProgressCount = issues.filter((issue) => issue.status === "處理中").length;
  const pendingCount = issues.filter((issue) => issue.status === "待處理").length;

  function handlePlanClick(event: MouseEvent<HTMLDivElement>) {
    if (!drawMode || !stageRef.current) return;
    const bounds = stageRef.current.getBoundingClientRect();
    const x = Math.max(4, Math.min(96, ((event.clientX - bounds.left) / bounds.width) * 100));
    const y = Math.max(4, Math.min(96, ((event.clientY - bounds.top) / bounds.height) * 100));
    setPendingPoint({ x, y });
    setDrawMode(false);
  }

  function selectIssue(issue: Issue) {
    setSelectedId(issue.id);
    setLocation(`/issues/${issue.id}`);
  }

  function submitIssue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingPoint) return;
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    if (!title) return;
    const issue = addIssue({
      title,
      floor: String(data.get("floor") ?? "1F"),
      location: String(data.get("location") ?? "未指定位置"),
      x: pendingPoint.x,
      y: pendingPoint.y,
      severity: String(data.get("severity") ?? "中") as IssueSeverity,
      status: "待處理",
      description: String(data.get("description") ?? "").trim() || "尚未補充現場描述。",
    });
    setPendingPoint(null);
    setSelectedId(issue.id);
  }

  return (
    <div className="field-app min-h-screen">
      <header className="topbar">
        <div className="brand-lockup">
          <img src={LOGO_URL} alt="現場勘查標誌" className="brand-mark" />
          <div>
            <div className="brand-name">SITE / TRACE</div>
            <div className="brand-subtitle">房屋問題標註簿</div>
          </div>
        </div>
        <div className="topbar-meta">
          <span className="archive-pill"><span className="archive-dot" />現場檢查檔案</span>
          <span className="mono tiny">2026 / 09 / 06</span>
          <button type="button" className="icon-button" aria-label="查看使用提示" onClick={() => setShowHelp(true)}><CircleHelp size={18} /></button>
        </div>
      </header>

      <main className="workspace">
        <section className="plan-column" aria-label="平面圖工作區">
          <div className="section-heading">
            <div>
              <p className="eyebrow">INSPECTION BOARD / 01</p>
              <h1>問題定位圖</h1>
              <p className="lede">把問題留在它發生的位置，接上可以回看的現場證據。</p>
            </div>
            <div className="heading-actions">
              <button type="button" className="text-action" onClick={() => setShowReset(true)}><RotateCcw size={15} />重設示範資料</button>
              <div className="legend"><span className="legend-pin" />{issues.length} 個標註</div>
            </div>
          </div>

          <div className="floor-tabs" role="tablist" aria-label="樓層篩選">
            {["全部", "1F", "2F", "3F"].map((floor) => (
              <button key={floor} type="button" className={activeFloor === floor ? "floor-tab is-active" : "floor-tab"} onClick={() => setActiveFloor(floor)} role="tab" aria-selected={activeFloor === floor}>
                {floor === "全部" ? "全棟" : floor}
                <span>{floor === "全部" ? issues.length : issues.filter((issue) => issue.floor === floor).length}</span>
              </button>
            ))}
          </div>

          <div className={drawMode ? "plan-shell is-drawing" : "plan-shell"}>
            <div className="plan-toolbar">
              <div className="plan-toolbar-left"><Layers3 size={15} /><span>圖面總覽</span><span className="toolbar-separator" /><span className="mono">1 : 100</span></div>
              <div className="plan-toolbar-right"><span className="north-label">N</span><span className="north-arrow">↗</span><span className="toolbar-coordinates mono">X 04.18 / Y 12.06</span></div>
            </div>
            <div ref={stageRef} className="plan-stage" onClick={handlePlanClick} role="application" aria-label="房屋平面圖，可點擊新增問題標註">
              <img src={FLOORPLAN_URL} alt="包含 1F、2F、3F 的房屋平面圖" className="floorplan-image" />
              <div className="plan-wash" />
              {filteredIssues.map((issue, index) => (
                <button
                  key={issue.id}
                  type="button"
                  className={selectedId === issue.id ? "issue-pin is-selected" : "issue-pin"}
                  style={{ left: `${issue.x}%`, top: `${issue.y}%`, animationDelay: `${index * 45}ms` }}
                  onClick={(event) => { event.stopPropagation(); selectIssue(issue); }}
                  aria-label={`${issue.code} ${issue.title}`}
                >
                  <span className="pin-halo" />
                  <span className="pin-core">{issue.code.split("-")[1]}</span>
                </button>
              ))}
              {drawMode && <div className="draw-hint"><Crosshair size={16} />點擊圖面放置標註</div>}
              <div className="plan-scale mono">N ↑ &nbsp; 0 1 2 3 4 5 m</div>
            </div>
            <div className="plan-footer">
              <div className="plan-note"><MousePointer2 size={14} />點擊銅色定位釘查看問題；使用新增模式在圖面上建立紀錄。</div>
              <button type="button" className={drawMode ? "draw-button is-active" : "draw-button"} onClick={() => setDrawMode((value) => !value)}>
                {drawMode ? <X size={16} /> : <Plus size={16} />}{drawMode ? "取消新增" : "新增標註"}
              </button>
            </div>
          </div>

          <div className="lower-notes">
            <div className="note-card accent-note">
              <div className="note-card-mark"><Sparkles size={16} /></div>
              <div><p className="eyebrow">FIELD NOTE</p><p>目前顯示的是瀏覽器內的檢查紀錄。新增照片後，資料會保存在此瀏覽器，適合在 GitHub Pages 上作為個人工作簿使用。</p></div>
            </div>
            <img src={COMPASS_URL} alt="測量工具與建築圖面線稿裝飾" className="compass-illustration" />
          </div>
        </section>

        <aside className="issue-rail" aria-label="問題索引">
          <div className="rail-header">
            <div><p className="eyebrow">INDEX / {String(filteredIssues.length).padStart(2, "0")}</p><h2>問題索引</h2></div>
            <div className="rail-header-icon"><FileText size={20} /></div>
          </div>
          <div className="rail-stats">
            <div><strong>{pendingCount}</strong><span>待處理</span></div>
            <div><strong>{inProgressCount}</strong><span>處理中</span></div>
            <div><strong>{completedCount}</strong><span>已完成</span></div>
          </div>
          <div className="search-wrap"><Search size={16} /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋編號、位置或描述" aria-label="搜尋問題" /></div>
          <div className="rail-filter"><Filter size={14} /><span>{activeFloor === "全部" ? "全棟問題" : `${activeFloor} 問題`}</span><ChevronDown size={15} /></div>
          <div className="issue-list">
            {filteredIssues.length === 0 ? (
              <div className="empty-state"><SlidersHorizontal size={26} /><strong>沒有符合的紀錄</strong><span>換一個樓層或搜尋詞試試。</span></div>
            ) : filteredIssues.map((issue) => (
              <article key={issue.id} className={selectedId === issue.id ? "issue-card is-selected" : "issue-card"} onClick={() => setSelectedId(issue.id)}>
                <div className="issue-card-top"><span className="issue-code mono">{issue.code}</span><span className={`severity-tag ${severityClass(issue.severity)}`}>{severityLabel[issue.severity]}</span></div>
                <h3>{issue.title}</h3>
                <p className="issue-location"><MapPin size={13} />{issue.location}</p>
                <p className="issue-description">{issue.description}</p>
                <div className="issue-card-bottom"><span className={`status-badge ${statusClass(issue.status)}`}><span />{statusLabel[issue.status]}</span><Link href={`/issues/${issue.id}`} className="card-link" onClick={(event) => event.stopPropagation()}>查看紀錄 <ArrowUpRight size={14} /></Link></div>
              </article>
            ))}
          </div>
          <div className="rail-footer"><FolderOpen size={15} /><span>本機保存 · localStorage</span></div>
        </aside>
      </main>

      {pendingPoint && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="new-issue-title">
            <button type="button" className="modal-close" onClick={() => setPendingPoint(null)} aria-label="關閉"><X size={18} /></button>
            <p className="eyebrow">NEW FIELD NOTE / {pendingPoint.x.toFixed(1)} · {pendingPoint.y.toFixed(1)}</p>
            <h2 id="new-issue-title">新增問題標註</h2>
            <p className="modal-intro">標註會放在目前點擊的位置，之後可以從問題頁補上現場照片。</p>
            <form onSubmit={submitIssue} className="issue-form">
              <label>問題標題<input name="title" required placeholder="例如：牆面油漆剝落" autoFocus /></label>
              <div className="form-grid"><label>樓層<select name="floor" defaultValue="1F"><option>1F</option><option>2F</option><option>3F</option></select></label><label>優先級<select name="severity" defaultValue="中"><option value="高">高</option><option value="中">中</option><option value="低">低</option></select></label></div>
              <label>位置<input name="location" placeholder="例如：主臥／西側牆面" /></label>
              <label>初步描述<Textarea name="description" placeholder="記錄你在現場看到的情況……" rows={4} /></label>
              <div className="form-actions"><Button type="button" variant="outline" onClick={() => setPendingPoint(null)}>取消</Button><Button type="submit" className="copper-button"><Check size={16} />建立標註</Button></div>
            </form>
          </div>
        </div>
      )}

      {showHelp && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowHelp(false)}>
          <div className="help-sheet" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setShowHelp(false)} aria-label="關閉"><X size={18} /></button>
            <p className="eyebrow">HOW TO USE / 00</p><h2>像在圖紙上做記號</h2>
            <div className="help-step"><span>01</span><p><strong>新增標註</strong><br />按下「新增標註」，再點擊平面圖中的位置。</p></div>
            <div className="help-step"><span>02</span><p><strong>補上紀錄</strong><br />在問題頁更新處理狀態，並上傳一張或多張現場照片。</p></div>
            <div className="help-step"><span>03</span><p><strong>交接與發布</strong><br />資料目前保存在瀏覽器；網站原始碼與資產則可透過 GitHub Pages 發布。</p></div>
          </div>
        </div>
      )}

      {showReset && (
        <div className="modal-backdrop" role="presentation">
          <div className="confirm-sheet" role="dialog" aria-modal="true">
            <p className="eyebrow">RESET DEMO / 00</p><h2>回復示範紀錄？</h2><p>這會移除目前瀏覽器中的新增標註與照片，回到初始示範資料。</p>
            <div className="form-actions"><Button variant="outline" onClick={() => setShowReset(false)}>保留目前紀錄</Button><Button className="danger-button" onClick={() => { resetDemoData(); setShowReset(false); setSelectedId(null); }}>回復示範資料</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}
