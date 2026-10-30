# 日本全國隨機地圖選取器 — 懸浮面板與區域資訊區塊設計規格（Phase 1）

**日期：** 2026-10-28  
**範圍：** 前端懸浮式介面改版、地圖邊界與適度縮放優化、左側區域資訊面板（Wikipedia 自動簡介＋Google Maps 探索＋網友照片與心得本地預覽）

---

## 一、設計目標與決策摘要

| 項目 | 設計決定 |
|------|----------|
| 地圖佈局 | `#map` 100% 滿版鋪底，所有控制與資訊區塊改為懸浮毛玻璃卡片（Floating Overlay Panels） |
| 右側結構 | 採用單一右側彈性堆疊容器（`.floating-right`），內含上下兩個獨立懸浮面板：「隨機抽選控制面板（上）」與「已選取區域清單（下）」 |
| 自動折疊 | 右上「隨機抽選控制面板」支援展開／收合；按下「隨機選取」並完成抽選後**自動收合**，讓出空間給下方「已選取區域清單」 |
| 點擊縮放 | 點選已選取區域時飛至該區（`flyToBounds`），加上 `maxZoom: 10` 與 `padding: [120, 120]`，確保能看清周邊市町村與相對位置 |
| 城市邊界 | 全程保持各市町村邊界線清晰可見（範圍內 `weight: 1.0, color: '#3b6ea5'`；範圍外 `weight: 0.7, color: '#27384c'`；聚焦檢視中加亮白框） |
| 左側資訊面板 | 點選區域時於左側滑出「區域資訊區塊（`#info-panel`）」，整合 Google Maps 探索連結、Wikipedia 雙語自動簡介與網友遊玩照片／文字心得投稿區 |

---

## 二、檔案架構

維持零打包（No Build Step）的純靜態架構，新增 `js/info-panel.js` 專職處理左側區域資訊面板：

```
index.html          ← 滿版地圖 ＋ 左側懸浮資訊面板 ＋ 右側上下雙懸浮面板結構
css/style.css       ← 懸浮毛玻璃卡片樣式、折疊動畫、左側資訊面板與照片牆樣式
js/data.js          ← 既有 47 都道府縣 N03 GeoJSON 載入與合併邏輯（維持不變）
js/map.js           ← TokyoMetroMap：邊界清晰化、activeAreaId 高亮、適度縮放 flyToArea
js/info-panel.js    ← AreaInfoPanel：Wikipedia 摘要抓取、Google Maps 連結、社群照片與心得 UI（Phase 1 使用 localStorage 模擬儲存）
js/main.js          ← TokyoMetroApp：右側雙懸浮面板控制、抽選完成自動折疊、串聯地圖與左側資訊面板
tests/              ← Node.js 單元測試（data.test.js 與 info-panel.test.js）
```

---

## 三、版面與互動設計

### 1. 右側雙懸浮面板（`.floating-right`）

- **外層容器 `.floating-right`**：
  - `position: absolute; top: 14px; right: 14px; bottom: 14px; width: 350px; z-index: 500;`
  - `display: flex; flex-direction: column; gap: 12px; pointer-events: none;`（內部兩個子面板設為 `pointer-events: auto`）。
- **上方懸浮面板 `#control-panel`（隨機選取功能區）**：
  - 頂部為可點擊的收合標題列（`.panel-collapse-header`），顯示：
    - 標題：`🎲 隨機抽選設定`
    - 狀態徽章（Badge）：顯示目前基地縣（如 `東京都＋鄰縣`）或 `全日本`
    - 折疊箭頭：`▲`（展開時）/ `▼`（收合時）
  - 內容區（`.panel-body`）：包含「篩選縣市（重置按鈕＋八大地方手風琴）」與「選取數量輸入框＋隨機選取按鈕＋清除選取按鈕」。
  - **自動折疊行為**：當使用者點擊「隨機選取」（或按 `Ctrl/Cmd + R`）且抽選出的區域高亮動畫執行時，自動將 `#control-panel` 設為 `.collapsed`，收合內容區，讓下方的 `#results-panel` 自動往上延伸。
- **下方懸浮面板 `#results-panel`（已選取區域清單）**：
  - `flex: 1; min-height: 0; display: flex; flex-direction: column;`
  - 標題列顯示 `已選取 N 個區域`。
  - 列表區 `#selected-areas` 可獨立捲動；點擊任一區域卡片時：
    1. 設定該區域為目前聚焦區域（`activeAreaId`），卡片呈現 `.active` 邊框高亮。
    2. 呼叫 `map.flyToArea(id)` 進行適度縮放（`maxZoom: 10`）。
    3. 開啟左側 `#info-panel` 顯示該區域詳細資訊、Wikipedia 介紹、Google Maps 連結與網友照片心得。

