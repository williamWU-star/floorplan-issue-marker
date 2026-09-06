# DEVLOG — SITE / TRACE 房屋問題標註簿

日期：2026-09-06  
Author：wu33000-design (fork) → williamWU-star (base repo)  
Package manager：pnpm 10.4.1  
部署網址：https://williamwu-star.github.io/floorplan-issue-marker/

---

## 0. 專案起點

pure-frontend React + Vite SPA，部署於 GitHub Pages。
資料持久化透過 Supabase (REST + Storage + RPC functions)，匿名編輯模式允許任何人在未登入時標註。

---

## 1. PR #4–#6 — UI 布局與功能優化（已合併）

### 移除 issue-rail → 改為原地 detail panel
- `client/src/pages/Home.tsx`：將 `<aside class="issue-rail">` (左側列表) 替換為 `<aside class="issue-detail-panel">` (右側面板)。點擊定位釘不再導航至 `/issues/:id`，而是在同頁展開詳情。
- CSS 布局：桌面為雙欄 (`grid-template-columns: minmax(0,1fr) 355px)`)，移動斷點 `820px` 為單欄堆疊。`.photo-scroll-area` 在桌面為垂直滾動，移動為水平滾動。

### 移除 FIELD NOTE 標題與破圖錶
- 刪除 `COMPASS_URL` 常量和 broken `heic2any` 圖片元素。
- 刪除 `field-note` 相關 CSS。

### 平面圖上傳與錯誤顯示
- `IssuesContext.tsx`：新增 `uploadFloorplan(file, floorLabel)`。
- `Home.tsx`：`handleFloorplanUpload` 含錯誤顯示 (`floorplanUploadError`)。

### 刪除標註 (移除標註)
- `IssuesContext.tsx`：`deleteIssue(id)` 透過 `DELETE /rest/v1/issues?id=eq.{id}`。
- `Home.tsx`：確認對話框 (`showDeleteConfirm`) + `<Trash2>` 按鈕。

---

## 2. PR #7 — 外部照片 URL 命名衝突修復（已合併）

### 問題
`IssueDetail.tsx` 中 `addExternalPhoto` 與 `IssuesContext` 提供的同名函數衝突 → `SyntaxError: Identifier 'addExternalPhoto' has already been declared`。

### 修復
將本地 handler 重命名為 `handleAddExternalPhoto`。

---

## 3. PR #8 — 初始 HEIC 轉換方案 (browser-image-compression) (已合併)

- `IssuesContext.tsx`：`convertHeicIfNeeded()` 使用 `browser-image-compression` 壓縮。
- `IssueDetail.tsx`：`<input type="file" accept="image/*,.heic,.heif">`。

---

## 4. PR #9 — 切換到 heic-to@1.5.2 (已合併)

### 問題
repo 擁有者在 PR #8 合併後，直接在 `origin/main` 提交 `3923e1f` (`heic2any` CDN + `browser-image-compression`) 和 `c7fb303` (`accept` 属性)，與 PR #9 的 `heic-to` 方案衝突。

### 衝突原因
- PR #8 (browser-image-compression) 合併至 origin/main
- repo 擁有者在 origin/main 直接提交 `3923e1f` (heic2any CDN + imageCompression) 和 `c7fb303` (accept 属性)
- fork 的 PR #9 (heic-to@1.5.2) 與這些提交修改了同一個文件 (IssuesContext.tsx)
- 導致 `git merge` 時 content conflict

### 解決方式
- 創建乾淨分支 `clean-pr` 從 `origin/main` cherry-pick 兩個 commit
- 使用 `git checkout --theirs` 保留 `heic-to` 版本
- 最終 PR #9 有 2 個乾淨的線性 commits，9 個文件變更

### 變更內容
- `package.json`：移除 `browser-image-compression`，加入 `heic-to: 1.5.2`
- `IssuesContext.tsx`：`convertHeicIfNeeded()` 改用 `isHeic()` (async, checks magic bytes) + `heicTo({ blob, type: "image/jpeg", quality: 0.85 })`
- 同時套用 `accept="image/*,.heic,.heif"` (來自 origin/main `c7fb303`)
- `vite.config.ts`：新增 `@shared` alias (匹配 tsconfig.json)

---

## 5. PR #11 — Icon 404 修復 (已合併)

### 問題
頂部左角 logo icon 回傳 404。硬編碼路徑 `"/assets/surveyor-mark.png"` 在 GitHub Pages 部署時缺少 repo 子路徑前綴。
- 破圖路徑：`https://williamwu-star.github.io/assets/surveyor-mark.png` → 404
- 正確路徑：`https://williamwu-star.github.io/floorplan-issue-marker/assets/surveyor-mark.png` → 200

