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
        this.activePrefs = new Set(); // 空 Set = 全部；有值 = 只選這些縣市
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
            const isAll = opt.key === 'all';
            const isActive = isAll ? this.activePrefs.size === 0 : this.activePrefs.has(opt.key);
            chip.className = 'chip' + (isActive ? ' active' : '');
            chip.textContent = opt.label;
            chip.addEventListener('click', () => {
                if (isAll) {
                    this.activePrefs.clear();
                } else if (this.activePrefs.has(opt.key)) {
                    this.activePrefs.delete(opt.key);
                } else {
                    this.activePrefs.add(opt.key);
                }
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

    // 依目前縣市篩選取得隨機池（空 Set = 全部）
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
