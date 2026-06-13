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
