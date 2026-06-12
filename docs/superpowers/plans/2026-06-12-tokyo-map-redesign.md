# 東京首都圈選取器重新設計 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將現有矩形示意地圖改造為使用真實行政區邊界的暗色科技風隨機選取器，含側邊欄統計功能。

**Architecture:** 保持零 build 工具的純靜態網頁。`data.js` 改為非同步資料層，從 GitHub raw CDN fetch 五縣的真實市區町村 GeoJSON（國土數值情報 N03，s0010 簡化版，合計約 645KB），政令指定都市的區合併為市。`map.js` 負責 Leaflet 渲染與選取高亮，`main.js` 負責側邊欄 UI 與統計。

**Tech Stack:** Vanilla JS (ES6+)、Leaflet 1.9.4（CDN）、CartoDB Dark Matter 底圖、Node.js 內建 test runner（僅測試純函數）。

**Spec:** `docs/superpowers/specs/2026-06-12-tokyo-map-redesign-design.md`

---

## 已驗證的資料源（2026-06-12 確認可用）

```
https://raw.githubusercontent.com/smartnews-smri/japan-topography/main/data/municipality/geojson/s0010/N03-21_{code}_210101.json
```

| 縣 | code | 大小 |
|----|------|------|
| 埼玉県 | 11 | 77KB |
| 千葉県 | 12 | 135KB |
| 東京都 | 13 | 254KB |
| 神奈川県 | 14 | 120KB |
| 山梨県 | 19 | 58KB |

Feature properties 範例：`{"N03_001":"東京都","N03_002":null,"N03_003":null,"N03_004":"千代田区","N03_007":"13101"}`

- `N03_001` = 縣名（注意：資料使用日文「県」，如 `神奈川県`，不是中文「縣」）
- `N03_003` = 政令指定都市名（如 `横浜市`）或郡名（如 `秩父郡`），可為 null
- `N03_004` = 市區町村名
- 坐標已是標準 GeoJSON `[lng, lat]` 順序——舊版的 `normalizeGeoJsonCoordinates` 修正邏輯將被刪除

**合併規則：** 當 `N03_003` 非空且以 `市` 結尾（政令指定都市：横浜市、川崎市、相模原市、さいたま市、千葉市），該 feature 歸入市單位；否則以 `N03_004` 為單位。東京 23 區是特別區（`N03_003` 為 null），維持獨立。唯一鍵 `id` = `N03_001 + 單位名`（如 `東京都新宿区`），避免跨縣同名衝突。

---

## File Structure

| 檔案 | 動作 | 職責 |
|------|------|------|
| `js/population-data.js` | 新建 | 靜態人口對照表（近似值），全域 `POPULATION_DATA` |
| `js/data.js` | 重寫 | fetch + 轉換 GeoJSON 的純函數與載入器，全域 `tokyoMetroDataPromise` |
| `js/map.js` | 重寫 | `TokyoMetroMap`：Leaflet 地圖、邊界渲染、選取高亮、tooltip |
| `js/main.js` | 重寫 | `TokyoMetroApp`：chips、控制、統計、結果卡片、快捷鍵 |
| `index.html` | 重寫 | navbar + 地圖 + 側邊欄結構 |
| `css/style.css` | 重寫 | 暗色主題（CSS 變數） |
| `tests/data.test.js` | 新建 | 純函數的 node:test 測試 |
| `README.md` / `CLAUDE.md` | 修改 | 反映新架構 |

腳本載入順序：leaflet → `population-data.js` → `data.js` → `map.js` → `main.js`。

---

### Task 1: Git 初始化與基線提交

本專案目前**不是 git repo**。

**Files:** 無程式碼變更。

- [ ] **Step 1: 初始化 repo 並提交現狀**

```bash
cd "D:/Code/TokyoFun"
git init
git add -A
git commit -m "chore: baseline before dark-theme redesign

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

- [ ] **Step 2: 建立 .gitignore 並提交**

建立 `D:/Code/TokyoFun/.gitignore`：

```
.superpowers/
```

```bash
git add .gitignore
git commit -m "chore: add .gitignore

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: 人口資料表（js/population-data.js）

**Files:**
- Create: `js/population-data.js`

人口為 2020 年國勢調查的近似值（本 app 為趣味用途，README 已註明為近似值）。鍵名必須與 GeoJSON 的日文名稱完全一致（使用日文漢字「区」，全形片假名如 `鎌ケ谷市` 的大「ケ」）。查無對應時程式 fallback 為 `null`（顯示 N/A、不計入合計），所以個別鍵名不符不會造成錯誤。

- [ ] **Step 1: 建立 js/population-data.js**

