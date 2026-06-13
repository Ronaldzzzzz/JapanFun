// 應用邏輯：側邊欄 UI、基地縣＋鄰縣篩選、快捷鍵

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

// 物理接壤鄰縣對照表（雙向對稱，島嶼/半島不含跨海）
const PREF_ADJACENCY = {
    '北海道':   [],
    '青森県':   ['岩手県','秋田県'],
    '岩手県':   ['青森県','秋田県','宮城県'],
    '宮城県':   ['岩手県','秋田県','山形県','福島県'],
    '秋田県':   ['青森県','岩手県','宮城県','山形県'],
    '山形県':   ['秋田県','宮城県','福島県','新潟県'],
    '福島県':   ['宮城県','山形県','茨城県','栃木県','群馬県','新潟県'],
    '茨城県':   ['福島県','栃木県','埼玉県','千葉県'],
    '栃木県':   ['福島県','茨城県','群馬県','埼玉県'],
    '群馬県':   ['福島県','栃木県','埼玉県','長野県','新潟県'],
    '埼玉県':   ['茨城県','栃木県','群馬県','千葉県','東京都','山梨県'],
    '千葉県':   ['茨城県','埼玉県','東京都'],
    '東京都':   ['埼玉県','千葉県','神奈川県','山梨県'],
    '神奈川県': ['東京都','山梨県','静岡県'],
    '新潟県':   ['山形県','福島県','群馬県','長野県','富山県'],
    '富山県':   ['新潟県','石川県','長野県','岐阜県'],
    '石川県':   ['富山県','福井県','岐阜県'],
    '福井県':   ['石川県','岐阜県','滋賀県','京都府'],
    '山梨県':   ['埼玉県','東京都','神奈川県','長野県','静岡県'],
    '長野県':   ['群馬県','新潟県','富山県','山梨県','静岡県','愛知県','岐阜県'],
    '岐阜県':   ['富山県','石川県','福井県','長野県','愛知県','三重県','滋賀県'],
    '静岡県':   ['神奈川県','山梨県','長野県','愛知県'],
    '愛知県':   ['長野県','岐阜県','静岡県','三重県'],
    '三重県':   ['岐阜県','愛知県','滋賀県','奈良県','和歌山県'],
    '滋賀県':   ['福井県','岐阜県','三重県','京都府'],
    '京都府':   ['福井県','滋賀県','大阪府','兵庫県','奈良県'],
    '大阪府':   ['京都府','兵庫県','奈良県','和歌山県'],
    '兵庫県':   ['京都府','大阪府','鳥取県','岡山県'],
    '奈良県':   ['三重県','京都府','大阪府','和歌山県'],
    '和歌山県': ['三重県','大阪府','奈良県'],
    '鳥取県':   ['兵庫県','島根県','岡山県'],
    '島根県':   ['鳥取県','岡山県','広島県','山口県'],
    '岡山県':   ['兵庫県','鳥取県','島根県','広島県'],
    '広島県':   ['島根県','岡山県','山口県'],
    '山口県':   ['島根県','広島県'],
    '徳島県':   ['香川県','愛媛県','高知県'],
    '香川県':   ['徳島県','愛媛県'],
    '愛媛県':   ['香川県','徳島県','高知県'],
    '高知県':   ['徳島県','愛媛県'],
    '福岡県':   ['佐賀県','熊本県','大分県'],
    '佐賀県':   ['福岡県','長崎県'],
    '長崎県':   ['佐賀県'],
    '熊本県':   ['福岡県','大分県','宮崎県','鹿児島県'],
    '大分県':   ['福岡県','熊本県','宮崎県'],
    '宮崎県':   ['大分県','熊本県','鹿児島県'],
    '鹿児島県': ['熊本県','宮崎県'],
    '沖縄県':   [],
};

class TokyoMetroApp {
    constructor(geojsonData) {
        this.anchorPref = null;           // null = 全日本；字串 = 基地縣
        this.expandedRegions = new Set();
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

        const neighbors = this.anchorPref ? (PREF_ADJACENCY[this.anchorPref] || []) : [];

        // 抽選範圍指示器
        const indicator = document.createElement('div');
        indicator.className = 'pool-indicator';

        if (!this.anchorPref) {
            const allChip = document.createElement('span');
            allChip.className = 'pool-chip pool-all';
            allChip.textContent = '全日本';
            indicator.appendChild(allChip);
        } else {
            const anchorChip = document.createElement('span');
            anchorChip.className = 'pool-chip pool-anchor';
            anchorChip.textContent = this.anchorPref;
            indicator.appendChild(anchorChip);

            neighbors.forEach((p) => {
                const nc = document.createElement('span');
                nc.className = 'pool-chip pool-neighbor';
                nc.textContent = p;
                indicator.appendChild(nc);
            });

            const reset = document.createElement('button');
            reset.className = 'pool-reset';
            reset.textContent = '全日本';
            reset.addEventListener('click', () => { this.anchorPref = null; this.renderFilter(); });
            indicator.appendChild(reset);
        }
        wrap.appendChild(indicator);

        // 各地區手風琴（點縣市 chip 設定基地縣）
        REGIONS.forEach((region) => {
            const isAnchorRegion = region.prefs.includes(this.anchorPref);
            const hasNeighborInRegion = this.anchorPref
                && region.prefs.some((p) => neighbors.includes(p));
            const isExpanded = this.expandedRegions.has(region.key);
            const color = REGION_COLORS[region.key] || '#95a5a6';

            const group = document.createElement('div');
            group.className = 'region-group';

            const header = document.createElement('button');
            header.className = 'region-header' + (isAnchorRegion || hasNeighborInRegion ? ' has-selection' : '');
            header.style.borderLeftColor = isAnchorRegion ? color : (hasNeighborInRegion ? color + '80' : 'var(--border-subtle)');
            header.innerHTML = `
                <span class="region-label">${region.label}</span>
                ${isAnchorRegion ? `<span class="region-count" style="color:${color}">基地</span>` : (hasNeighborInRegion ? `<span class="region-count" style="color:${color}99">隣縣</span>` : '')}
                <span class="region-arrow">${isExpanded ? '▲' : '▼'}</span>`;
            header.addEventListener('click', () => {
                if (this.expandedRegions.has(region.key)) this.expandedRegions.delete(region.key);
                else this.expandedRegions.add(region.key);
                this.renderFilter();
            });
            group.appendChild(header);

            if (isExpanded) {
                const prefWrap = document.createElement('div');
                prefWrap.className = 'region-prefs';
                region.prefs.forEach((pref) => {
                    const isAnchor = pref === this.anchorPref;
                    const isNeighbor = neighbors.includes(pref);
                    const chip = document.createElement('button');
                    chip.className = 'chip pref-chip'
                        + (isAnchor ? ' pref-anchor' : (isNeighbor ? ' pref-neighbor' : ''));
                    chip.textContent = pref;
                    chip.addEventListener('click', () => {
                        // 點已選基地縣 → 取消（全日本）；點其他縣 → 設為基地
                        this.anchorPref = isAnchor ? null : pref;
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
            if (mod && e.shiftKey && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                this.handleClear();
            }
        });
    }

    // 基地縣＋鄰縣的 feature id 池；anchorPref 為 null 時為全日本
    poolIds() {
        if (!this.anchorPref) {
            return this.map.getAllFeatures().map((f) => f.properties.id);
        }
        const pool = new Set([this.anchorPref, ...(PREF_ADJACENCY[this.anchorPref] || [])]);
        return this.map.getAllFeatures()
            .filter((f) => pool.has(f.properties.prefecture))
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
