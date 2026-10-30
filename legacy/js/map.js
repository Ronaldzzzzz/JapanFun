// 地圖相關功能模組
class TokyoMetroMap {
    constructor() {
        this.map = null;
        this.geoJsonLayer = null;
        this.selectedAreas = new Set();
        this.areaLayers = new Map();
        this.tileLayer = null;
        this.init();
    }

    // 初始化地圖
    init() {
        // 創建地圖實例，中心設在東京
        this.map = L.map('map').setView([35.6762, 139.6503], 9);
        
        // 添加底圖（含故障轉移）
        this.addTileLayerWithFallback();

        // 加載地理數據
        this.loadGeoData();
    }

    addTileLayerWithFallback() {
        const primaryUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        const fallbackUrl = 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png';

        const options = {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        };

        // 建立主要底圖
        this.tileLayer = L.tileLayer(primaryUrl, options).addTo(this.map);

        // 若主要底圖載入失敗，切換到備援
        const onTileError = () => {
            if (this.tileLayer) {
                try { this.map.removeLayer(this.tileLayer); } catch (_) {}
            }
            this.tileLayer = L.tileLayer(fallbackUrl, options).addTo(this.map);
        };
        this.tileLayer.on('tileerror', onTileError);
    }

    // 加載地理數據
    loadGeoData() {
        if (typeof tokyoMetroData !== 'undefined') {
            // 在加入圖層前，校正坐標順序
            const normalized = this.normalizeGeoJsonCoordinates(tokyoMetroData);
            this.addGeoJsonLayer(normalized);
        } else {
            console.error('地理數據未找到');
        }
    }

    // 遞迴校正 GeoJSON 坐標，將 [lat,lng] 轉為 [lng,lat]
    normalizeGeoJsonCoordinates(data) {
        const cloned = JSON.parse(JSON.stringify(data));

        const normalizeCoords = (coords) => {
            if (!Array.isArray(coords)) return coords;
            if (coords.length === 0) return coords;

            // 底層座標點
            if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
                const lon = coords[0];
                const lat = coords[1];
                // 若第二個值超過緯度合理範圍（>90 或 <-90），判斷為 [lat,lng]，需交換
                if (Math.abs(lat) > 90) {
                    return [lat, lon];
                }
                return coords;
            }

            // 多邊形/多重多邊形等遞迴處理
            return coords.map((c) => normalizeCoords(c));
        };

        if (cloned && cloned.features && Array.isArray(cloned.features)) {
            cloned.features.forEach((f) => {
                if (f.geometry && f.geometry.coordinates) {
                    f.geometry.coordinates = normalizeCoords(f.geometry.coordinates);
                }
            });
        } else if (cloned && cloned.geometry && cloned.geometry.coordinates) {
            cloned.geometry.coordinates = normalizeCoords(cloned.geometry.coordinates);
        }