### 根本原因
`vite.config.ts` line 14: `base: process.env.VITE_BASE_PATH || "/"` — Vite 在構建時會在 `.js/.css` 文件中插入 base path，但硬編碼的字串常量不會被處理。

### 修復
1. `client/src/const.ts`：新增共享常量
   ```typescript
   const ASSETS_BASE = import.meta.env.BASE_URL ?? "/";
   export const LOGO_URL = `${ASSETS_BASE}assets/surveyor-mark.png`;
   export const FLOORPLAN_URL = `${ASSETS_BASE}assets/floorplan-house.png`;
   ```
2. `Home.tsx`, `IssueDetail.tsx`, `Login.tsx`, `ShareReport.tsx`：移除硬編碼 `const LOGO_URL = "/assets/..."`，改為 `import { LOGO_URL, FLOORPLAN_URL } from "@/const"`
3. `vite.config.ts`：新增 `@shared` alias (tsconfig.json 已有但 Vite 缺少)
4. `index.html` favicon：Vite 自動處理 `href="/assets/..."` → `href="/floorplan-issue-marker/assets/..."` ✅
5. CSS `url("/assets/paper-fiber-texture.png")`：Vite 在構建時改為相對路徑 ✅

### 驗證
- `npx tsc --noEmit` ✅
- `pnpm build` ✅ (977ms)
- Built JS 中 logo URL: `` `${Mu}assets/surveyor-mark.png` `` 其中 `Mu="/floorplan-issue-marker/"`
- Live site: `https://williamwu-star.github.io/floorplan-issue-marker/assets/surveyor-mark.png` → HTTP 200 ✅

---

## 6. PR #12 — 登入才能標註 + /view 路由 (已合併)

### 問題
匿名編輯模式允許任何人在未登入時標註，無純檢視 URL。

### 修復
1. `App.tsx`：Auth gate
   - 未登入時，`/` 和 `/issues/:id` 顯示 Login 组件
   - `/share/:token`、`/view`、`/login` 保持公開訪問

2. `Home.tsx`：`readOnly` 模式 (透過 URL 路徑檢測)
   - 隱藏：新增標註、刪除、平面圖上傳、重設示範資料按鈕
   - 顯示「登入以編輯」連結
   - `plan-note` 改為「僅供瀏覽模式」

3. `Login.tsx`：頁面文字更新，說明「管理者登入後才能編輯，閱覽者不需要登入」

### URLs
- 編輯模式：`https://williamwu-star.github.io/floorplan-issue-marker/` (需登入)
- 純檢視：`https://williamwu-star.github.io/floorplan-issue-marker/view`

---

## 7. PR #13 — ?view=1 query param (OPEN)

### 問題
GitHub Pages 對於 `/view` 子路徑返回 HTTP 404 (標準 SPA 路由，透過 `404.html` fallback)。某些瀏覽器可能不渲染 404 頁面的內容。

### 修復
添加 `?view=1` 查询参数作為替代方案，根路徑 `/` 總是返回 HTTP 200：

```
https://williamwu-star.github.io/floorplan-issue-marker/?view=1
```

- `App.tsx`：`isViewOnly` 同時檢查 `path === "/view"` 和 `URLSearchParams.get("view") === "1"`
- `Home.tsx`：`readOnly` 同樣檢查 `?view=1`
- `Login.tsx`：頁面文字加入「`/?view=1` 純瀏覽模式」連結

### 變更文件
- `client/src/App.tsx` (2 insertions, 1 deletion)
- `client/src/pages/Home.tsx` (2 insertions)
- `client/src/pages/Login.tsx` (1 insertion, 1 deletion)

---

## 技術筆記

### Vite 部署配置
```typescript
// vite.config.ts
base: process.env.VITE_BASE_PATH || "/";
```
- Local dev: `base = "/"` (assets 位於 `/assets/`)
- GitHub Pages: `VITE_BASE_PATH=/floorplan-issue-marker/` (assets 位於 `/floorplan-issue-marker/assets/`)
- GitHub Actions workflow: `VITE_BASE_PATH: /${{ github.event.repository.name }}/`

### CSS asset URL 處理
- CSS 中的 `url("/assets/...")` 由 Vite 在構建時自動改為相對路徑，無需手動處理
- JS/TS 中的硬編碼字串常量需要手動添加 `BASE_URL` 前綴

### Supabase 匿名編輯模式
`20260906003000_anonymous_edit_mode.sql` migration 放寬所有 RLS 政策為 `to anon, authenticated`，並允許 `created_by`/`uploaded_by` 為 NULL。未來如需重新收緊權限，需修改這些政策。

### Supabase Edge Functions
`supabase/functions/public-report/index.ts`：公開分享報告的 API，透過 `create_project_share_token` RPC 生成 token，查詢專案資料並回傳 JSON。支援 HEIC/HEIF 照片顯示 (透過 Supabase signed URL)。