```javascript
// 人口資料（2020 年國勢調查近似值，單位：人）
// 鍵名須與國土數值情報 N03 的市區町村名一致；查無時顯示 N/A
const POPULATION_DATA = {
    // 東京都 23 特別區
    "千代田区": 67000, "中央区": 169000, "港区": 260000, "新宿区": 349000,
    "文京区": 240000, "台東区": 211000, "墨田区": 272000, "江東区": 524000,
    "品川区": 422000, "目黒区": 288000, "大田区": 748000, "世田谷区": 943000,
    "渋谷区": 243000, "中野区": 344000, "杉並区": 591000, "豊島区": 301000,
    "北区": 355000, "荒川区": 217000, "板橋区": 584000, "練馬区": 752000,
    "足立区": 695000, "葛飾区": 453000, "江戸川区": 697000,
    // 東京都 市部
    "八王子市": 579000, "立川市": 185000, "武蔵野市": 150000, "三鷹市": 195000,
    "青梅市": 133000, "府中市": 262000, "昭島市": 114000, "調布市": 242000,
    "町田市": 431000, "小金井市": 125000, "小平市": 198000, "日野市": 190000,
    "東村山市": 151000, "国分寺市": 129000, "国立市": 77000, "福生市": 57000,
    "狛江市": 84000, "東大和市": 85000, "清瀬市": 76000, "東久留米市": 117000,
    "武蔵村山市": 71000, "多摩市": 148000, "稲城市": 93000, "羽村市": 54000,
    "あきる野市": 80000, "西東京市": 207000,
    // 東京都 町村（含島嶼）
    "瑞穂町": 33000, "日の出町": 17000, "檜原村": 2000, "奥多摩町": 5000,
    "大島町": 7000, "利島村": 300, "新島村": 2700, "神津島村": 1900,
    "三宅村": 2400, "御蔵島村": 300, "八丈町": 7000, "青ヶ島村": 170,
    "小笠原村": 2600,
    // 神奈川県（政令市以合併後的市為單位）
    "横浜市": 3777000, "川崎市": 1538000, "相模原市": 725000,
    "横須賀市": 388000, "平塚市": 258000, "鎌倉市": 173000, "藤沢市": 436000,
    "小田原市": 189000, "茅ヶ崎市": 242000, "逗子市": 57000, "三浦市": 42000,
    "秦野市": 161000, "厚木市": 224000, "大和市": 239000, "伊勢原市": 102000,
    "海老名市": 137000, "座間市": 132000, "南足柄市": 40000, "綾瀬市": 84000,
    "葉山町": 33000, "寒川町": 48000, "大磯町": 31000, "二宮町": 27000,
    "中井町": 9000, "大井町": 17000, "松田町": 10000, "山北町": 9500,
    "開成町": 18000, "箱根町": 11000, "真鶴町": 6700, "湯河原町": 23000,
    "愛川町": 39000, "清川村": 2800,
    // 埼玉県
    "さいたま市": 1324000, "川越市": 354000, "熊谷市": 194000, "川口市": 594000,
    "行田市": 78000, "秩父市": 59000, "所沢市": 342000, "飯能市": 79000,
    "加須市": 112000, "本庄市": 78000, "東松山市": 91000, "春日部市": 230000,
    "狭山市": 149000, "羽生市": 53000, "鴻巣市": 117000, "深谷市": 141000,
    "上尾市": 226000, "草加市": 250000, "越谷市": 345000, "蕨市": 75000,
    "戸田市": 142000, "入間市": 145000, "朝霞市": 144000, "志木市": 76000,
    "和光市": 84000, "新座市": 166000, "桶川市": 74000, "久喜市": 150000,
    "北本市": 65000, "八潮市": 93000, "富士見市": 112000, "三郷市": 142000,
    "蓮田市": 61000, "坂戸市": 100000, "幸手市": 50000, "鶴ヶ島市": 70000,
    "日高市": 55000, "吉川市": 72000, "ふじみ野市": 114000, "白岡市": 52000,
    "伊奈町": 45000, "三芳町": 38000, "毛呂山町": 32000, "越生町": 11000,
    "滑川町": 20000, "嵐山町": 17000, "小川町": 28000, "川島町": 19000,
    "吉見町": 18000, "鳩山町": 13000, "ときがわ町": 10000, "横瀬町": 8000,
    "皆野町": 9000, "長瀞町": 6700, "小鹿野町": 10000, "東秩父村": 2700,
    "美里町": 11000, "神川町": 13000, "上里町": 30000, "寄居町": 32000,
    "宮代町": 34000, "杉戸町": 44000, "松伏町": 28000,
    // 千葉県
    "千葉市": 975000, "銚子市": 58000, "市川市": 492000, "船橋市": 644000,
    "館山市": 45000, "木更津市": 136000, "松戸市": 498000, "野田市": 154000,
    "茂原市": 86000, "成田市": 132000, "佐倉市": 169000, "東金市": 58000,
    "旭市": 63000, "習志野市": 176000, "柏市": 427000, "勝浦市": 16000,
    "市原市": 270000, "流山市": 200000, "八千代市": 200000, "我孫子市": 131000,
    "鴨川市": 32000, "鎌ケ谷市": 110000, "君津市": 82000, "富津市": 42000,
    "浦安市": 171000, "四街道市": 95000, "袖ケ浦市": 64000, "八街市": 67000,
    "印西市": 102000, "白井市": 62000, "富里市": 49000, "南房総市": 35000,
    "匝瑳市": 35000, "香取市": 72000, "山武市": 48000, "いすみ市": 36000,
    "大網白里市": 48000,
    "酒々井町": 20000, "栄町": 20000, "神崎町": 5800, "多古町": 14000,
    "東庄町": 13000, "九十九里町": 15000, "芝山町": 6800, "横芝光町": 22000,
    "一宮町": 12000, "睦沢町": 6700, "長生村": 14000, "白子町": 10000,
    "長柄町": 6600, "長南町": 7500, "大多喜町": 8700, "御宿町": 7000,
    "鋸南町": 6700,
    // 山梨県
    "甲府市": 189000, "富士吉田市": 46000, "都留市": 30000, "山梨市": 33000,
    "大月市": 22000, "韮崎市": 29000, "南アルプス市": 69000, "北杜市": 44000,
    "甲斐市": 75000, "笛吹市": 66000, "上野原市": 22000, "甲州市": 29000,
    "中央市": 31000,
    "市川三郷町": 14000, "早川町": 1000, "身延町": 10000, "南部町": 7000,
    "富士川町": 14000, "昭和町": 20000, "道志村": 1600, "西桂町": 4000,
    "忍野村": 9700, "山中湖村": 5800, "鳴沢村": 3000, "富士河口湖町": 26000,
    "小菅村": 700, "丹波山村": 500
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { POPULATION_DATA };
}
```

注意：山梨県的 `中央市`（市）與東京都的 `中央区`（區）是不同鍵，無衝突。埼玉市與千葉市的「中央区」等政令市轄區會被合併進市單位，不會查表。

- [ ] **Step 2: 用 Node 驗證語法與鍵數**

```bash
cd "D:/Code/TokyoFun"
node -e "const {POPULATION_DATA}=require('./js/population-data.js'); console.log('keys:', Object.keys(POPULATION_DATA).length)"
```

Expected: `keys:` 約 230–240，無語法錯誤。

- [ ] **Step 3: Commit**

```bash
git add js/population-data.js
git commit -m "feat: add static population lookup table

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: 資料層（js/data.js）— TDD

**Files:**
- Test: `tests/data.test.js`（新建）
- Modify: `js/data.js`（完全重寫，舊內容全部刪除）

純函數（轉換、合併、面積計算）以 node:test 測試；fetch 載入器只在瀏覽器執行，由 Task 8 手動驗證。

- [ ] **Step 1: 寫失敗測試 tests/data.test.js**

```javascript
const test = require('node:test');
const assert = require('node:assert');
const {
    getUnitName,
    deriveType,
    mergePolygonCoordinates,
    multiPolygonAreaKm2,
    transformPrefectureData
} = require('../js/data.js');