### 2. 地圖邊界與縮放優化（`js/map.js`）

- **保持市町村邊界清晰（`styleFor(feature)`）**：
  - **目前聚焦檢視中（`activeAreaId === id`）**：`fillColor: '#ff6b6b', fillOpacity: 0.6, color: '#ffffff', weight: 2.5`（紅底白框突顯目前正在閱讀的區域）。
  - **已選取（`selectedIds.has(id)`）**：`fillColor: '#ff6b6b', fillOpacity: 0.48, color: '#ff8787', weight: 2.0`。
  - **抽選範圍內（未選取）**：`fillColor: '#4a90d9', fillOpacity: 0.12, color: '#3b6ea5', weight: 1.0`。
  - **抽選範圍外（未選取）**：`fillColor: '#0f172a', fillOpacity: 0.12, color: '#27384c', weight: 0.7`（保留清楚的市町村分界線，不再隱形）。
- **適度縮放（`flyToArea(id)`）**：
  - 使用 `this.map.flyToBounds(layer.getBounds(), { padding: [120, 120], maxZoom: 10, duration: 0.8 })`。
  - `maxZoom: 10` 確保即使選中面積狹小的市町村（如東京都千代田區或郡部小町），鏡頭仍保留足夠廣角以看清周邊鄰近市町村與基地縣的相對關係。
- **點擊地圖上的區域（`layer.on('click')`）**：
  - 若點擊未選取區域：加入選取並同時打開左側資訊面板。
  - 若點擊已選取區域：若尚未聚焦則切換聚焦並打開左側資訊面板；面板中也提供「取消選取此區域」按鈕，地圖卡片清單旁亦提供單筆移除按鈕 `✕`，避免看資訊時誤觸取消選取。

### 3. 左側「區域資訊區塊」懸浮面板（`#info-panel` / `js/info-panel.js`）

- **定位與尺寸**：
  - `position: absolute; top: 14px; left: 14px; bottom: 52px; width: 370px; z-index: 500;`
  - 預設收合隱藏（`.hidden` 往左滑出並透明），點選區域後滑入顯示。
- **面板四大內容區塊**：
  1. **頂部標題列**：
     - 顯示都道府縣彩色徽章、行政區類型（市／區／町／村）、區域名稱（大字粗體）、關閉面板按鈕 `✕`。
  2. **Google Maps 探索列**：
     - 三顆快速探索按鈕（皆以 `target="_blank" rel="noopener"` 開啟 Google Maps）：
       - `📍 地圖位置`：`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(prefecture + name)}`
       - `⛩️ 熱門景點`：`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(prefecture + name + ' 観光スポット')}`
       - `🍜 在地美食`：`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(prefecture + name + ' グルメ')}`
  3. **行政區文字簡介（Wikipedia 自動載入＋快取）**：
     - 透過 `fetchWikiSummary(prefecture, name)` 查詢維基百科 REST API：
       - 先嘗試中文維基 `https://zh.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`（支援自動嘗試「縣市＋區域名」或「區域名」）。
       - 若 404，自動 fallback 至日文維基 `https://ja.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`。
     - 若有代表圖片（`thumbnail.source`）則顯示縮圖，下方顯示文字摘要（`extract`）與「閱讀維基百科全文 ↗」連結。
     - 內建記憶體 `Map` 快取，同一區域重複點選不重複發送請求。
  4. **網友遊玩照片與文字心得區（Community Posts）**：
     - 顯示該市町村的投稿列表（每則包含：選填照片縮圖、投稿者暱稱、造訪日期、心得文字；點擊照片可開啟全螢幕 Lightbox 預覽）。
     - **「＋ 投稿照片／遊玩心得」表單**：
       - 支援上傳圖片（前端使用 `<canvas>` 自動將圖片長邊壓縮至最大 `1200px`、輸出 `image/webp` 或 `image/jpeg` 品質 `0.8`）＋填寫暱稱＋填寫文字心得（單純分享文字或附照片皆可）。
       - Phase 1 儲存於 `localStorage`（Key: `tokyofun_community_posts_v1`），並預留乾淨的 `PhotoStorageAdapter` 介面，Phase 2 可直接替換為 Cloudflare Pages Functions (`/api/posts`) + D1 + R2。

---

## 四、響應式設計（Mobile `< 768px`）

- 手機版地圖維持全螢幕，懸浮面板改為適應窄螢幕寬度（`left: 10px; right: 10px; width: auto`），左側資訊面板開啟時以底部或滿版抽屜形式覆蓋於最上層（`z-index: 550`），關閉後即可操作右側抽選與清單面板。
