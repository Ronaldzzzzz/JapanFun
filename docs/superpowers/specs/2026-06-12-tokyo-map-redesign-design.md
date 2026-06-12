# 東京首都圈選取器 — 重新設計規格

**日期：** 2026-06-12  
**範圍：** 純前端靜態網頁，無 build 工具

---

## 設計決策摘要

| 項目 | 決定 |
|------|------|
| 視覺風格 | 暗色科技風（深色背景、霓虹藍／紅） |
| 版面配置 | 側邊欄佈局（地圖左 65%，側欄右 35%） |
| 地圖數據 | 從公開 CDN 動態 fetch 真實 GeoJSON 行政區邊界 |
| 側邊欄功能 | 統計增強版（縣市篩選、合計人口／面積、結果卡片） |
| 選取呈現 | 真實行政區邊界輪廓高亮＋發光效果 |

---

## 一、架構

保持零 build 工具的靜態網頁架構，三支 JS 檔案保留但重構職責：

```
index.html          ← 頁面結構（側邊欄佈局）
css/style.css       ← 完整暗色主題重寫（CSS 變數）
js/data.js          ← 非同步資料層：fetch 真實 GeoJSON、合併五縣資料
js/map.js           ← TokyoMetroMap：Leaflet 地圖、邊界渲染、選取高亮
js/main.js          ← TokyoMetroApp：UI 事件、篩選邏輯、統計計算
```

載入順序：`data.js` → `map.js` → `main.js`（維持現有 `<script>` 標籤順序）。

---

## 二、資料層（js/data.js）

### GeoJSON 來源

從日本國立情報學研究所 geoshape API 或同等公開源動態 fetch 五縣行政區 GeoJSON：

- 東京都（13）
- 神奈川縣（14）
- 埼玉縣（11）
- 千葉縣（12）
- 山梨縣（19）

實作時需驗證可用端點（geoshape.ex.nii.ac.jp 或 GitHub raw 備援）。每支 GeoJSON 的 Feature `properties` 需包含：`name`、`prefecture`、`type`、`population`、`area_km2`。若原始資料缺少 `population` / `area_km2`，以合理靜態值補齊。

### 介面

```js
// 全域 Promise，map.js 等待此 Promise resolve 後才初始化地圖
window.tokyoMetroDataPromise = loadTokyoMetroData();
// resolve 為標準 GeoJSON FeatureCollection（坐標已為 [lng, lat]）
```

### 載入狀態

資料載入中顯示覆蓋在地圖上的 loading spinner（暗色半透明背景＋旋轉圓圈），載入完成後淡出移除。fetch 失敗時顯示錯誤提示並提供重試按鈕。

---

## 三、視覺設計（css/style.css）

### CSS 變數

```css
--bg-primary:    #080c14;
--bg-secondary:  #0d1117;
--bg-card:       #111827;
--border-subtle: #1e2d3d;
--border-accent: #2d4a7a;
--text-primary:  #e2e8f0;
--text-secondary:#94a3b8;
--text-muted:    #4a5568;
--accent-blue:   #74b9ff;
--accent-red:    #ff6b6b;
--btn-primary:   #3b82f6;
```

### 縣市顏色對應

| 縣市 | 邊界色 | 填充色（未選） | 高亮色（已選） |
|------|--------|----------------|----------------|
| 東京都 | `#74b9ff` | `#74b9ff18` | `#ff6b6b` + glow |
| 神奈川縣 | `#fd79a8` | `#fd79a812` | `#ff6b6b` + glow |
| 埼玉縣 | `#55a3ff` | `#55a3ff10` | `#ff6b6b` + glow |
| 千葉縣 | `#00b894` | `#00b89410` | `#ff6b6b` + glow |
| 山梨縣 | `#fdcb6e` | `#fdcb6e10` | `#ff6b6b` + glow |

所有已選取區域統一使用紅色高亮（`#ff6b6b`），透過與未選取縣市顏色的對比凸顯選取狀態。

### 版面結構

```
body
└── .app-container (height: 100vh, flex-column)
    ├── .navbar (固定高度 44px)
    └── .main-content (flex-row, flex: 1)
        ├── #map (flex: 1.7, 約 65%)
        └── .sidebar (width: 280px, flex-column, overflow-y: auto)
```

手機斷點（`< 768px`）：側欄折疊至底部抽屜，地圖全寬。

---

## 四、地圖（js/map.js）

### Leaflet 底圖

使用 CartoDB Dark Matter 底圖取代 OpenStreetMap 預設：
```
https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png
```
備援保留原本的 OpenStreetMap。

### 邊界渲染

`L.geoJSON()` 渲染時依 `feature.properties.prefecture` 套用縣市顏色。未選取區域 `fillOpacity: 0.15`、`weight: 1.5`；hover 時 `fillOpacity: 0.35`、`weight: 2.5`。

### 選取高亮

已選取區域：
- `fillColor: #ff6b6b`、`fillOpacity: 0.45`、`color: #ff6b6b`、`weight: 2.5`
- 使用 Leaflet 的 SVG renderer，透過 CSS class `.selected-area` 套用 `filter: drop-shadow(0 0 8px #ff6b6b)`

### Hover Tooltip

滑鼠懸停顯示暗色浮動卡片：
```
區域名稱（粗體）
縣市｜類型
人口：xxx,xxx
面積：xx.x km²
```
已選取狀態時 tooltip 頂部顯示紅色「● 已選取」標記。

### 選取動畫

隨機選取時依序以 100ms 間隔逐一高亮各區域（而非瞬間全部出現），最後 `fitBounds` 縮放至所有選取區域。

---

## 五、側邊欄（js/main.js）

### 結構（由上至下）

1. **縣市篩選 chip 列**：「全部」+ 五縣市。點選後僅從該縣市的區域中隨機選取（不影響地圖顯示，只影響隨機池）。active chip 使用 `var(--btn-primary)` 邊框與背景。

2. **選取控制區**：
   - 數字輸入框（1–50）
   - 「隨機選取」主按鈕（藍色漸層，hover 稍亮）
   - 「清除選取」次按鈕（暗色 ghost）

3. **統計卡片**（2×1 grid）：
   - 合計人口（選取區域加總，以 M/K 縮寫格式）
   - 合計面積（km²）
   - 未選取時顯示 `—`

4. **結果列表**（`overflow-y: auto`，可捲動）：
   - 每張卡片左側有 3px 縣市色條
   - 卡片顯示：區域名稱（粗體）、縣市 badge、人口、面積
   - 點選卡片可在地圖上 flyTo 該區域並 pulse 高亮

### 鍵盤快捷鍵（維持現有）

- `Ctrl/Cmd + R`：隨機選取
- `Ctrl/Cmd + Shift + C`：清除選取（原 `Ctrl+C` 與瀏覽器複製衝突，改為三鍵）

---

## 六、不在此次範圍內

- CSV 匯出
- 分布長條圖
- 離線 / PWA
- 後端 / 資料庫
- 動畫以外的特效（粒子、3D）

---

## 七、成功標準

1. 地圖以真實行政區邊界多邊形顯示（非矩形近似）
2. 選取後邊界正確高亮發光，視覺可清楚辨識
3. 側邊欄顯示正確的合計人口與面積
4. 縣市篩選 chip 能限制隨機選取範圍
5. 頁面在 Chrome / Firefox / Safari 現代版本正確顯示
6. 手機（375px）可用（側欄折疊）