test('getUnitName：政令市轄區歸入市', () => {
    assert.equal(getUnitName({ N03_003: '横浜市', N03_004: '青葉区' }), '横浜市');
});

test('getUnitName：特別區維持獨立', () => {
    assert.equal(getUnitName({ N03_003: null, N03_004: '新宿区' }), '新宿区');
});

test('getUnitName：郡轄町村以町村為單位', () => {
    assert.equal(getUnitName({ N03_003: '秩父郡', N03_004: '横瀬町' }), '横瀬町');
});

test('deriveType：依名稱結尾判斷類型', () => {
    assert.equal(deriveType('新宿区'), '區');
    assert.equal(deriveType('横浜市'), '市');
    assert.equal(deriveType('箱根町'), '町');
    assert.equal(deriveType('檜原村'), '村');
});

test('mergePolygonCoordinates：Polygon 與 MultiPolygon 攤平合併', () => {
    const ringA = [[0, 0], [1, 0], [1, 1], [0, 0]];
    const ringB = [[2, 2], [3, 2], [3, 3], [2, 2]];
    const ringC = [[4, 4], [5, 4], [5, 5], [4, 4]];
    const merged = mergePolygonCoordinates([
        { type: 'Polygon', coordinates: [ringA] },
        { type: 'MultiPolygon', coordinates: [[ringB], [ringC]] }
    ]);
    assert.equal(merged.length, 3);
    assert.deepEqual(merged[0], [ringA]);
});

test('multiPolygonAreaKm2：赤道附近 0.1°×0.1° 正方形約 123 km²', () => {
    const square = [[[[0, 0], [0.1, 0], [0.1, 0.1], [0, 0.1], [0, 0]]]];
    const area = multiPolygonAreaKm2(square);
    assert.ok(area > 118 && area < 128, `got ${area}`);
});

test('transformPrefectureData：分組、合併、屬性補齊', () => {
    const ring1 = [[139.5, 35.4], [139.6, 35.4], [139.6, 35.5], [139.5, 35.4]];
    const ring2 = [[139.6, 35.4], [139.7, 35.4], [139.7, 35.5], [139.6, 35.4]];
    const ring3 = [[139.7, 35.69], [139.72, 35.69], [139.72, 35.71], [139.7, 35.69]];
    const raw = {
        type: 'FeatureCollection',
        features: [
            { type: 'Feature', properties: { N03_001: '神奈川県', N03_003: '横浜市', N03_004: '青葉区', N03_007: '14117' }, geometry: { type: 'Polygon', coordinates: [ring1] } },
            { type: 'Feature', properties: { N03_001: '神奈川県', N03_003: '横浜市', N03_004: '港北区', N03_007: '14109' }, geometry: { type: 'Polygon', coordinates: [ring2] } },
            { type: 'Feature', properties: { N03_001: '東京都', N03_003: null, N03_004: '新宿区', N03_007: '13104' }, geometry: { type: 'Polygon', coordinates: [ring3] } },
            { type: 'Feature', properties: { N03_001: '東京都', N03_003: null, N03_004: null, N03_007: null }, geometry: { type: 'Polygon', coordinates: [ring3] } }
        ]
    };
    const features = transformPrefectureData(raw, { '横浜市': 3777000 });

    assert.equal(features.length, 2); // 橫濱兩區合併為一、新宿一個、無名 feature 被跳過

    const yokohama = features.find((f) => f.properties.name === '横浜市');
    assert.equal(yokohama.properties.id, '神奈川県横浜市');
    assert.equal(yokohama.properties.prefecture, '神奈川県');
    assert.equal(yokohama.properties.type, '市');
    assert.equal(yokohama.properties.population, 3777000);
    assert.equal(yokohama.geometry.type, 'MultiPolygon');
    assert.equal(yokohama.geometry.coordinates.length, 2);
    assert.ok(yokohama.properties.area_km2 > 0);

    const shinjuku = features.find((f) => f.properties.name === '新宿区');
    assert.equal(shinjuku.properties.population, null); // 查無人口 → null
});
```

- [ ] **Step 2: 執行測試，確認失敗**

```bash
cd "D:/Code/TokyoFun"
node --test tests/
```

Expected: FAIL —— `data.js` 目前沒有 `module.exports`，require 取得的函數為 undefined。

- [ ] **Step 3: 完全重寫 js/data.js**

刪除舊檔全部內容（含 `tokyoMetroData` 靜態資料），寫入：

```javascript
// 資料層：載入並轉換東京首都圈真實行政區邊界 GeoJSON（國土數值情報 N03）

const PREF_CODES = ['11', '12', '13', '14', '19'];
const GEOJSON_URL = (code) =>
    `https://raw.githubusercontent.com/smartnews-smri/japan-topography/main/data/municipality/geojson/s0010/N03-21_${code}_210101.json`;

// 政令指定都市的轄區合併為市；其餘以 N03_004 為單位
function getUnitName(props) {
    if (props.N03_003 && props.N03_003.endsWith('市')) return props.N03_003;
    return props.N03_004;
}

// 依名稱結尾推導行政區劃類型
function deriveType(name) {
    const suffixMap = { '区': '區', '市': '市', '町': '町', '村': '村' };
    return suffixMap[name[name.length - 1]] || '其他';
}

// 將多個 Polygon / MultiPolygon 幾何攤平為單一 MultiPolygon 坐標陣列
function mergePolygonCoordinates(geometries) {
    const polygons = [];
    geometries.forEach((geom) => {
        if (geom.type === 'Polygon') polygons.push(geom.coordinates);
        else if (geom.type === 'MultiPolygon') polygons.push(...geom.coordinates);
    });
    return polygons;
}

