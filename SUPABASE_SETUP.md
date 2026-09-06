# Supabase 設定引導

本 repository 已準備初始資料庫 migration、私有 `issue-photos` Storage bucket 與公開報告分享的基礎 schema。管理者登入後可編輯與上傳；訪客持有分享連結即可免登入閱讀整份報告。

> 目前網站介面仍使用瀏覽器 `localStorage`。本文件先把 Supabase 的資料庫與 Storage 基礎準備好；下一個開發步驟才會把 `IssuesContext` 改成 Supabase repository，並加入登入流程。不要在尚未整合前把 service key 放進 GitHub Pages。

## 1. 建立 Supabase 專案

前往 [Supabase Dashboard](https://supabase.com/dashboard)，建立一個新的 project。若必須維持免費，選擇 Free Plan，並記下 project region。建議專案名稱使用 `floorplan-issue-marker`，方便與 GitHub repository 對應。

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

在 **Storage** 應該可以看到兩個 private bucket：`issue-photos` 用於現場照片，`floorplan-assets` 用於平面圖。不要把它們改成 public；公開報告會以短效 signed URL 顯示圖片。

## 3. 管理者登入與公開分享

在 **Authentication → Providers** 開啟 **Email**。管理者使用 Email magic link 登入，不需要在網站建立或保存密碼。

公開分享不是把整個資料庫或 bucket 設成 public。管理者建立一組不可猜測的分享 token，資料庫只保存 token 的 SHA-256 hash；訪客使用下列形式的連結查看整份報告：

```text
https://<github-pages-domain>/share/<token>
```

分享頁只允許讀取，不顯示編輯、刪除或上傳功能。管理者停用分享後，舊連結立即失效。任何取得連結的人都能查看該報告與所有照片，因此不要把連結放在不希望公開的地方。

## 4. 設定本機環境變數

在本機專案根目錄建立未追蹤的 `.env.local`，再填入：

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

`.env.local` 不應提交到 GitHub。只把 `VITE_SUPABASE_URL` 與 publishable／anon public key 放入前端；不要把 `service_role` key 放入任何 `VITE_` 變數。

## 5. 建議的免費方案防護設定

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

## 6. 下一步整合順序

### 第一步：安裝 Supabase client

```bash
pnpm add @supabase/supabase-js
```

新增 `client/src/lib/supabase.ts`，從 `import.meta.env.VITE_SUPABASE_URL` 與 `import.meta.env.VITE_SUPABASE_ANON_KEY` 建立 client。不要在這個檔案讀取 service role key。

### 第二步：加入登入

先完成 Email magic link 登入。登入後允許管理者讀寫自己的 project data；未登入者不進入管理頁，只能透過有效的公開分享 token 查看整份報告。

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

## 7. 公開報告 Edge Function

`supabase/functions/public-report/index.ts` 是公開分享的 server-side 範本。它使用 Supabase service role key 查詢有效 token、組合整份報告，並為私有照片產生 1 小時有效的 signed URL。service role key 只能留在 Supabase Edge Function 的 server-side secrets，絕不能放進 GitHub Pages 或前端 JavaScript。

部署前，請在 Supabase CLI 登入並連結 project，然後部署 function：

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy public-report --no-verify-jwt
```

部署後，公開 endpoint 會類似：

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/public-report?token=YOUR_SHARE_TOKEN
```

前端公開頁會呼叫這個 endpoint，而不是直接讓訪客查詢資料表。建立、更新與撤銷分享 token 的操作則必須由已登入的管理者執行。

## 8. GitHub Pages 部署注意事項

GitHub Pages 的前端只需要 public URL 與 publishable／anon public key。若之後用 GitHub Actions 建置時需要這些值，可以在 repository 的 **Settings → Secrets and variables → Actions** 加入：

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

但請注意：`VITE_` 變數會被打包進瀏覽器 JavaScript，publishable／anon key 本來就不是秘密；真正的安全邊界是 RLS。任何 service role key、資料庫密碼或 Storage 管理 key 都不能放入 GitHub Actions 的公開 build artifact，也不能放進前端。

## 9. 驗證清單

完成設定後，請確認：

- 可在 Auth 中寄出 magic link，點擊後完成管理者登入。
- SQL Editor 中的 migration 無錯誤完成。
- `issue-photos` 與 `floorplan-assets` bucket 都是 private。
- `project_members` 的 owner／editor／viewer policy 只允許預期操作。
- 非專案成員無法查詢 `projects`、`issues` 或 `issue_photos`。
- 直接貼上 Storage object URL 時無法繞過 private bucket。
- 照片單檔上限與應用層容量警戒線均已啟用。
- 有效分享 token 可以免登入讀取整份報告與照片。
- 錯誤或已撤銷的 token 回傳無效分享連結，不洩漏報告資料。
- 公開頁沒有任何建立、修改、刪除或上傳操作。

完成上述步驟後，請把 Supabase **Project URL** 提供給下一階段整合使用；publishable／anon key 可以在本機 `.env.local` 中設定，不需要貼到對話裡。不要提供 service role key。
