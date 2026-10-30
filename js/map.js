// 地圖模組：Leaflet 渲染、縣界突顯、邊界樣式、選取高亮

const REGION_COLORS = {
    '北海道':     '#74b9ff',
    '東北':       '#a29bfe',
    '関東':       '#fd79a8',
    '中部':       '#fdcb6e',
    '近畿':       '#00b894',
    '中国':       '#e17055',
    '四国':       '#55efc4',
    '九州・沖縄': '#ff7675'
};

const PREF_TO_REGION = {
    '北海道': '北海道',
    '青森県': '東北', '岩手県': '東北', '宮城県': '東北', '秋田県': '東北', '山形県': '東北', '福島県': '東北',
    '茨城県': '関東', '栃木県': '関東', '群馬県': '関東', '埼玉県': '関東', '千葉県': '関東', '東京都': '関東', '神奈川県': '関東',
    '新潟県': '中部', '富山県': '中部', '石川県': '中部', '福井県': '中部', '山梨県': '中部', '長野県': '中部', '岐阜県': '中部', '静岡県': '中部', '愛知県': '中部',
    '三重県': '近畿', '滋賀県': '近畿', '京都府': '近畿', '大阪府': '近畿', '兵庫県': '近畿', '奈良県': '近畿', '和歌山県': '近畿',
    '鳥取県': '中国', '島根県': '中国', '岡山県': '中国', '広島県': '中国', '山口県': '中国',
    '徳島県': '四国', '香川県': '四国', '愛媛県': '四国', '高知県': '四国',
    '福岡県': '九州・沖縄', '佐賀県': '九州・沖縄', '長崎県': '九州・沖縄', '熊本県': '九州・沖縄',
    '大分県': '九州・沖縄', '宮崎県': '九州・沖縄', '鹿児島県': '九州・沖縄', '沖縄県': '九州・沖縄'
};

// 各都道府縣對應地區顏色（map.js 與 main.js 共用）
const PREFECTURE_COLORS = Object.fromEntries(
    Object.entries(PREF_TO_REGION).map(([p, r]) => [p, REGION_COLORS[r]])
);

// 47 都道府縣本島視覺中心座標 [lat, lng]（避開小笠原群島等離島造成中心偏移至海面）
const PREF_LABEL_CENTERS = {
    '北海道':   [43.45, 142.45],
    '青森県':   [40.78, 140.82],
    '岩手県':   [39.58, 141.35],
    '宮城県':   [38.45, 140.92],
    '秋田県':   [39.75, 140.40],
    '山形県':   [38.45, 140.10],
    '福島県':   [37.38, 140.22],
    '茨城県':   [36.28, 140.32],
    '栃木県':   [36.68, 139.82],
    '群馬県':   [36.50, 138.98],
    '埼玉県':   [35.98, 139.35],
    '千葉県':   [35.52, 140.20],
    '東京都':   [35.70, 139.50],
    '神奈川県': [35.42, 139.32],
    '新潟県':   [37.45, 138.88],
    '富山県':   [36.64, 137.26],
    '石川県':   [36.75, 136.72],
    '福井県':   [35.85, 136.22],
    '山梨県':   [35.62, 138.60],
    '長野県':   [36.12, 138.05],
    '岐阜県':   [35.78, 137.05],
    '静岡県':   [35.02, 138.32],
    '愛知県':   [35.02, 137.20],
    '三重県':   [34.52, 136.38],
    '滋賀県':   [35.22, 136.14],
    '京都府':   [35.22, 135.55],
    '大阪府':   [34.62, 135.52],
    '兵庫県':   [35.05, 134.82],
    '奈良県':   [34.32, 135.88],
    '和歌山県': [33.90, 135.50],
    '鳥取県':   [35.36, 133.85],
    '島根県':   [35.08, 132.55],
    '岡山県':   [34.90, 133.82],
    '広島県':   [34.60, 132.78],
    '山口県':   [34.20, 131.55],
    '徳島県':   [33.92, 134.25],
    '香川県':   [34.22, 133.98],
    '愛媛県':   [33.62, 132.85],
    '高知県':   [33.55, 133.35],
    '福岡県':   [33.52, 130.68],
    '佐賀県':   [33.28, 130.12],
    '長崎県':   [33.12, 129.88],
    '熊本県':   [32.62, 130.75],
    '大分県':   [33.20, 131.42],
    '宮崎県':   [32.15, 131.30],
    '鹿児島県': [31.62, 130.62],
    '沖縄県':   [26.48, 127.95]
};