// 球面近似計算單一環的面積（平方公尺）
function ringAreaM2(ring) {
    const R = 6378137;
    const rad = (d) => (d * Math.PI) / 180;
    let total = 0;
    for (let i = 0; i < ring.length; i++) {
        const [lon1, lat1] = ring[i];
        const [lon2, lat2] = ring[(i + 1) % ring.length];
        total += (rad(lon2) - rad(lon1)) * (2 + Math.sin(rad(lat1)) + Math.sin(rad(lat2)));
    }
    return Math.abs((total * R * R) / 2);
}

// MultiPolygon 面積（km²，1 位小數）：外環加總、內環（洞）扣除
function multiPolygonAreaKm2(multiCoords) {
    let m2 = 0;
    multiCoords.forEach((polygon) => {
        polygon.forEach((ring, i) => {
            m2 += (i === 0 ? 1 : -1) * ringAreaM2(ring);
        });
    });
    return Math.round((m2 / 1e6) * 10) / 10;
}

// 將原始 N03 GeoJSON 轉為應用程式格式：分組合併 + 屬性補齊
function transformPrefectureData(rawGeoJson, populationTable) {
    const groups = new Map();
    rawGeoJson.features.forEach((f) => {
        const props = f.properties;
        if (!props || !props.N03_004) return; // 跳過所屬未定地
        const name = getUnitName(props);
        const id = `${props.N03_001}${name}`;
        if (!groups.has(id)) {
            groups.set(id, { name, prefecture: props.N03_001, geometries: [] });
        }
        groups.get(id).geometries.push(f.geometry);
    });

    const features = [];
    groups.forEach((g, id) => {
        const coordinates = mergePolygonCoordinates(g.geometries);
        features.push({
            type: 'Feature',
            properties: {
                id,
                name: g.name,
                prefecture: g.prefecture,
                type: deriveType(g.name),
                population: populationTable[g.name] ?? null,
                area_km2: multiPolygonAreaKm2(coordinates)
            },
            geometry: { type: 'MultiPolygon', coordinates }
        });
    });
    return features;
}

// 載入五縣資料並合併為單一 FeatureCollection
async function loadTokyoMetroData() {
    const responses = await Promise.all(PREF_CODES.map((code) => fetch(GEOJSON_URL(code))));
    const failed = responses.find((r) => !r.ok);
    if (failed) throw new Error(`GeoJSON 載入失敗：HTTP ${failed.status}`);
    const rawList = await Promise.all(responses.map((r) => r.json()));
    const features = rawList.flatMap((raw) => transformPrefectureData(raw, POPULATION_DATA));
    return { type: 'FeatureCollection', features };
}

if (typeof window !== 'undefined') {
    window.tokyoMetroDataPromise = loadTokyoMetroData();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getUnitName,
        deriveType,
        mergePolygonCoordinates,
        ringAreaM2,
        multiPolygonAreaKm2,
        transformPrefectureData
    };
}
```

注意 `loadTokyoMetroData` 引用全域 `POPULATION_DATA`（由 population-data.js 先載入提供）；Node 環境因 `typeof window === 'undefined'` 不會執行，所以測試不受影響。

- [ ] **Step 4: 執行測試，確認通過**

```bash
node --test tests/
```

Expected: 全部 PASS（7 tests）。

- [ ] **Step 5: Commit**

```bash
git add tests/data.test.js js/data.js
git commit -m "feat: rewrite data layer to fetch real municipality boundaries

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: 頁面結構（index.html）

**Files:**
- Modify: `index.html`（完全重寫 body 結構）

- [ ] **Step 1: 重寫 index.html**

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>東京首都圈隨機地圖選取器</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="app-container">
        <header class="navbar">
            <span class="navbar-dot"></span>
            <h1>🗾 東京首都圈隨機選取器</h1>
            <div class="navbar-stats">總區域：<span id="total-areas">—</span></div>
        </header>

        <div class="main-content">
            <div class="map-wrap">
                <div id="map"></div>
                <div class="map-legend">
                    <span style="color:#74b9ff">■ 東京都</span>
                    <span style="color:#fd79a8">■ 神奈川</span>
                    <span style="color:#55a3ff">■ 埼玉</span>
                    <span style="color:#00b894">■ 千葉</span>
                    <span style="color:#fdcb6e">■ 山梨</span>
                </div>
                <div id="loading-overlay">
                    <div class="spinner"></div>
                    <p>載入行政區邊界資料中⋯</p>
                </div>
            </div>

            <aside class="sidebar">
                <section class="sidebar-section">
                    <div class="label">篩選縣市</div>
                    <div class="chips" id="prefecture-chips"></div>
                </section>

                <section class="sidebar-section">
                    <div class="label">選取數量</div>
                    <div class="controls-row">
                        <input type="number" id="count" min="1" max="50" value="5">
                        <button id="random-select" class="btn-primary">隨機選取</button>
                    </div>
                    <button id="clear-selection" class="btn-ghost">清除選取</button>
                </section>

                <section class="sidebar-section stats-grid">
                    <div class="stat-card">
                        <div class="stat-label">合計人口</div>
                        <div class="stat-value" id="stat-population">—</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">合計面積</div>
                        <div class="stat-value" id="stat-area">—</div>
                    </div>
                </section>

                <section class="sidebar-section results-section">
                    <div class="label">已選取 <span id="selected-count">0</span> 個區域</div>
                    <div id="selected-areas"></div>
                </section>
            </aside>
        </div>
    </div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="js/population-data.js"></script>
    <script src="js/data.js"></script>
    <script src="js/map.js"></script>
    <script src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: restructure page to navbar + map + sidebar layout

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: 暗色主題（css/style.css）

**Files:**
- Modify: `css/style.css`（完全重寫）

- [ ] **Step 1: 重寫 css/style.css**

