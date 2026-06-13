// 應用邏輯：側邊欄 UI、地區/都道府縣兩層篩選、統計、快捷鍵

const REGIONS = [
    { key: '北海道', label: '北海道',     prefs: ['北海道'] },
    { key: '東北',   label: '東北',       prefs: ['青森県','岩手県','宮城県','秋田県','山形県','福島県'] },
    { key: '関東',   label: '関東',       prefs: ['茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県'] },
    { key: '中部',   label: '中部',       prefs: ['新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県'] },
    { key: '近畿',   label: '近畿',       prefs: ['三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県'] },
    { key: '中国',   label: '中国',       prefs: ['鳥取県','島根県','岡山県','広島県','山口県'] },
    { key: '四国',   label: '四国',       prefs: ['徳島県','香川県','愛媛県','高知県'] },
    { key: '九州・沖縄', label: '九州・沖縄', prefs: ['福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'] }
];

class TokyoMetroApp {
    constructor(geojsonData) {
        this.activePrefs = new Set();    // 空 = 全日本；有值 = 只抽這些都道府縣
        this.expandedRegions = new Set(); // 目前展開的地區
        this.map = new TokyoMetroMap(geojsonData, {
            onSelectionChange: () => this.renderSidebar()
        });
        this.renderFilter();
        this.bindEvents();
        document.getElementById('total-areas').textContent = geojsonData.features.length;
        this.renderSidebar();
    }

    renderFilter() {
        const wrap = document.getElementById('prefecture-chips');
        wrap.innerHTML = '';

        // 「全日本」重置鈕
        const allBtn = document.createElement('button');
        allBtn.className = 'chip all-chip' + (this.activePrefs.size === 0 ? ' active' : '');
        allBtn.textContent = '全日本';
        allBtn.addEventListener('click', () => {
            this.activePrefs.clear();
            this.renderFilter();
        });
        wrap.appendChild(allBtn);

        // 各地區手風琴
        REGIONS.forEach((region) => {
            const selectedInRegion = region.prefs.filter((p) => this.activePrefs.has(p)).length;
            const isExpanded = this.expandedRegions.has(region.key);
            const color = REGION_COLORS[region.key] || '#95a5a6';

            const group = document.createElement('div');
            group.className = 'region-group';

            // 地區標題列
            const header = document.createElement('button');
            header.className = 'region-header' + (selectedInRegion > 0 ? ' has-selection' : '');
            header.style.borderLeftColor = color;
            header.innerHTML = `
                <span class="region-label">${region.label}</span>
                ${selectedInRegion > 0 ? `<span class="region-count" style="color:${color}">${selectedInRegion}/${region.prefs.length}</span>` : ''}
                <span class="region-arrow">${isExpanded ? '▲' : '▼'}</span>`;
            header.addEventListener('click', () => {
                if (this.expandedRegions.has(region.key)) this.expandedRegions.delete(region.key);
                else this.expandedRegions.add(region.key);
                this.renderFilter();
            });
            group.appendChild(header);

            // 都道府縣 chip 列（可收合）
            if (isExpanded) {
                const prefWrap = document.createElement('div');
                prefWrap.className = 'region-prefs';
                region.prefs.forEach((pref) => {
                    const chip = document.createElement('button');
                    const isActive = this.activePrefs.has(pref);
                    chip.className = 'chip pref-chip' + (isActive ? ' active' : '');
                    if (isActive) chip.style.borderColor = color;
                    chip.textContent = pref;
                    chip.addEventListener('click', () => {
                        if (this.activePrefs.has(pref)) this.activePrefs.delete(pref);
                        else this.activePrefs.add(pref);
                        this.renderFilter();
                    });
                    prefWrap.appendChild(chip);
                });
                group.appendChild(prefWrap);
            }

            wrap.appendChild(group);
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

    // 依目前篩選取得隨機池（空 Set = 全日本）
    poolIds() {
        return this.map.getAllFeatures()
            .filter((f) => this.activePrefs.size === 0
                || this.activePrefs.has(f.properties.prefecture))
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
