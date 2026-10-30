# Floating UI & Area Info Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將日本全國隨機地圖選取器改為全螢幕地圖搭配「右側上下分離懸浮面板（抽選後自動折疊）」與「左側區域資訊懸浮面板（整合 Google Maps、Wikipedia 雙語簡介與網友照片／心得投稿區）」，並優化市町村邊界顯示與點擊適度縮放。

**Architecture:** 維持零打包 Vanilla ES6 架構。底層 `#map` 100% 滿版，上層透過 `.floating-right` 彈性容器承載可折疊的「隨機抽選設定面板」與「已選取區域清單」，左側則新增由 `js/info-panel.js` (`AreaInfoPanel`) 驅動的「區域資訊面板」，並透過單元測試驗證 URL 建立、Wikipedia 雙語標題轉換與投稿資料管理邏輯。

**Tech Stack:** HTML5, CSS3 (Glassmorphism / Flexbox), Vanilla JavaScript (ES6+), Leaflet.js 1.9.4, Wikipedia REST API, Node.js (`node:test`)

---

### Task 1: 建立 `js/info-panel.js` 核心資料與輔助函式並編寫單元測試

**Files:**
- Create: `js/info-panel.js`
- Create: `tests/info-panel.test.js`

- [x] **Step 1: 撰寫 `tests/info-panel.test.js` 單元測試**
  測試 Google Maps 搜尋連結生成、Wikipedia 候選查詢詞生成（日漢字轉繁中等）、以及社群投稿資料驗證與篩選。

- [x] **Step 2: 執行測試確認尚未實作前失敗**
  Run: `node --test tests/info-panel.test.js`

- [x] **Step 3: 實作 `js/info-panel.js`（含純函式與 `AreaInfoPanel` 類別）**
  包含：
  - `buildGoogleMapsUrls(prefecture, name)`
  - `buildWikiQueryCandidates(prefecture, name)`
  - `CommunityStore`（封裝本地儲存，預留未來 Cloudflare D1/R2 串接介面）
  - `AreaInfoPanel` UI 渲染、Wikipedia 雙語摘要抓取、Canvas 圖片壓縮、Lightbox 放大預覽。

- [x] **Step 4: 執行測試確認通過**
  Run: `node --test tests/info-panel.test.js`

---

### Task 2: 更新 `js/map.js`（保持城市邊界清晰、適度縮放 `flyToArea`、聚焦區域狀態）

**Files:**
- Modify: `js/map.js`

- [x] **Step 1: 更新 `TokyoMetroMap` 類別**
  - 新增 `this.activeId = null` 與 `onAreaFocus` callback。
  - 更新 `styleFor(feature)`：確保抽選範圍內（`weight: 1.0, color: '#3b6ea5'`）與範圍外（`weight: 0.7, color: '#27384c'`）的市町村邊界皆清晰可見；聚焦區域（`activeId`）顯示亮白邊框（`color: '#ffffff', weight: 2.5`）。
  - 更新 `flyToArea(id)`：加入 `maxZoom: 10` 與 `padding: [120, 120]`，避免放大過度，保留與周邊區域的相對位置關係。
  - 更新地圖區域點擊行為：點擊未選取區域時選取並聚焦開啟左側面板；點擊已選取區域時聚焦並開啟左側面板（同時提供 `deselectArea(id)` 供單獨移除）。

---

### Task 3: 重構 `index.html` 與 `css/style.css` 為雙側懸浮面板佈局

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`

- [x] **Step 1: 更新 `index.html` DOM 結構**
  - 將 `.main-content` 改為全螢幕地圖容器，內含：
    - `#map` 與左下 `.map-legend`
    - 左側懸浮 `#info-panel`（區域資訊區塊＋圖片 Lightbox）
    - 右側懸浮容器 `.floating-right`，拆分為：
      1. `#control-panel`（含可點擊折疊標題列 `.panel-collapse-header`、基地縣徽章、折疊按鈕，以及 `.panel-body` 篩選與抽選控制項）
      2. `#results-panel`（已選取區域清單）
  - 引入 `<script src="js/info-panel.js"></script>`。

- [x] **Step 2: 更新 `css/style.css` 樣式**
  - 實作懸浮毛玻璃卡片（`backdrop-filter: blur(12px)`、陰影與邊框）。
  - 實作 `#control-panel.collapsed` 折疊過渡效果，折疊時下方 `#results-panel` 自動往上填滿高度。
  - 實作左側 `#info-panel` 的滑入／隱藏動畫、Wikipedia 簡介卡片、Google Maps 按鈕列、網友照片牆與投稿表單樣式。

---

### Task 4: 更新 `js/main.js` 串聯自動折疊、右側卡片點擊與左側資訊面板

**Files:**
- Modify: `js/main.js`

- [x] **Step 1: 更新 `TokyoMetroApp` 邏輯**
  - 新增 `isControlCollapsed` 狀態與 `setControlCollapsed(bool)` 方法。
  - 在 `handleRandomSelect()` 抽選完成時自動呼叫 `this.setControlCollapsed(true)` 折疊隨機功能區，並在標題列顯示目前基地縣範圍。
  - 實例化 `AreaInfoPanel`，當點擊右側已選取清單卡片（或地圖區域）時，同步呼叫 `map.flyToArea(id)` 並開啟左側 `infoPanel.open(feature)`。
  - 右側區域卡片新增單筆移除按鈕 `✕` 與目前聚焦高亮 `.active` 狀態。

---

### Task 5: 執行完整驗證與測試

**Files:**
- Test: `tests/data.test.js`
- Test: `tests/info-panel.test.js`

- [x] **Step 1: 執行所有單元測試**
  Run: `node --test tests/*.test.js`
- [x] **Step 2: 啟動本地 HTTP 伺服器並驗證畫面與互動**