```css
/* ===== 暗色科技風主題 ===== */
:root {
    --bg-primary: #080c14;
    --bg-secondary: #0d1117;
    --bg-card: #111827;
    --bg-input: #1a2535;
    --border-subtle: #1e2d3d;
    --border-accent: #2d4a7a;
    --text-primary: #e2e8f0;
    --text-secondary: #94a3b8;
    --text-muted: #4a5568;
    --accent-blue: #74b9ff;
    --accent-red: #ff6b6b;
    --btn-primary: #3b82f6;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
    font-family: 'Segoe UI', 'Hiragino Sans', 'Microsoft JhengHei', sans-serif;
    background: var(--bg-primary);
    color: var(--text-primary);
    height: 100vh;
    overflow: hidden;
}

.app-container { display: flex; flex-direction: column; height: 100vh; }

/* ===== Navbar ===== */
.navbar {
    height: 48px; flex: none;
    display: flex; align-items: center; gap: 12px;
    padding: 0 18px;
    background: #0a0e1a;
    border-bottom: 1px solid var(--border-subtle);
}
.navbar-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent-red); }
.navbar h1 {
    font-size: 15px; font-weight: 700; letter-spacing: 0.12em;
    color: var(--accent-blue); flex: 1;
}
.navbar-stats { font-size: 12px; color: var(--text-muted); }
.navbar-stats span { color: var(--accent-blue); font-weight: 600; }

.main-content { display: flex; flex: 1; min-height: 0; }

/* ===== 地圖 ===== */
.map-wrap { flex: 1.7; position: relative; min-width: 0; }
#map { position: absolute; inset: 0; background: #0a1628; }

.map-legend {
    position: absolute; bottom: 12px; left: 12px; z-index: 500;
    display: flex; gap: 10px;
    background: rgba(10, 14, 26, 0.85);
    border: 1px solid var(--border-subtle);
    border-radius: 6px;
    padding: 7px 10px;
    font-size: 11px;
    backdrop-filter: blur(4px);
    pointer-events: none;
}

#loading-overlay {
    position: absolute; inset: 0; z-index: 600;
    display: flex; flex-direction: column; gap: 14px;
    align-items: center; justify-content: center;
    background: rgba(8, 12, 20, 0.9);
    color: var(--text-secondary); font-size: 13px;
    transition: opacity 0.4s;
}
#loading-overlay.hidden { opacity: 0; pointer-events: none; }
.spinner {
    width: 36px; height: 36px; border-radius: 50%;
    border: 3px solid var(--border-subtle);
    border-top-color: var(--accent-blue);
    animation: spin 0.9s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.load-error { text-align: center; color: var(--text-secondary); }
.load-error button {
    margin-top: 12px; padding: 7px 22px;
    background: var(--btn-primary); color: #fff;
    border: none; border-radius: 6px; font-size: 13px; cursor: pointer;
}

/* 選取高亮發光與 pulse */
.selected-area { filter: drop-shadow(0 0 6px rgba(255, 107, 107, 0.85)); }
@keyframes areaPulse {
    0%, 100% { filter: drop-shadow(0 0 4px rgba(255, 107, 107, 0.6)); }
    50% { filter: drop-shadow(0 0 16px rgba(255, 107, 107, 1)); }
}
.pulse-area { animation: areaPulse 0.6s ease-in-out 3; }

/* Leaflet 控制元件暗色化 */
.leaflet-control-zoom a {
    background: rgba(10, 14, 26, 0.85) !important;
    color: var(--text-secondary) !important;
    border-color: var(--border-subtle) !important;
}
.leaflet-control-attribution {
    background: rgba(10, 14, 26, 0.7) !important;
    color: var(--text-muted) !important;
}
.leaflet-control-attribution a { color: var(--text-secondary) !important; }

/* Tooltip 暗色卡片 */
.leaflet-tooltip.area-tooltip {
    background: var(--bg-secondary);
    border: 1px solid var(--border-accent);
    color: var(--text-primary);
    border-radius: 6px;
    padding: 8px 11px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
}
.leaflet-tooltip-top.area-tooltip::before { border-top-color: var(--border-accent); }
.tt-selected { color: var(--accent-red); font-size: 10px; font-weight: 700; margin-bottom: 3px; }
.tt-name { font-weight: 700; font-size: 13px; margin-bottom: 3px; }
.tt-row { font-size: 11px; color: var(--text-secondary); }

/* ===== 側邊欄 ===== */
.sidebar {
    width: 280px; flex: none;
    background: var(--bg-primary);
    border-left: 1px solid var(--border-subtle);
    display: flex; flex-direction: column;
    overflow: hidden;
}
.sidebar-section { padding: 14px 16px; border-bottom: 1px solid var(--bg-card); flex: none; }
.label { font-size: 11px; letter-spacing: 0.08em; color: var(--text-muted); margin-bottom: 8px; }

.chips { display: flex; flex-wrap: wrap; gap: 5px; }
.chip {
    font-size: 11px; padding: 3px 10px; border-radius: 12px;
    background: var(--bg-input);
    border: 1px solid var(--border-subtle);
    color: var(--text-muted);
    cursor: pointer; transition: all 0.15s;
}
.chip:hover { border-color: var(--border-accent); color: var(--text-secondary); }
.chip.active {
    background: rgba(59, 130, 246, 0.13);
    border-color: var(--btn-primary);
    color: var(--accent-blue);
}

.controls-row { display: flex; gap: 8px; margin-bottom: 8px; }
#count {
    width: 56px; text-align: center;
    background: var(--bg-card);
    border: 1px solid var(--border-accent);
    border-radius: 5px;
    color: var(--text-secondary);
    font-size: 14px; padding: 7px 4px;
}
.btn-primary {
    flex: 1; border: none; border-radius: 6px; cursor: pointer;
    background: linear-gradient(135deg, #2563eb, #3b82f6);
    color: #fff; font-size: 13px; font-weight: 600; letter-spacing: 0.04em;
    padding: 8px 0;
    transition: filter 0.15s;
}
.btn-primary:hover { filter: brightness(1.15); }
.btn-ghost {
    width: 100%; padding: 7px; border-radius: 5px; cursor: pointer;
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    color: var(--text-muted); font-size: 12px;
    transition: all 0.15s;
}
.btn-ghost:hover { color: var(--text-secondary); border-color: var(--border-accent); }

.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.stat-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-subtle);
    border-radius: 6px;
    padding: 8px 10px;
}
.stat-label { font-size: 10px; color: var(--text-muted); margin-bottom: 3px; }
.stat-value { font-size: 17px; font-weight: 700; color: var(--accent-blue); }

.results-section { flex: 1; min-height: 0; display: flex; flex-direction: column; }
#selected-areas {
    flex: 1; overflow-y: auto;
    display: flex; flex-direction: column; gap: 7px;
    padding-right: 2px;
}
#selected-areas::-webkit-scrollbar { width: 6px; }
#selected-areas::-webkit-scrollbar-thumb { background: var(--border-subtle); border-radius: 3px; }
.empty-hint { color: var(--text-muted); font-size: 12px; text-align: center; margin-top: 24px; }

.area-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-subtle);
    border-left: 3px solid var(--accent-blue);
    border-radius: 5px;
    padding: 9px 11px;
    cursor: pointer; transition: all 0.15s;
}
.area-card:hover { background: var(--bg-card); transform: translateX(-2px); }
.area-card-top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
.area-card-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.area-card-badge { font-size: 9px; padding: 1px 7px; border-radius: 9px; border: 1px solid; }
.area-card-meta { display: flex; gap: 12px; font-size: 10px; color: var(--text-muted); }

/* ===== 通知 ===== */
.notification {
    position: fixed; top: 60px; right: 16px; z-index: 2000;
    padding: 10px 16px; border-radius: 8px;
    font-size: 13px; font-weight: 600; color: #fff;
    max-width: 300px; word-wrap: break-word;
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5);
    animation: slideIn 0.3s ease-out;
}
.notification-success { background: #059669; }
.notification-error { background: #dc2626; }
.notification-info { background: var(--btn-primary); }
.notification.leaving { animation: slideOut 0.3s ease-in forwards; }
@keyframes slideIn { from { transform: translateX(110%); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes slideOut { from { transform: none; opacity: 1; } to { transform: translateX(110%); opacity: 0; } }

/* ===== 響應式（手機：側欄移至底部） ===== */
@media (max-width: 768px) {
    .main-content { flex-direction: column; }
    .map-wrap { flex: 1; }
    .sidebar {
        width: 100%; height: 45vh;
        border-left: none;
        border-top: 1px solid var(--border-subtle);
    }
    .navbar h1 { font-size: 13px; letter-spacing: 0.06em; }
}
```

