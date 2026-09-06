/*
 * Field Notes design reminder: this context keeps issue records traceable from the
 * copper location pin on the plan to its inspection evidence page. Keep the data
 * vocabulary practical, explicit, and easy to export as static content later.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type IssueStatus = "待處理" | "處理中" | "已完成";
export type IssueSeverity = "高" | "中" | "低";

export type IssuePhoto = {
  id: string;
  url: string;
  caption: string;
  addedAt: string;
};

export type Issue = {
  id: string;
  code: string;
  title: string;
  floor: string;
  location: string;
  x: number;
  y: number;
  severity: IssueSeverity;
  status: IssueStatus;
  description: string;
  createdAt: string;
  photos: IssuePhoto[];
};

const STORAGE_KEY = "floorplan-issue-marker-issues";

const seedIssues: Issue[] = [
  {
    id: "issue-001",
    code: "F1-001",
    title: "客廳東側窗框滲水",
    floor: "1F",
    location: "客廳／東側窗",
    x: 19.5,
    y: 46,
    severity: "高",
    status: "處理中",
    description: "雨後窗框下緣出現水痕，需確認外牆接縫與窗框防水收邊。",
    createdAt: "2026-09-04",
    photos: [],
  },
  {
    id: "issue-002",
    code: "F1-002",
    title: "車庫地坪裂縫",
    floor: "1F",
    location: "車庫／靠近入口",
    x: 28.5,
    y: 82,
    severity: "中",
    status: "待處理",
    description: "地坪有一條橫向細裂縫，需量測寬度並觀察是否持續延伸。",
    createdAt: "2026-09-05",
    photos: [],
  },
  {
    id: "issue-003",
    code: "F2-001",
    title: "主臥陽台排水坡度",
    floor: "2F",
    location: "主臥／下方陽台",
    x: 54.8,
    y: 79,
    severity: "中",
    status: "待處理",
    description: "現場初步觀察積水方向不明，需於降雨後補拍並檢查落水頭。",
    createdAt: "2026-09-03",
    photos: [],
  },
  {
    id: "issue-004",
    code: "F3-001",
    title: "套房浴室通風窗",
    floor: "3F",
    location: "套房／浴室北側",
    x: 71.8,
    y: 24.5,
    severity: "低",
    status: "已完成",
    description: "窗扇開啟角度偏小，已確認五金功能正常並記錄改善建議。",
    createdAt: "2026-09-01",
    photos: [],
  },
];

function readIssues(): Issue[] {
  if (typeof window === "undefined") return seedIssues;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return seedIssues;
    const parsed = JSON.parse(stored) as Issue[];
    return Array.isArray(parsed) ? parsed : seedIssues;
  } catch {
    return seedIssues;
  }
}

type IssuesContextValue = {
  issues: Issue[];
  addIssue: (input: Omit<Issue, "id" | "code" | "createdAt" | "photos">) => Issue;
  updateIssue: (id: string, patch: Partial<Issue>) => void;
  deleteIssue: (id: string) => void;
  addPhoto: (issueId: string, photo: IssuePhoto) => void;
  removePhoto: (issueId: string, photoId: string) => void;
  resetDemoData: () => void;
};

const IssuesContext = createContext<IssuesContextValue | null>(null);

export function IssuesProvider({ children }: { children: ReactNode }) {
  const [issues, setIssues] = useState<Issue[]>(readIssues);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(issues));
  }, [issues]);

  const value = useMemo<IssuesContextValue>(
    () => ({
      issues,
      addIssue: (input) => {
        const nextNumber = issues.length + 1;
        const issue: Issue = {
          ...input,
          id: `issue-${Date.now()}`,
          code: `${input.floor === "1F" ? "F1" : input.floor === "2F" ? "F2" : "F3"}-${String(nextNumber).padStart(3, "0")}`,
          createdAt: new Date().toISOString().slice(0, 10),
          photos: [],
        };
        setIssues((current) => [issue, ...current]);
        return issue;
      },
      updateIssue: (id, patch) => {
        setIssues((current) => current.map((issue) => (issue.id === id ? { ...issue, ...patch } : issue)));
      },
      deleteIssue: (id) => {
        setIssues((current) => current.filter((issue) => issue.id !== id));
      },
      addPhoto: (issueId, photo) => {
        setIssues((current) => current.map((issue) => (issue.id === issueId ? { ...issue, photos: [...issue.photos, photo] } : issue)));
      },
      removePhoto: (issueId, photoId) => {
        setIssues((current) => current.map((issue) => (issue.id === issueId ? { ...issue, photos: issue.photos.filter((photo) => photo.id !== photoId) } : issue)));
      },
      resetDemoData: () => setIssues(seedIssues),
    }),
    [issues],
  );

  return <IssuesContext.Provider value={value}>{children}</IssuesContext.Provider>;
}

export function useIssues() {
  const context = useContext(IssuesContext);
  if (!context) throw new Error("useIssues must be used inside IssuesProvider");
  return context;
}
