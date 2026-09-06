# Supabase 設定引導

本 repository 已準備初始資料庫 migration 與私有 `issue-photos` Storage bucket。完成本文件後，Supabase 專案可以承接房屋專案、樓層、問題標註、照片 metadata 與事件歷程。

> 目前網站介面仍使用瀏覽器 `localStorage`。本文件先把 Supabase 的資料庫與 Storage 基礎準備好；下一個開發步驟才會把 `IssuesContext` 改成 Supabase repository，並加入登入流程。不要在尚未整合前把 service key 放進 GitHub Pages。

## 1. 建立 Supabase 專案

前往 [Supabase Dashboard](https://supabase.com/dashboard)，建立一個新的 project。若必須維持免費，選擇 Free Plan，並記下 project region。建議專案名稱使用 `house-report`，方便與 GitHub repository 對應。

建立完成後，在 **Project Settings → API** 找到：

- **Project URL**：格式通常是 `https://<project-ref>.supabase.co`。
- **Publishable key** 或舊介面顯示的 **anon public key**：這個 key 可以放在瀏覽器端，但只能搭配正確的 RLS policy 使用。

不要複製或提交 `service_role` key。它會繞過資料庫與 Storage 的 RLS，只能留在受保護的 server-side environment。

## 2. 執行資料庫 migration

在 Supabase Dashboard 開啟 **SQL Editor → New query**，貼上並執行：

```text
supabase/migrations/20260906000000_initial_schema.sql
```

執行完成後，在 **Table Editor** 應該可以看到以下資料表：

```text
profiles
projects
project_members
floors
floorplan_assets
issues
issue_photos
issue_events
```

在 **Storage** 應該可以看到一個名為 `issue-photos` 的私有 bucket。不要把它改成 public；正式版本會以短效 signed URL 顯示照片。

## 3. 設定本機環境變數

在本機專案根目錄建立未追蹤的 `.env.local`，再填入：

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

`.env.local` 不應提交到 GitHub。只把 `VITE_SUPABASE_URL` 與 publishable／anon public key 放入前端；不要把 `service_role` key 放入任何 `VITE_` 變數。

## 4. 建議的免費方案防護設定

Supabase Free Plan 的 Storage quota 有限，因此建議在正式整合照片上傳時採用以下規則：

| 設定 | 建議值 |
|---|---:|
| 單張原始照片上限 | 8 MB |
| 允許格式 | JPEG、PNG、WebP |
| 每筆問題照片數 | 先限制 10 張 |
| 專案應用層警戒線 | 700–800 MB |
| 顯示用版本 | 先產生寬度約 1600px 的 WebP |
| Storage bucket | 私有，不使用 public URL |

上傳前應在瀏覽器壓縮照片，並在 Edge Function 或受保護的 server-side handler 再驗證 MIME type 與大小。只在 UI 限制檔案大小並不足夠。

## 5. 下一步整合順序

### 第一步：安裝 Supabase client

```bash
pnpm add @supabase/supabase-js
```

新增 `client/src/lib/supabase.ts`，從 `import.meta.env.VITE_SUPABASE_URL` 與 `import.meta.env.VITE_SUPABASE_ANON_KEY` 建立 client。不要在這個檔案讀取 service role key。

### 第二步：加入登入

先完成 Email magic link 或 OAuth 登入，登入完成後才允許讀寫 project data。未登入者可以看到靜態介紹頁，但不能讀取私有專案與照片。

### 第三步：替換 localStorage repository

保留現在的 `IssuesContext` API，將內部資料來源改成：

```text
LocalStorageIssueRepository  → 現有 fallback
SupabaseIssueRepository      → 正式資料來源
```

登入後提供一次性「匯入本機紀錄」按鈕，將現有的百分比座標轉成 0–1 normalized coordinates，再寫入 `issues`。不要在使用者確認前刪除 localStorage。

### 第四步：接上照片上傳

照片的 object path 建議遵循：

```text
projects/{project_id}/issues/{issue_id}/photos/{photo_id}.webp
```

資料庫的 `issue_photos.storage_path` 只保存 path 與 metadata。讀取照片時取得短效 signed URL；不要把 private bucket 改成 public，也不要把圖片 base64 存入 PostgreSQL。

## 6. GitHub Pages 部署注意事項

GitHub Pages 的前端只需要 public URL 與 publishable／anon public key。若之後用 GitHub Actions 建置時需要這些值，可以在 repository 的 **Settings → Secrets and variables → Actions** 加入：

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

但請注意：`VITE_` 變數會被打包進瀏覽器 JavaScript，publishable／anon key 本來就不是秘密；真正的安全邊界是 RLS。任何 service role key、資料庫密碼或 Storage 管理 key 都不能放入 GitHub Actions 的公開 build artifact，也不能放進前端。

## 7. 驗證清單

完成設定後，請確認：

- 可在 Auth 中建立測試帳號並完成登入。
- SQL Editor 中的 migration 無錯誤完成。
- `issue-photos` bucket 是 private。
- `project_members` 的 owner／editor／viewer policy 只允許預期操作。
- 非專案成員無法查詢 `projects`、`issues` 或 `issue_photos`。
- 直接貼上 Storage object URL 時無法繞過 private bucket。
- 照片單檔上限與應用層容量警戒線均已啟用。

完成上述步驟後，請把 Supabase **Project URL** 提供給下一階段整合使用；publishable／anon key 可以在本機 `.env.local` 中設定，不需要貼到對話裡。不要提供 service role key。