- [ ] **Step 2: Commit**

```bash
git add css/style.css
git commit -m "feat: dark tech theme with CSS variables

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: 地圖模組（js/map.js）

**Files:**
- Modify: `js/map.js`（完全重寫）

- [ ] **Step 1: 重寫 js/map.js**

```javascript
// 地圖模組：Leaflet 渲染、邊界樣式、選取高亮

const PREFECTURE_COLORS = {
    '東京都': '#74b9ff',
    '神奈川県': '#fd79a8',
    '埼玉県': '#55a3ff',
    '千葉県': '#00b894',
    '山梨県': '#fdcb6e'
};

class TokyoMetroMap {
    constructor(geojsonData, { onSelectionChange } = {}) {
        this.geojsonData = geojsonData;
        this.onSelectionChange = onSelectionChange || (() => {});
        this.map = null;
        this.geoJsonLayer = null;
        this.selectedIds = new Set();
        this.layersById = new Map();
        this.init();
    }

    init() {
        this.map = L.map('map').setView([35.6762, 139.6503], 9);
        this.addTileLayerWithFallback();
        this.addGeoJsonLayer();
    }

    addTileLayerWithFallback() {
        const primary = L.tileLayer(
            'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
            { attribution: '© OpenStreetMap contributors © CARTO', maxZoom: 18 }
        ).addTo(this.map);

        primary.on('tileerror', () => {
            this.map.removeLayer(primary);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors', maxZoom: 18
            }).addTo(this.map);
        });
    }

    styleFor(feature) {
        const selected = this.selectedIds.has(feature.properties.id);
        if (selected) {
            return { fillColor: '#ff6b6b', fillOpacity: 0.45, color: '#ff6b6b', weight: 2.5 };
        }
        const base = PREFECTURE_COLORS[feature.properties.prefecture] || '#95a5a6';
        return { fillColor: base, fillOpacity: 0.15, color: base, weight: 1.5 };
    }

    addGeoJsonLayer() {
        this.geoJsonLayer = L.geoJSON(this.geojsonData, {
            style: (feature) => this.styleFor(feature),
            onEachFeature: (feature, layer) => {
                this.layersById.set(feature.properties.id, layer);
                layer.on({
                    click: () => this.toggleSelect(feature.properties.id),
                    mouseover: (e) => this.onMouseOver(e, feature),
                    mouseout: (e) => this.onMouseOut(e)
                });
            }
        }).addTo(this.map);
    }

    tooltipHtml(props) {
        const selected = this.selectedIds.has(props.id);
        const pop = props.population != null ? props.population.toLocaleString() : 'N/A';
        return `
            ${selected ? '<div class="tt-selected">● 已選取</div>' : ''}
            <div class="tt-name">${props.name}</div>
            <div class="tt-row">${props.prefecture}｜${props.type}</div>
            <div class="tt-row">人口：${pop}</div>
            <div class="tt-row">面積：${props.area_km2} km²</div>`;
    }

    onMouseOver(e, feature) {
        const layer = e.target;
        const selected = this.selectedIds.has(feature.properties.id);
        layer.setStyle({ fillOpacity: selected ? 0.6 : 0.35, weight: 2.5 });
        layer.bringToFront();
        layer.bindTooltip(this.tooltipHtml(feature.properties), {
            permanent: false, direction: 'top', className: 'area-tooltip'
        }).openTooltip();
    }

    onMouseOut(e) {
        const layer = e.target;
        layer.setStyle(this.styleFor(layer.feature));
        layer.closeTooltip();
    }

    refreshLayer(layer) {
        const selected = this.selectedIds.has(layer.feature.properties.id);
        layer.setStyle(this.styleFor(layer.feature));
        const el = layer.getElement();
        if (el) el.classList.toggle('selected-area', selected);
    }

    refreshAll() {
        this.layersById.forEach((layer) => this.refreshLayer(layer));
    }

    toggleSelect(id) {
        if (this.selectedIds.has(id)) this.selectedIds.delete(id);
        else this.selectedIds.add(id);
        this.refreshLayer(this.layersById.get(id));
        this.onSelectionChange();
    }

    // 隨機選取：從 poolIds 中選 count 個未選取的，依序動畫高亮
    randomSelect(count, poolIds) {
        const pool = poolIds.filter((id) => !this.selectedIds.has(id));
        const n = Math.min(count, pool.length);
        const picked = [];
        for (let i = 0; i < n; i++) {
            const idx = Math.floor(Math.random() * pool.length);
            picked.push(pool.splice(idx, 1)[0]);
        }
        picked.forEach((id, i) => {
            setTimeout(() => {
                this.selectedIds.add(id);
                this.refreshLayer(this.layersById.get(id));
                this.onSelectionChange();
                if (i === picked.length - 1) this.zoomToSelected();
            }, i * 100);
        });
        return picked.length;
    }

    zoomToSelected() {
        const layers = [...this.selectedIds]
            .map((id) => this.layersById.get(id))
            .filter(Boolean);
        if (layers.length === 0) return;
        this.map.fitBounds(L.featureGroup(layers).getBounds(), { padding: [40, 40] });
    }

    // 飛至指定區域並 pulse 提示
    flyToArea(id) {
        const layer = this.layersById.get(id);
        if (!layer) return;
        this.map.flyToBounds(layer.getBounds(), { padding: [60, 60], duration: 0.8 });
        const el = layer.getElement();
        if (el) {
            el.classList.add('pulse-area');
            setTimeout(() => el.classList.remove('pulse-area'), 1900);
        }
    }

    clearSelection() {
        this.selectedIds.clear();
        this.refreshAll();
        this.onSelectionChange();
    }

    // 依選取順序回傳 features
    getSelectedFeatures() {
        return [...this.selectedIds]
            .map((id) => this.layersById.get(id)?.feature)
            .filter(Boolean);
    }

    getAllFeatures() {
        return this.geojsonData.features;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TokyoMetroMap, PREFECTURE_COLORS };
}
```

- [ ] **Step 2: Commit**

```bash
git add js/map.js
git commit -m "feat: rewrite map module with real boundaries and glow selection

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: 應用邏輯（js/main.js）

