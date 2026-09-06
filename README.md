# SITE / TRACE — 房屋問題標註簿

一個以平面圖為工作面的房屋檢查工具。使用者可以在 1F、2F、3F 平面圖上新增問題標註，為每筆問題設定樓層、位置、優先級與處理狀態，再進入對應紀錄頁查看圖面位置、編輯描述及加入現場照片。

## 已完成的功能

- 以提供的房屋平面圖作為主要圖面。
- 以樓層、關鍵字與處理狀態整理問題索引。
- 點擊銅色定位釘或索引卡片查看問題紀錄。
- 在圖面任意位置新增問題標註。
- 在問題頁更新「待處理／處理中／已完成」與優先級。
- 從本機選擇現場照片，或加入公開照片網址。
- 以瀏覽器 `localStorage` 保存標註與照片。
- 已加入 GitHub Actions workflow，自動建置並發布 GitHub Pages。
- 具備手機版響應式版面與鍵盤焦點樣式。

## 重要的資料保存限制

這是一個純前端靜態網站，沒有後端資料庫。標註與照片會保存於**目前使用的瀏覽器**，因此適合作為個人或單一裝置的工作簿；如果不同人或不同裝置需要共享同一份資料，需要後續接上資料庫與檔案儲存服務。照片若以本機檔案加入，會以 data URL 保存在瀏覽器中，請避免上傳過大的檔案。

## 本機開發

```bash
pnpm install
pnpm dev
```

正式建置：

```bash
pnpm build
```

## 發布到 GitHub Pages

1. 將此專案推送到 GitHub repository 的 `main` 分支。
2. 在 GitHub repository 的 **Settings → Pages → Build and deployment** 選擇 **GitHub Actions**。
3. 之後每次推送到 `main`，`.github/workflows/deploy-pages.yml` 會自動建置並發布。
4. workflow 會把 `index.html` 複製為 `404.html`，支援 GitHub Pages 上的 React 子路徑導覽。

Vite 的 `VITE_BASE_PATH` 會依 repository 名稱自動設定，適用於 `https://帳號.github.io/repository-name/` 形式的 GitHub Pages 網址。

## 設計方向

網站採用 **Field Notes / 現場勘查筆記**：DM Serif Display 與 IBM Plex Sans 建立編輯層次，暖白紙張、墨黑圖面與 Surveyor Copper `#C66A3D` 建立問題定位和現場紀錄的視覺語言。