// 由各都道府縣內部的市町村多邊形提取「都道府縣外框邊界」（過濾掉同縣內部共用的市町村邊界線段）
function buildPrefectureBoundaries(features, { includeIslands = false } = {}) {
    const byPref = new Map();
    features.forEach((f) => {
        if (!includeIslands && f.properties.isRemoteIsland) return;
        const pref = f.properties.prefecture;
        if (!byPref.has(pref)) byPref.set(pref, []);
        byPref.get(pref).push(f);
    });

    const keyPt = (p) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`;
    const prefFeatures = [];

    byPref.forEach((prefList, prefecture) => {
        const edgeMap = new Map();
        prefList.forEach((f) => {
            const coords = f.geometry.type === 'MultiPolygon'
                ? f.geometry.coordinates
                : [f.geometry.coordinates];
            coords.forEach((poly) => {
                poly.forEach((ring) => {
                    for (let i = 0; i < ring.length - 1; i++) {
                        const a = ring[i];
                        const b = ring[i + 1];
                        const ka = keyPt(a);
                        const kb = keyPt(b);
                        if (ka === kb) continue;
                        const k = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
                        const entry = edgeMap.get(k);
                        if (entry) entry.count += 1;
                        else edgeMap.set(k, { count: 1, seg: [a, b] });
                    }
                });
            });
        });

        const outerSegments = [];
        edgeMap.forEach((val) => {
            if (val.count === 1) outerSegments.push(val.seg);
        });

        prefFeatures.push({
            type: 'Feature',
            properties: { prefecture },
            geometry: { type: 'MultiLineString', coordinates: outerSegments }
        });
    });

    return { type: 'FeatureCollection', features: prefFeatures };
}

class TokyoMetroMap {
    constructor(geojsonData, { onSelectionChange, onAreaFocus, theme = 'light' } = {}) {
        this.geojsonData = geojsonData;
        this.onSelectionChange = onSelectionChange || (() => {});
        this.onAreaFocus = onAreaFocus || (() => {});
        this.theme = theme;
        this.map = null;
        this.tileLayer = null;
        this.tileLayerRef = null;
        this.geoJsonLayer = null;
        this.prefBorderLayer = null;
        this.prefBorderLayersByPref = new Map();
        this.prefLabelMarkers = new Map();
        this.hoverTooltip = null;
        this.selectedIds = new Set();
        this.activeId = null; // 目前在左側面板檢視中的區域 ID
        this.scanningId = null; // 隨機抽選輪盤跳動時暫時注目的區域 ID
        this.isDrawing = false;
        this.layersById = new Map();
        this.poolPrefs = null; // null = 全日本；Set<string> = 抽選縣市名稱
        this.anchorPref = null; // null = 全日本；string = 基地縣名稱
        this.includeIslands = false; // 預設排除偏遠離島
        this.init();
    }

    init() {
        this.map = L.map('map', { zoomControl: false }).setView([36.5, 136], 5);
        L.control.zoom({ position: 'bottomright' }).addTo(this.map);

        // 為都道府縣界建立獨立圖層 Pane（位於市町村圖層 400 之上，且完全不攔截滑鼠事件）
        const borderPane = this.map.createPane('prefBorderPane');
        borderPane.style.zIndex = '420';
        borderPane.style.pointerEvents = 'none';

        // 全域單一共享 Tooltip，徹底避免多個提示殘留於畫面
        this.hoverTooltip = L.tooltip({
            permanent: false,
            direction: 'top',
            className: 'area-tooltip',
            offset: [0, -6]
        });

        this.addTileLayerWithFallback();
        this.addGeoJsonLayer();
        this.addPrefectureBorderLayer();
        this.addPrefectureLabels();

        this.map.getContainer().addEventListener('mouseleave', () => {
            this.hideHoverTooltip();
        });

        // 點擊地圖空白處時取消目前區域注目狀態
        this.map.on('click', () => {
            if (this.activeId) {
                this.unfocusArea();
            }
        });
    }

    addTileLayerWithFallback() {
        if (this.tileLayer) {
            this.map.removeLayer(this.tileLayer);
            this.tileLayer = null;
        }
        if (this.tileLayerRef) {
            this.map.removeLayer(this.tileLayerRef);
            this.tileLayerRef = null;
        }

        // 若使用者自行設定了 CARTO API Key（例如由 localStorage），則使用 CARTO 原廠圖資
        const cartoKey = (typeof window !== 'undefined' && (window.CARTO_API_KEY || localStorage.getItem('tokyofun_carto_key'))) || '';

        if (cartoKey) {
            const tileUrl = this.theme === 'dark'
                ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoKey)}`
                : `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoKey)}`;
            this.tileLayer = L.tileLayer(tileUrl, {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
                maxZoom: 18
            }).addTo(this.map);
            return;
        }

        // 預設無 API Key 方案（100% 免費、無浮水印）：
        if (this.theme === 'dark') {
            // 深色主題：Esri Dark Gray Canvas（免 Key、無浮水印）
            this.tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
                maxZoom: 16
            }).addTo(this.map);

            this.tileLayerRef = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 16
            }).addTo(this.map);
        } else {
            // 淺色主題：日本國土地理院 淡色地圖（GSI Pale）
            // 日本官方公有圖資，專門為疊加行政區色塊設計，漢字最精確權威、免 Key、絕無「API KEY REQUIRED」浮水印
            this.tileLayer = L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">国土地理院</a>',
                minZoom: 2,
                maxZoom: 18
            }).addTo(this.map);
        }

        this.tileLayer.on('tileerror', () => {
            if (this.tileLayer) this.map.removeLayer(this.tileLayer);
            if (this.tileLayerRef) {
                this.map.removeLayer(this.tileLayerRef);
                this.tileLayerRef = null;
            }
            this.tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
                maxZoom: 18
            }).addTo(this.map);
        });
    }

    setTheme(theme) {
        this.theme = theme === 'dark' ? 'dark' : 'light';
        this.addTileLayerWithFallback();
        this.refreshAll();
    }

    isFeatureInPool(feature) {
        if (!feature || !feature.properties) return false;
        if (this.selectedIds.has(feature.properties.id)) return true;
        if (!this.includeIslands && feature.properties.isRemoteIsland) return false;
        return !this.poolPrefs || this.poolPrefs.has(feature.properties.prefecture);
    }

    styleFor(feature) {
        const id = feature.properties.id;
        const pref = feature.properties.prefecture;
        const selected = this.selectedIds.has(id);
        const isActive = this.activeId === id;
        const isScanning = this.scanningId === id;
        const isDark = this.theme === 'dark';

        if (isScanning) {
            return isDark
                ? { fillColor: '#ffd166', fillOpacity: 0.82, color: '#ffffff', opacity: 1, weight: 3.2 }
                : { fillColor: '#f59e0b', fillOpacity: 0.76, color: '#78350f', opacity: 1, weight: 3.2 };
        }
        if (isActive) {
            return isDark
                ? { fillColor: '#ff6b6b', fillOpacity: 0.65, color: '#ffffff', opacity: 1, weight: 2.5 }
                : { fillColor: '#e11d48', fillOpacity: 0.58, color: '#881337', opacity: 1, weight: 2.8 };
        }
        if (selected) {
            return isDark
                ? { fillColor: '#ff6b6b', fillOpacity: 0.5, color: '#ff6b6b', opacity: 1, weight: 2 }
                : { fillColor: '#f43f5e', fillOpacity: 0.44, color: '#e11d48', opacity: 1, weight: 2 };
        }
        const inPool = this.isFeatureInPool(feature);
        if (inPool) {
            const isAnchor = this.anchorPref && pref === this.anchorPref;
            if (isDark) {
                return {
                    fillColor: isAnchor ? '#5fa8f5' : '#4a90d9',
                    fillOpacity: isAnchor ? 0.16 : 0.1,
                    color: '#2d5a8a',
                    opacity: 1,
                    weight: 0.75
                };
            }
            return {
                fillColor: isAnchor ? '#f59e0b' : '#3b82f6',
                fillOpacity: isAnchor ? 0.16 : 0.09,
                color: isAnchor ? '#b45309' : '#3b82f6',
                opacity: 0.65,
                weight: 0.75
            };
        }
        // 範圍外其他縣市：完全隱藏且不顯示邊框與填色
        return { fillColor: '#0d1117', fillOpacity: 0, color: '#1a2535', opacity: 0, weight: 0 };
    }

    // 都道府縣層級外框邊界樣式：突顯基地縣與相鄰縣市的縣界與大小
    prefBorderStyleFor(feature) {
        const pref = feature.properties.prefecture;
        const isDark = this.theme === 'dark';
        if (!this.poolPrefs) {
            // 全日本模式：顯示柔和清晰的都道府縣界
            return {
                color: isDark ? '#4a90d9' : '#2563eb',
                weight: 1.5,
                opacity: isDark ? 0.65 : 0.55,
                interactive: false
            };
        }
        if (pref === this.anchorPref) {
            // 基地縣（例如東京都）：醒目粗邊框，突顯自身邊界與大小
            return {
                color: isDark ? '#ffd166' : '#d97706',
                weight: 2.8,
                opacity: 0.96,
                interactive: false
            };
        }
        if (this.poolPrefs.has(pref)) {
            // 相鄰縣市：清晰藍框，與基地縣及彼此清楚區隔
            return {
                color: isDark ? '#74b9ff' : '#2563eb',
                weight: 2.1,
                opacity: 0.88,
                interactive: false
            };
        }
        // 範圍外縣市：隱藏縣界
        return { color: '#1a2535', weight: 0, opacity: 0, interactive: false };
    }

    addGeoJsonLayer() {
        this.geoJsonLayer = L.geoJSON(this.geojsonData, {
            style: (feature) => this.styleFor(feature),
            onEachFeature: (feature, layer) => {
                this.layersById.set(feature.properties.id, layer);
                layer.on({
                    click: (e) => {
                        L.DomEvent.stopPropagation(e);
                        this.onMapAreaClick(feature.properties.id);
                    },
                    mouseover: (e) => this.onMouseOver(e, feature),
                    mousemove: (e) => this.onMouseMove(e),
                    mouseout: (e) => this.onMouseOut(e)
                });
            }
        }).addTo(this.map);
    }

    addPrefectureBorderLayer() {
        if (this.prefBorderLayer) {
            this.map.removeLayer(this.prefBorderLayer);
            this.prefBorderLayersByPref.clear();
        }
        const boundaryGeoJson = buildPrefectureBoundaries(this.geojsonData.features, {
            includeIslands: this.includeIslands
        });
        this.prefBorderLayer = L.geoJSON(boundaryGeoJson, {
            pane: 'prefBorderPane',
            style: (feature) => this.prefBorderStyleFor(feature),
            interactive: false,
            onEachFeature: (feature, layer) => {
                this.prefBorderLayersByPref.set(feature.properties.prefecture, layer);
            }
        }).addTo(this.map);
    }

    // 計算各縣市浮水印標籤的 CSS 狀態類別（null 代表隱藏）
    getPrefLabelState(pref) {
        if (!this.poolPrefs) return 'is-all';
        if (pref === this.anchorPref) return 'is-anchor';
        if (this.poolPrefs.has(pref)) return 'is-neighbor';
        return null;
    }

    addPrefectureLabels() {
        Object.entries(PREF_LABEL_CENTERS).forEach(([pref, latlng]) => {
            const marker = L.marker(latlng, {
                pane: 'prefBorderPane',
                interactive: false,
                keyboard: false,
                icon: L.divIcon({
                    className: 'pref-watermark-wrap',
                    html: `<span class="pref-watermark is-all">${pref}</span>`,
                    iconSize: [0, 0],
                    iconAnchor: [0, 0]
                })
            }).addTo(this.map);
            this.prefLabelMarkers.set(pref, marker);
        });
        this.refreshPrefectureLabels();
    }

    refreshPrefectureLabels() {
        this.prefLabelMarkers.forEach((marker, pref) => {
            const el = marker.getElement();
            if (!el) return;
            const span = el.querySelector('.pref-watermark');
            if (!span) return;
            const state = this.getPrefLabelState(pref);
            if (!state) {
                span.className = 'pref-watermark is-hidden';
            } else {
                span.className = `pref-watermark ${state}`;
            }
        });
    }

    tooltipHtml(props) {
        const selected = this.selectedIds.has(props.id);
        return `
            ${selected ? '<div class="tt-selected">● 已選取（點擊查看資訊）</div>' : ''}
            <div class="tt-name">${props.name}</div>
            <div class="tt-row">${props.prefecture}｜${props.type}</div>`;
    }

    // 同步抽選範圍（基地縣＋相鄰縣市＋離島設定）至地圖渲染
    setPool(poolPrefs, anchorPref = null, { includeIslands = false } = {}) {
        const islandsChanged = this.includeIslands !== includeIslands;
        this.poolPrefs = poolPrefs;
        this.anchorPref = anchorPref;
        this.includeIslands = includeIslands;
        if (islandsChanged && this.map) {
            this.addPrefectureBorderLayer();
        }
        this.refreshAll();
    }

    onMouseOver(e, feature) {
        if (!this.isFeatureInPool(feature)) return;
        const layer = e.target;
        const selected = this.selectedIds.has(feature.properties.id);
        layer.setStyle({
            fillOpacity: selected ? 0.68 : 0.28,
            weight: 2
        });
        if (this.hoverTooltip) {
            this.hoverTooltip
                .setContent(this.tooltipHtml(feature.properties))
                .setLatLng(e.latlng);
            if (!this.map.hasLayer(this.hoverTooltip)) {
                this.hoverTooltip.addTo(this.map);
            }
        }
    }

    onMouseMove(e) {
        if (this.hoverTooltip && this.map.hasLayer(this.hoverTooltip)) {
            this.hoverTooltip.setLatLng(e.latlng);
        }
    }

    onMouseOut(e) {
        const layer = e.target;
        if (!this.isFeatureInPool(layer.feature)) return;
        layer.setStyle(this.styleFor(layer.feature));
        this.hideHoverTooltip();
    }

    hideHoverTooltip() {
        if (this.hoverTooltip && this.map && this.map.hasLayer(this.hoverTooltip)) {
            this.map.removeLayer(this.hoverTooltip);
        }
    }

    refreshLayer(layer) {
        if (!layer) return;
        const id = layer.feature.properties.id;
        const selected = this.selectedIds.has(id);
        const isActive = this.activeId === id;
        const isScanning = this.scanningId === id;
        const visible = this.isFeatureInPool(layer.feature);
        layer.setStyle(this.styleFor(layer.feature));
        if (isActive || isScanning) layer.bringToFront();
        const el = layer.getElement();
        if (el) {
            el.classList.toggle('selected-area', selected);
            el.classList.toggle('active-area', isActive);
            el.classList.toggle('scanning-area', isScanning);
            el.classList.toggle('out-of-pool-area', !visible);
        }
    }

    refreshAll() {
        this.layersById.forEach((layer) => this.refreshLayer(layer));
        if (this.prefBorderLayer) {
            this.prefBorderLayer.setStyle((feature) => this.prefBorderStyleFor(feature));
            // 先繪製鄰縣邊界，最後將「基地縣」邊界移至最上層，避免被鄰縣邊界蓋住
            if (this.poolPrefs) {
                this.poolPrefs.forEach((pref) => {
                    if (pref !== this.anchorPref) {
                        this.prefBorderLayersByPref.get(pref)?.bringToFront();
                    }
                });
            }
            if (this.anchorPref) {
                this.prefBorderLayersByPref.get(this.anchorPref)?.bringToFront();
            }
        }
        this.refreshPrefectureLabels();
        if (this.activeId && this.layersById.has(this.activeId)) {
            this.layersById.get(this.activeId).bringToFront();
        }
    }

    // 地圖直接點擊：範圍外完全忽略；未選取則選取並開啟資訊；已選取未聚焦則聚焦開啟資訊；已聚焦再點則取消選取
    onMapAreaClick(id) {
        const layer = this.layersById.get(id);
        if (!layer || !this.isFeatureInPool(layer.feature)) return;
        if (!this.selectedIds.has(id)) {
            this.selectedIds.add(id);
            this.setActiveArea(id);
            this.refreshLayer(this.layersById.get(id));
            this.onSelectionChange();
            const feat = this.layersById.get(id)?.feature;
            if (feat) this.onAreaFocus(feat);
        } else if (this.activeId !== id) {
            this.setActiveArea(id);
            this.onSelectionChange();
            const feat = this.layersById.get(id)?.feature;
            if (feat) this.onAreaFocus(feat);
        } else {
            this.removeSelect(id);
        }
    }

    toggleSelect(id) {
        if (this.selectedIds.has(id)) this.removeSelect(id);
        else {
            this.selectedIds.add(id);
            this.refreshLayer(this.layersById.get(id));
            this.onSelectionChange();
        }
    }

    removeSelect(id) {
        this.selectedIds.delete(id);
        if (this.activeId === id) {
            this.activeId = null;
            this.onAreaFocus(null);
        }
        this.refreshLayer(this.layersById.get(id));
        this.onSelectionChange();
    }

    setActiveArea(id) {
        const prevId = this.activeId;
        this.activeId = id;
        if (prevId && this.layersById.has(prevId)) {
            this.refreshLayer(this.layersById.get(prevId));
        }
        if (id && this.layersById.has(id)) {
            this.refreshLayer(this.layersById.get(id));
        }
    }

    // 取消目前注目區域（保留選取狀態，僅關閉聚焦與左側資訊面板）
    unfocusArea() {
        if (!this.activeId) return;
        this.setActiveArea(null);
        this.onSelectionChange();
        this.onAreaFocus(null);
    }

    // 取得指定區域在地圖畫面上的像素座標（供右側清單指示虛線使用）
    getAreaContainerPoint(id) {
        const layer = this.layersById.get(id);
        if (!layer || !this.map) return null;
        const center = this._getMainPolygonCenter(layer);
        return this.map.latLngToContainerPoint(center);
    }

    _getMainPolygonCenter(layer) {
        const geom = layer.feature?.geometry;
        if (geom && geom.type === 'MultiPolygon' && geom.coordinates.length > 1) {
            let bestRing = null;
            let bestArea = -1;
            geom.coordinates.forEach((poly) => {
                const ring = poly[0];
                if (!ring || ring.length === 0) return;
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                ring.forEach(([lng, lat]) => {
                    if (lng < minX) minX = lng;
                    if (lng > maxX) maxX = lng;
                    if (lat < minY) minY = lat;
                    if (lat > maxY) maxY = lat;
                });
                const bboxArea = (maxX - minX) * (maxY - minY);
                if (bboxArea > bestArea) {
                    bestArea = bboxArea;
                    bestRing = { lat: (minY + maxY) / 2, lng: (minX + maxX) / 2 };
                }
            });
            if (bestRing) return L.latLng(bestRing.lat, bestRing.lng);
        }
        return layer.getBounds().getCenter();
    }

    setScanningArea(id) {
        const prevId = this.scanningId;
        this.scanningId = id;
        if (prevId && this.layersById.has(prevId)) {
            this.refreshLayer(this.layersById.get(prevId));
        }
        if (id && this.layersById.has(id)) {
            this.refreshLayer(this.layersById.get(id));
        }
    }

    // 隨機選取（輪盤跳動 → 漸進減速 → 逐一鎖定動畫）
    randomSelect(count, poolIds, { onTick, onComplete } = {}) {
        const pool = poolIds.filter((id) => !this.selectedIds.has(id));
        const n = Math.min(count, pool.length);
        if (n === 0) return 0;

        this.isDrawing = true;
        // 先對準抽選池視野，方便觀看區域跳動
        if (this.poolPrefs && pool.length > 0) {
            const poolLayers = pool.map((id) => this.layersById.get(id)).filter(Boolean);
            if (poolLayers.length > 0) {
                this.map.fitBounds(L.featureGroup(poolLayers).getBounds(), {
                    padding: [60, 60],
                    maxZoom: 9,
                    animate: true,
                    duration: 0.45
                });
            }
        }

        // 先抽出最終命中的 n 個區域
        const available = [...pool];
        const picked = [];
        for (let i = 0; i < n; i++) {
            const idx = Math.floor(Math.random() * available.length);
            picked.push(available.splice(idx, 1)[0]);
        }

        // 建立輪盤跳動序列：前段快速隨機跳動並逐漸減速，最後停在各個鎖定目標上
        const decoySteps = Math.min(16, Math.max(10, pool.length));
        const schedule = [];
        let lastDecoyId = null;

        for (let s = 0; s < decoySteps; s++) {
            const progress = s / decoySteps; // 0 -> 1
            // 由 45ms 平滑減速至 210ms（三次方緩出曲線）
            const delay = Math.round(45 + Math.pow(progress, 2.3) * 165);
            let candidate = pool[Math.floor(Math.random() * pool.length)];
            if (pool.length > 1 && candidate === lastDecoyId) {
                candidate = pool[(pool.indexOf(candidate) + 1) % pool.length];
            }
            lastDecoyId = candidate;
            schedule.push({ id: candidate, lock: false, delay });
        }

        // 減速尾聲依序停下並鎖定抽出的目標區域
        picked.forEach((targetId, idx) => {
            // 若抽取多個，每個鎖定之間也可穿插 1~2 次短暫跳動增加懸念感
            if (idx > 0 && pool.length > 2) {
                const hopId = pool[Math.floor(Math.random() * pool.length)];
                schedule.push({ id: hopId, lock: false, delay: 140 });
            }
            schedule.push({
                id: targetId,
                lock: true,
                lockIndex: idx + 1,
                totalLocks: picked.length,
                delay: idx === 0 ? 260 : 280
            });
        });

        let elapsed = 150;
        schedule.forEach((step) => {
            elapsed += step.delay;
            setTimeout(() => {
                this.setScanningArea(step.id);
                const feat = this.layersById.get(step.id)?.feature;

                if (step.lock) {
                    this.selectedIds.add(step.id);
                    const layer = this.layersById.get(step.id);
                    this.refreshLayer(layer);
                    const el = layer?.getElement();
                    if (el) {
                        el.classList.add('roulette-lock-flash');
                        setTimeout(() => el.classList.remove('roulette-lock-flash'), 900);
                    }
                    this.onSelectionChange();
                }

                if (onTick && feat) {
                    onTick({
                        feature: feat,
                        locked: step.lock,
                        lockIndex: step.lockIndex || 0,
                        totalLocks: step.totalLocks || picked.length
                    });
                }
            }, elapsed);
        });

        // 全部鎖定後清除掃描游標並縮放至選取範圍
        setTimeout(() => {
            this.setScanningArea(null);
            this.isDrawing = false;
            this.zoomToSelected();
            if (onComplete) onComplete(picked);
        }, elapsed + 420);

        return picked.length;
    }

    zoomToSelected() {
        const layers = [...this.selectedIds]
            .map((id) => this.layersById.get(id))
            .filter(Boolean);
        if (layers.length === 0) return;
        this.map.fitBounds(L.featureGroup(layers).getBounds(), {
            padding: [80, 80],
            maxZoom: 10
        });
    }

    // 飛至指定區域（保留適度視野以看清與周邊區域的相對關係）並開啟左側資訊
    flyToArea(id) {
        const layer = this.layersById.get(id);
        if (!layer) return;
        this.setActiveArea(id);
        this.onSelectionChange();
        this.map.flyToBounds(layer.getBounds(), {
            padding: [140, 140],
            maxZoom: 10,
            duration: 0.8
        });
        const el = layer.getElement();
        if (el) {
            el.classList.add('pulse-area');
            setTimeout(() => el.classList.remove('pulse-area'), 1900);
        }
        this.onAreaFocus(layer.feature);
    }

    clearSelection() {
        this.selectedIds.clear();
        this.activeId = null;
        this.refreshAll();
        this.onSelectionChange();
        this.onAreaFocus(null);
    }

    // 依地理位置「由北到南（緯度高→低）」排序回傳已選取的 features，避免右側清單指示虛線交叉
    getSelectedFeatures() {
        const entries = [...this.selectedIds]
            .map((id) => {
                const layer = this.layersById.get(id);
                if (!layer || !layer.feature) return null;
                const center = this._getMainPolygonCenter(layer);
                return { feature: layer.feature, lat: center.lat, lng: center.lng };
            })
            .filter(Boolean);

        entries.sort((a, b) => (b.lat - a.lat) || (b.lng - a.lng));
        return entries.map((e) => e.feature);
    }

    getFeatureById(id) {
        return this.layersById.get(id)?.feature || null;
    }

    getAllFeatures() {
        return this.geojsonData.features;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TokyoMetroMap, PREFECTURE_COLORS, buildPrefectureBoundaries };
}