**Files:**
- Modify: `js/main.js`（完全重寫）

- [ ] **Step 1: 重寫 js/main.js**

```javascript
// 應用邏輯：側邊欄 UI、縣市篩選、統計、快捷鍵

const PREFECTURE_OPTIONS = [
    { key: 'all', label: '全部' },
    { key: '東京都', label: '東京都' },
    { key: '神奈川県', label: '神奈川' },
    { key: '埼玉県', label: '埼玉' },
    { key: '千葉県', label: '千葉' },
    { key: '山梨県', label: '山梨' }
];

function formatPopulation(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return Math.round(n / 1e3) + 'K';
    return String(n);
}

class TokyoMetroApp {
    constructor(geojsonData) {
        this.activePrefecture = 'all';
        this.map = new TokyoMetroMap(geojsonData, {
            onSelectionChange: () => this.renderSidebar()
        });
        this.renderChips();
        this.bindEvents();
        document.getElementById('total-areas').textContent = geojsonData.features.length;
        this.renderSidebar();
    }

    renderChips() {
        const wrap = document.getElementById('prefecture-chips');
        wrap.innerHTML = '';
        PREFECTURE_OPTIONS.forEach((opt) => {
            const chip = document.createElement('button');
            chip.className = 'chip' + (this.activePrefecture === opt.key ? ' active' : '');
            chip.textContent = opt.label;
            chip.addEventListener('click', () => {
                this.activePrefecture = opt.key;
                this.renderChips();
            });
            wrap.appendChild(chip);
        });
    }

    bindEvents() {
        document.getElementById('random-select')
            .addEventListener('click', () => this.handleRandomSelect());
        document.getElementById('clear-selection')
            .addEventListener('click', () => this.handleClear());

        const countInput = document.getElementById('count');
        countInput.addEventListener('change', () => {
            const v = parseInt(countInput.value, 10);
            if (Number.isNaN(v) || v < 1) countInput.value = '1';
            else if (v > 50) countInput.value = '50';
        });

        document.addEventListener('keydown', (e) => {
            const mod = e.ctrlKey || e.metaKey;
            if (mod && !e.shiftKey && e.key.toLowerCase() === 'r') {
                e.preventDefault();
                this.handleRandomSelect();
            }
            // Ctrl+C 與瀏覽器複製衝突，改用 Ctrl+Shift+C
            if (mod && e.shiftKey && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                this.handleClear();
            }
        });
    }

    // 依目前縣市篩選取得隨機池
    poolIds() {
        return this.map.getAllFeatures()
            .filter((f) => this.activePrefecture === 'all'
                || f.properties.prefecture === this.activePrefecture)
            .map((f) => f.properties.id);
    }

    handleRandomSelect() {
        const count = parseInt(document.getElementById('count').value, 10) || 5;
        const picked = this.map.randomSelect(count, this.poolIds());
        if (picked === 0) this.notify('此範圍內所有區域都已被選取', 'info');
        else this.notify(`已隨機選取 ${picked} 個區域`, 'success');
    }

    handleClear() {
        this.map.clearSelection();
        this.notify('已清除所有選取', 'info');
    }

    renderSidebar() {
        const feats = this.map.getSelectedFeatures();
        document.getElementById('selected-count').textContent = feats.length;

        const popSum = feats.reduce((s, f) => s + (f.properties.population || 0), 0);
        const areaSum = feats.reduce((s, f) => s + (f.properties.area_km2 || 0), 0);
        document.getElementById('stat-population').textContent =
            feats.length ? formatPopulation(popSum) : '—';
        document.getElementById('stat-area').textContent =
            feats.length ? `${Math.round(areaSum).toLocaleString()} km²` : '—';

        const container = document.getElementById('selected-areas');
        container.innerHTML = '';
        if (feats.length === 0) {
            container.innerHTML = '<p class="empty-hint">尚未選取任何區域</p>';
            return;
        }
        feats.forEach((f) => {
            const p = f.properties;
            const color = PREFECTURE_COLORS[p.prefecture] || '#95a5a6';
            const card = document.createElement('div');
            card.className = 'area-card';
            card.style.borderLeftColor = color;
            card.innerHTML = `
                <div class="area-card-top">
                    <span class="area-card-name">${p.name}</span>
                    <span class="area-card-badge" style="color:${color};border-color:${color}66;background:${color}1a">${p.prefecture}</span>
                </div>
                <div class="area-card-meta">
                    <span>${p.population != null ? p.population.toLocaleString() + ' 人' : '人口 N/A'}</span>
                    <span>${p.area_km2} km²</span>
                </div>`;
            card.addEventListener('click', () => this.map.flyToArea(p.id));
            container.appendChild(card);
        });
    }

    notify(message, type = 'info') {
        const n = document.createElement('div');
        n.className = `notification notification-${type}`;
        n.textContent = message;
        document.body.appendChild(n);
        setTimeout(() => {
            n.classList.add('leaving');
            setTimeout(() => n.remove(), 320);
        }, 2600);
    }
}

// 啟動：等待資料載入完成後初始化
document.addEventListener('DOMContentLoaded', async () => {
    const overlay = document.getElementById('loading-overlay');
    try {
        const data = await window.tokyoMetroDataPromise;
        window.app = new TokyoMetroApp(data);
        overlay.classList.add('hidden');
    } catch (err) {
        console.error('資料載入失敗:', err);
        overlay.innerHTML = `
            <div class="load-error">
                <p>地圖資料載入失敗，請檢查網路連線</p>
                <button onclick="location.reload()">重試</button>
            </div>`;
    }
});
```

