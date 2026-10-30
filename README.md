# 日本全國隨機地圖選取器 (TokyoFun v1.0)

一個互動式的日本探索與旅遊選取網頁應用程式，支援全日本 47 都道府縣行政區隨機抽選、基地縣＋鄰縣模式、維基百科與 Google Maps 探索，以及社群照片／遊記分享。

---

## ✨ 核心特色

### 1. 🗺️ 地理範圍與智慧篩選
- **全國 47 都道府縣覆蓋**：基於日本國土數值情報（N03）行政區劃資料。
- **基地縣 ＋ 鄰縣模式**：點選任一縣市（如東京都、大阪府）作為旅行基地，自動將抽選範圍設為該基地縣與所有陸路接壤相鄰縣市。
- **熱門基地快捷鍵**：頂部提供東京都、大阪府、京都府、北海道、福岡縣等一鍵切換。
- **靈活抽選條件**：
  - 「✓ 包含基地縣 / ✕ 僅抽鄰縣」切換（適合住在東京、想抽周邊外縣市一日遊的使用情境）。
  - 「✕ 排除偏遠離島 / ✓ 包含偏遠離島」切換（預設排除東京小笠原／伊豆諸島等遠洋離島，避免地圖縮放失真）。

### 2. 🎰 輪盤跳動鎖定動畫
- 點擊「隨機選取」後，自動收合控制面板並對齊視角。
- 地圖候選區域以亮金色光暈高速跳動並隨三次曲線平滑減速，逐一鎖定為紅色高亮區域，儀式感十足。

### 3. 🎨 視覺美學與細節
- **🌸 和風旅遊誌（淺色） / 🌙 深色微光**：頂部提供一鍵主題切換，自動切換 CartoDB Voyager 淺色旅遊底圖與 Dark 底圖。
- **都道府縣界與浮水印**：基地縣（琥珀金邊界與徽章）置頂繪製，鄰縣清晰區隔，範圍外縣市完全隱藏不干擾。
- **無交叉指示輔助虛線**：右側已選區域自動由北向南排序，以優雅的紅色弧形虛線連接地圖實際位置。
- **特別保留地**：特別收錄並介紹東京灣「千葉縣所屬未定地（三番瀨人工海濱）」。

### 4. 📷 區域資訊區塊與社群照片（Cloudflare 全家桶）
- 點擊任一已選取區域或地圖市町村，左側展開資訊面板：
  - **Google Maps 探索**：一鍵開啟位置、熱門景點、在地美食搜尋。
  - **Wikipedia 雙語簡介**：自動抓取繁體中文與日文維基百科摘要與照片。
  - **網友遊玩照片牆**：瀏覽照片（支援 Lightbox 全螢幕）與旅遊心得；支援前端 Canvas 自動壓縮上傳。
- **零依賴雙模儲存**：本地靜態伺服器自動使用 `localStorage`；部署於 Cloudflare Pages 時自動無縫啟用 D1 SQLite 資料庫與 R2 雲端圖床。

---

## 🛠️ 本地運行與開發

```bash
# 本地純靜態預覽（自動使用 localStorage）
python3 -m http.server 8000
# 瀏覽 http://localhost:8000

# 執行單元測試
node --test tests/data.test.js tests/info-panel.test.js

# 本地模擬 Cloudflare D1 + R2（選用）
npx wrangler d1 execute tokyofun-db --local --file=schema.sql
npx wrangler pages dev .
```

---

## ☁️ 部署至 Cloudflare Pages

```bash
# 1. 登入 Cloudflare
npx wrangler login

# 2. 建立 R2 儲存桶與 D1 資料庫
npx wrangler r2 bucket create tokyofun-photos
npx wrangler d1 create tokyofun-db
# 將印出的 database_id 填入 wrangler.toml

# 3. 初始化 D1 資料表
npx wrangler d1 execute tokyofun-db --remote --file=schema.sql

# 4. 部署上線
npx wrangler pages deploy . --project-name=tokyofun
```