        return cloned;
    }

    // 添加GeoJSON圖層
    addGeoJsonLayer(data) {
        // 移除現有圖層
        if (this.geoJsonLayer) {
            this.map.removeLayer(this.geoJsonLayer);
        }

        // 創建樣式函數
        const style = (feature) => {
            const isSelected = this.selectedAreas.has(feature.properties.name);
            return {
                fillColor: isSelected ? '#ff6b6b' : this.getPrefectureColor(feature.properties.prefecture),
                weight: 2,
                opacity: 1,
                color: isSelected ? '#d63031' : '#2d3436',
                fillOpacity: isSelected ? 0.8 : 0.4
            };
        };

        // 創建點擊事件處理函數
        const onEachFeature = (feature, layer) => {
            layer.on({
                click: (e) => this.onAreaClick(e, feature),
                mouseover: (e) => this.onAreaMouseOver(e, feature),
                mouseout: (e) => this.onAreaMouseOut(e, feature)
            });

            // 存儲圖層引用
            this.areaLayers.set(feature.properties.name, layer);
        };

        // 添加GeoJSON圖層
        this.geoJsonLayer = L.geoJSON(data, {
            style: style,
            onEachFeature: onEachFeature
        }).addTo(this.map);

        // 更新統計信息
        this.updateStats();
    }

    // 獲取縣市顏色
    getPrefectureColor(prefecture) {
        const colors = {
            '東京都': '#74b9ff',
            '神奈川縣': '#fd79a8',
            '埼玉縣': '#55a3ff',
            '千葉縣': '#00b894',
            '山梨縣': '#fdcb6e'
        };
        return colors[prefecture] || '#95a5a6';
    }

    // 區域點擊事件
    onAreaClick(e, feature) {
        const areaName = feature.properties.name;
        if (this.selectedAreas.has(areaName)) {
            this.selectedAreas.delete(areaName);
        } else {
            this.selectedAreas.add(areaName);
        }
        this.updateMapDisplay();
        this.updateSelectedAreasList();
    }

    // 區域滑鼠懸停事件
    onAreaMouseOver(e, feature) {
        const layer = e.target;
        layer.setStyle({
            weight: 3,
            color: '#2d3436',
            fillOpacity: 0.7
        });
        layer.bringToFront();
        
        // 顯示工具提示
        const properties = feature.properties;
        const tooltipContent = `
            <strong>${properties.name}</strong><br>
            縣市：${properties.prefecture}<br>
            類型：${properties.type}<br>
            人口：${properties.population?.toLocaleString() || 'N/A'}<br>
            面積：${properties.area_km2 || 'N/A'} km²
        `;
        layer.bindTooltip(tooltipContent, {permanent: false, direction: 'top'}).openTooltip();
    }

    // 區域滑鼠離開事件
    onAreaMouseOut(e, feature) {
        this.geoJsonLayer.resetStyle(e.target);
        e.target.closeTooltip();
    }

    // 更新地圖顯示
    updateMapDisplay() {
        if (this.geoJsonLayer) {
            this.geoJsonLayer.eachLayer((layer) => {
                const feature = layer.feature;
                const isSelected = this.selectedAreas.has(feature.properties.name);
                
                layer.setStyle({
                    fillColor: isSelected ? '#ff6b6b' : this.getPrefectureColor(feature.properties.prefecture),
                    color: isSelected ? '#d63031' : '#2d3436',
                    fillOpacity: isSelected ? 0.8 : 0.4,
                    weight: isSelected ? 3 : 2
                });
            });
        }
        this.updateStats();
    }

    // 隨機選取區域
    randomSelect(count) {
        const allAreas = Array.from(this.areaLayers.keys());
        const availableAreas = allAreas.filter(area => !this.selectedAreas.has(area));
        
        if (availableAreas.length === 0) {
            alert('所有區域都已被選取！');
            return;
        }

        const selectedCount = Math.min(count, availableAreas.length);
        const selectedAreas = [];
        
        // 隨機選取
        for (let i = 0; i < selectedCount; i++) {
            const randomIndex = Math.floor(Math.random() * availableAreas.length);
            const selectedArea = availableAreas.splice(randomIndex, 1)[0];
            selectedAreas.push(selectedArea);
            this.selectedAreas.add(selectedArea);
        }

        this.updateMapDisplay();
        this.updateSelectedAreasList();
        
        // 縮放到選取的區域
        if (selectedAreas.length > 0) {
            this.zoomToSelectedAreas(selectedAreas);
        }
    }

    // 縮放到選取的區域
    zoomToSelectedAreas(selectedAreas) {
        const layers = selectedAreas.map(areaName => this.areaLayers.get(areaName)).filter(Boolean);
        if (layers.length > 0) {
            const group = L.featureGroup(layers);
            this.map.fitBounds(group.getBounds(), { padding: [20, 20] });
        }
    }

    // 清除所有選取
    clearSelection() {
        this.selectedAreas.clear();
        this.updateMapDisplay();
        this.updateSelectedAreasList();
    }

    // 更新統計信息
    updateStats() {
        const totalAreas = this.areaLayers.size;
        const selectedCount = this.selectedAreas.size;
        
        document.getElementById('total-areas').textContent = totalAreas;
        document.getElementById('selected-count').textContent = selectedCount;
    }

    // 更新選取區域列表
    updateSelectedAreasList() {
        const container = document.getElementById('selected-areas');
        container.innerHTML = '';

        if (this.selectedAreas.size === 0) {
            container.innerHTML = '<p style="color: #666; text-align: center;">尚未選取任何區域</p>';
            return;
        }

        Array.from(this.selectedAreas).forEach(areaName => {
            const layer = this.areaLayers.get(areaName);
            if (layer && layer.feature) {
                const properties = layer.feature.properties;
                const card = document.createElement('div');
                card.className = 'area-card';
                card.innerHTML = `
                    <h4>${properties.name}</h4>
                    <p><strong>縣市：</strong>${properties.prefecture}</p>
                    <p><strong>類型：</strong>${properties.type}</p>
                    <p><strong>人口：</strong>${properties.population?.toLocaleString() || 'N/A'}</p>
                    <p><strong>面積：</strong>${properties.area_km2 || 'N/A'} km²</p>
                `;
                container.appendChild(card);
            }
        });
    }

    // 獲取選取的區域
    getSelectedAreas() {
        return Array.from(this.selectedAreas);
    }

    // 獲取所有區域
    getAllAreas() {
        return Array.from(this.areaLayers.keys());
    }
}

// 導出類供其他模組使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TokyoMetroMap;
}