- [ ] **Step 2: Commit**

```bash
git add js/main.js
git commit -m "feat: rewrite app logic with filter chips, stats and result cards

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: 瀏覽器手動驗證

**Files:** 無預期變更（發現 bug 才修）。

- [ ] **Step 1: 啟動本地伺服器**

```bash
cd "D:/Code/TokyoFun"
python -m http.server 8000
```

（背景執行，瀏覽器開 `http://localhost:8000`）

- [ ] **Step 2: 核對驗證清單**

依序確認，全部須通過：

1. **載入**：先出現 spinner「載入行政區邊界資料中⋯」，數秒後淡出；地圖顯示暗色底圖（CartoDB Dark Matter）。
2. **邊界**：五縣的市區町村以真實邊界輪廓顯示（不規則多邊形，非矩形），各縣顏色不同，與左下角圖例一致。
3. **總數**：navbar「總區域」顯示約 230–245。
4. **隨機選取**：輸入 5 → 點「隨機選取」→ 5 個區域以約 100ms 間隔依序變紅並發光，最後地圖縮放至涵蓋所有選取區域；成功 toast 出現。
5. **側欄統計**：合計人口顯示如 `4.35M` 格式、合計面積為整數 km²；結果卡片左側色條對應縣市色，badge 顯示縣名。
6. **卡片點擊**：點任一結果卡片 → 地圖飛至該區域，邊界 pulse 閃爍三次。
7. **手動選取**：點地圖上未選取區域 → 變紅；再點一次 → 還原；側欄即時同步。
8. **hover**：滑鼠懸停 → 暗色 tooltip 顯示名稱／縣市｜類型／人口／面積；已選取區域 tooltip 頂部顯示紅色「● 已選取」。
9. **篩選**：點「神奈川」chip → 隨機選取的新區域全部位於神奈川縣。
10. **清除**：「清除選取」→ 全部還原、統計顯示 `—`、清單顯示「尚未選取任何區域」。
11. **快捷鍵**：`Ctrl+R` 觸發隨機選取（不重新整理頁面）、`Ctrl+Shift+C` 清除。
12. **RWD**：DevTools 切換 375px 寬 → 側欄移至底部（高 45vh），地圖在上方可操作。
13. **Console**：無紅色錯誤（tile 404 警告可接受）。

- [ ] **Step 3: 修復發現的問題並提交**

若清單有未通過項目，修復後重跑該項。然後：

```bash
node --test tests/
git add -A
git commit -m "fix: address issues found in browser verification

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

（若無任何修改則跳過 commit。）

---

### Task 9: 文件更新

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: 更新 README.md**

重寫以下章節（其餘保留）：

- 「主要功能」：加入真實行政區邊界、縣市篩選、合計統計、結果卡片飛行定位
- 「快捷鍵」：`Ctrl/Cmd + Shift + C` 取代 `Ctrl/Cmd + C`
- 「技術架構 > 項目結構」：加入 `js/population-data.js`、`tests/`
- 「數據格式」：改為說明資料來自國土數值情報 N03（smartnews-smri/japan-topography s0010 簡化版），執行期 fetch；人口為靜態近似值
- 「開發說明 > 添加新區域」：改為說明資料為動態載入，新增縣需在 `data.js` 的 `PREF_CODES` 加入縣代碼並於 `population-data.js` 補充人口
- 「更新日誌」：加入 v2.0.0（2026-06-12）：真實邊界、暗色主題、側欄統計

- [ ] **Step 2: 更新 CLAUDE.md**

需修改的內容：

- 刪除「Key Constraints」中的坐標順序段落（`[lat, lng]` quirk 與 `normalizeGeoJsonCoordinates` 已不存在；新資料為標準 `[lng, lat]`）
- 「Architecture」改為四個腳本：`population-data.js`（人口表）→ `data.js`（fetch + 轉換，暴露 `tokyoMetroDataPromise`）→ `map.js`（`TokyoMetroMap`，接收 data 參數）→ `main.js`（`TokyoMetroApp`，await promise 後初始化）
- 「Data」改為說明執行期從 GitHub raw fetch 國土數值情報 N03 GeoJSON、政令市合併規則、人口近似值查表
- 新增測試指令：`node --test tests/`
- Tile fallback 改為：CartoDB dark_all 為主、OSM 為備援

- [ ] **Step 3: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: update README and CLAUDE.md for v2 architecture

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## 成功標準對照（來自 spec）

| Spec 要求 | 對應 |
|-----------|------|
| 真實行政區邊界 | Task 3（資料層）+ Task 8 驗證項 2 |
| 選取高亮發光 | Task 5（`.selected-area`）+ Task 6（`refreshLayer`）+ 驗證項 4 |
| 合計人口／面積 | Task 2 + Task 7（`renderSidebar`）+ 驗證項 5 |
| 縣市篩選 | Task 7（chips + `poolIds`）+ 驗證項 9 |
| 現代瀏覽器顯示 | Task 8 驗證項 13 |
| 手機 375px 可用 | Task 5（media query）+ 驗證項 12 |
