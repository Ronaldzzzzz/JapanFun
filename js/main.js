// 應用邏輯：懸浮控制區（抽選後自動折疊）、右側選取清單、左側區域資訊面板串聯

const POPULAR_PREFS = ['東京都', '大阪府', '京都府', '北海道', '福岡県', '愛知県', '沖縄県'];

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
        this.drawScopeMode = 'only-anchor'; // 'only-anchor' (單一基地縣內) | 'with-neighbors' (基地縣＋鄰縣) | 'only-neighbors' (僅抽鄰縣)
        this.includeIslands = false;      // false = 預設排除偏遠離島；true = 納入離島
        this.expandedRegions = new Set();
        this.isControlCollapsed = false;
        this.hoveredCardId = null;
        this.theme = (typeof localStorage !== 'undefined' && localStorage.getItem('tokyofun_theme')) || 'light';
        this.syncThemeAttr();

        this.infoPanel = new AreaInfoPanel({
            onClose: () => {
                this.map.setActiveArea(null);
                this.renderSidebar();
            },
            onPostsChange: () => this.renderSidebar(),
            notify: (msg, type) => this.notify(msg, type)
        });

        this.map = new TokyoMetroMap(geojsonData, {
            theme: this.theme,
            onSelectionChange: () => this.renderSidebar(),
            onAreaFocus: (feature) => this.handleAreaFocus(feature)
        });

        this.renderFilter();
        this.bindEvents();
        this.initGuideModal();
        document.getElementById('total-areas').textContent = geojsonData.features.length;
        this.renderSidebar();
        this.infoPanel.store.syncCountsAsync().then((ok) => {
            if (ok) this.renderSidebar();
        });
    }

    syncThemeAttr() {
        document.documentElement.setAttribute('data-theme', this.theme);
        const btn = document.getElementById('theme-toggle');
        if (btn) {
            btn.textContent = this.theme === 'dark' ? '☀️ 淺色' : '🌙 深色';
        }
    }

    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('tokyofun_theme', this.theme);
        }
        this.syncThemeAttr();
        this.map.setTheme(this.theme);
        this.renderFilter();
        this.renderSidebar();
        if (this.infoPanel.currentFeature) {
            const p = this.infoPanel.currentFeature.properties;
            this.infoPanel.currentBadgeColor = this.getPrefStatusColor(p.prefecture);
            this.infoPanel.render();
        }
    }

    setControlCollapsed(collapsed) {
        this.isControlCollapsed = collapsed;
        const panel = document.getElementById('control-panel');
        const toggleBtn = document.getElementById('toggle-control-panel');
        const arrow = document.getElementById('control-collapse-arrow');
        if (panel) panel.classList.toggle('collapsed', collapsed);
        if (toggleBtn) toggleBtn.setAttribute('aria-expanded', String(!collapsed));
        if (arrow) arrow.textContent = collapsed ? '▼' : '▲';
        this.animateLeaderLines(320);
    }

    animateLeaderLines(durationMs = 320) {
        const start = performance.now();
        const tick = (now) => {
            this.updateLeaderLines();
            if (now - start < durationMs) {
                requestAnimationFrame(tick);
            }
        };
        requestAnimationFrame(tick);
    }

    // 依是否為基地縣決定統一配色（支援淺色與深色主題高對比）
    getPrefStatusColor(prefecture) {
        const isAnchor = this.anchorPref && prefecture === this.anchorPref;
        if (this.theme === 'dark') {
            return isAnchor ? '#ffd166' : '#74b9ff';
        }
        return isAnchor ? '#d97706' : '#2563eb';
    }

    handleAreaFocus(feature) {
        if (!feature) {
            this.infoPanel.close();
            this.renderSidebar();
            return;
        }
        const badgeColor = this.getPrefStatusColor(feature.properties.prefecture);
        this.infoPanel.open(feature, { badgeColor });
        this.renderSidebar();
    }

    renderFilter() {
        const wrap = document.getElementById('prefecture-chips');
        wrap.innerHTML = '';

        const neighbors = this.anchorPref ? (PREF_ADJACENCY[this.anchorPref] || []) : [];
        const hasNeighbors = neighbors.length > 0;

        // 同步折疊標題列上的範圍徽章
        const scopeBadge = document.getElementById('filter-scope-badge');
        if (scopeBadge) {
            if (!this.anchorPref) {
                scopeBadge.textContent = '全日本';
            } else if (!hasNeighbors || this.drawScopeMode === 'only-anchor') {
                scopeBadge.textContent = `🎯 僅 ${this.anchorPref}`;
            } else if (this.drawScopeMode === 'with-neighbors') {
                scopeBadge.textContent = `${this.anchorPref}＋鄰縣`;
            } else {
                scopeBadge.textContent = `${this.anchorPref}之鄰縣`;
            }
            scopeBadge.classList.toggle('is-anchor', !!this.anchorPref);
        }

        // 同步「抽籤範圍模式」按鈕文字與狀態
        const scopeBtn = document.getElementById('toggle-draw-scope');
        if (scopeBtn) {
            if (!this.anchorPref) {
                scopeBtn.disabled = true;
                scopeBtn.classList.remove('active');
                scopeBtn.textContent = '🌏 全日本抽選';
                scopeBtn.title = '請先在下方點選一個基地縣市以鎖定範圍';
            } else if (!hasNeighbors) {
                scopeBtn.disabled = true;
                scopeBtn.classList.add('active');
                scopeBtn.textContent = `🎯 僅限 ${this.anchorPref}`;
                scopeBtn.title = '該行政區無陸地接壤鄰縣，僅限單一縣內抽選';
            } else {
                scopeBtn.disabled = false;
                scopeBtn.classList.add('active');
                if (this.drawScopeMode === 'only-anchor') {
                    scopeBtn.textContent = `🎯 僅限 ${this.anchorPref}`;
                    scopeBtn.title = '目前模式：僅限基地縣內隨機抽選（點選切換為包含鄰縣）';
                } else if (this.drawScopeMode === 'with-neighbors') {
                    scopeBtn.textContent = '🌐 基地縣＋鄰縣';
                    scopeBtn.title = '目前模式：基地縣與周圍接壤縣市一同抽選（點選切換為僅抽鄰縣）';
                } else {
                    scopeBtn.textContent = '🏔️ 僅抽相鄰周邊';
                    scopeBtn.title = '目前模式：僅隨機抽選周邊相鄰縣市（點選切換回僅限基地縣）';
                }
            }
        }

        const islandOptBtn = document.getElementById('toggle-include-islands');
        if (islandOptBtn) {
            islandOptBtn.classList.toggle('active', this.includeIslands);
            islandOptBtn.textContent = this.includeIslands ? '✓ 包含偏遠離島' : '✕ 排除偏遠離島';
        }

        // 同步重置按鈕狀態與標籤
        const resetBtn = document.getElementById('reset-filter');
        if (resetBtn) {
            resetBtn.classList.toggle('active', !!this.anchorPref);
            resetBtn.textContent = this.anchorPref
                ? `✕ ${this.anchorPref}`
                : '初始化';
        }

        // 同步抽選範圍至地圖
        if (this.map) {
            let pool = null;
            if (this.anchorPref) {
                if (!hasNeighbors || this.drawScopeMode === 'only-anchor') {
                    pool = new Set([this.anchorPref]);
                } else if (this.drawScopeMode === 'with-neighbors') {
                    pool = new Set([this.anchorPref, ...neighbors]);
                } else {
                    pool = new Set(neighbors);
                }
            }
            this.map.setPool(pool, this.anchorPref, { includeIslands: this.includeIslands });
            document.getElementById('total-areas').textContent = this.poolIds().length;
        }

        // 熱門基地縣快速選項列
        const popularBox = document.createElement('div');
        popularBox.className = 'popular-prefs-box';
        const popularLabel = document.createElement('div');
        popularLabel.className = 'popular-prefs-label';
        popularLabel.textContent = '🔥 熱門基地';
        popularBox.appendChild(popularLabel);

        const popularChipsWrap = document.createElement('div');
        popularChipsWrap.className = 'popular-prefs-chips';
        POPULAR_PREFS.forEach((pref) => {
            const isAnchor = pref === this.anchorPref;
            const isNeighbor = neighbors.includes(pref);
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'chip pref-chip popular-chip'
                + (isAnchor ? ' pref-anchor' : (isNeighbor ? ' pref-neighbor' : ''));
            chip.textContent = pref;
            chip.addEventListener('click', () => {
                this.anchorPref = isAnchor ? null : pref;
                this.renderFilter();
                this.renderSidebar();
            });
            popularChipsWrap.appendChild(chip);
        });
        popularBox.appendChild(popularChipsWrap);
        wrap.appendChild(popularBox);

        // 各地區手風琴（點縣市 chip 設定基地縣）
        REGIONS.forEach((region) => {
            const isAnchorRegion = region.prefs.includes(this.anchorPref);
            const hasNeighborInRegion = this.anchorPref
                && region.prefs.some((p) => neighbors.includes(p));
            const isExpanded = this.expandedRegions.has(region.key);
            const anchorColor = this.theme === 'dark' ? '#ffd166' : '#d97706';
            const neighborColor = this.theme === 'dark' ? '#74b9ff' : '#2563eb';

            const group = document.createElement('div');
            group.className = 'region-group';

            const header = document.createElement('button');
            header.type = 'button';
            header.className = 'region-header' + (isAnchorRegion || hasNeighborInRegion ? ' has-selection' : '');
            header.style.borderLeftColor = isAnchorRegion ? anchorColor : (hasNeighborInRegion ? neighborColor : 'var(--border-subtle)');
            header.innerHTML = `
                <span class="region-label">${region.label}</span>
                ${isAnchorRegion ? `<span class="region-count" style="color:${anchorColor}">基地</span>` : (hasNeighborInRegion ? `<span class="region-count" style="color:${neighborColor}">隣縣</span>` : '')}
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
                    chip.type = 'button';
                    chip.className = 'chip pref-chip'
                        + (isAnchor ? ' pref-anchor' : (isNeighbor ? ' pref-neighbor' : ''));
                    chip.textContent = pref;
                    chip.addEventListener('click', () => {
                        this.anchorPref = isAnchor ? null : pref;
                        this.renderFilter();
                        this.renderSidebar();
                    });
                    prefWrap.appendChild(chip);
                });
                group.appendChild(prefWrap);
            }

            wrap.appendChild(group);
        });
    }

    bindEvents() {
        const themeBtn = document.getElementById('theme-toggle');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => this.toggleTheme());
        }

        const guideBtn = document.getElementById('guide-toggle');
        if (guideBtn) {
            guideBtn.addEventListener('click', () => this.openGuideModal());
        }

        document.getElementById('toggle-control-panel')
            .addEventListener('click', () => this.setControlCollapsed(!this.isControlCollapsed));

        document.getElementById('toggle-draw-scope')
            ?.addEventListener('click', () => {
                if (!this.anchorPref) return;
                const neighbors = PREF_ADJACENCY[this.anchorPref] || [];
                if (neighbors.length === 0) return;

                // 循環三種模式：'only-anchor' -> 'with-neighbors' -> 'only-neighbors' -> 'only-anchor'
                if (this.drawScopeMode === 'only-anchor') {
                    this.drawScopeMode = 'with-neighbors';
                } else if (this.drawScopeMode === 'with-neighbors') {
                    this.drawScopeMode = 'only-neighbors';
                } else {
                    this.drawScopeMode = 'only-anchor';
                }
                this.renderFilter();
            });
        document.getElementById('toggle-include-islands')
            ?.addEventListener('click', () => {
                this.includeIslands = !this.includeIslands;
                this.renderFilter();
            });

        document.getElementById('random-select')
            .addEventListener('click', () => this.handleRandomSelect());
        document.getElementById('clear-selection')
            .addEventListener('click', () => this.handleClear());
        document.getElementById('reset-filter')
            .addEventListener('click', () => {
                this.anchorPref = null;
                this.renderFilter();
                this.renderSidebar();
            });

        const countInput = document.getElementById('count');
        countInput.addEventListener('change', () => {
            const v = parseInt(countInput.value, 10);
            if (Number.isNaN(v) || v < 1) countInput.value = '1';
            else if (v > 50) countInput.value = '50';
        });

        // 地圖移動、縮放或清單捲動時，即時更新指示輔助虛線
        this.map.map.on('move zoom viewreset resize', () => this.updateLeaderLines());
        document.getElementById('selected-areas')
            .addEventListener('scroll', () => this.updateLeaderLines());
        window.addEventListener('resize', () => this.updateLeaderLines());
    }

    // 依基地縣、抽籤模式、是否包含偏遠離島回傳目前可抽選的 feature id 池
    poolIds() {
        const neighbors = this.anchorPref ? (PREF_ADJACENCY[this.anchorPref] || []) : [];
        const hasNeighbors = neighbors.length > 0;
        let pool = null;

        if (this.anchorPref) {
            if (!hasNeighbors || this.drawScopeMode === 'only-anchor') {
                pool = new Set([this.anchorPref]);
            } else if (this.drawScopeMode === 'with-neighbors') {
                pool = new Set([this.anchorPref, ...neighbors]);
            } else {
                pool = new Set(neighbors);
            }
        }

        return this.map.getAllFeatures()
            .filter((f) => {
                if (!this.includeIslands && f.properties.isRemoteIsland) return false;
                if (!pool) return true;
                return pool.has(f.properties.prefecture);
            })
            .map((f) => f.properties.id);
    }

    handleRandomSelect() {
        if (this.map.isDrawing) return;
        const count = parseInt(document.getElementById('count').value, 10) || 5;
        const pool = this.poolIds();
        const availableCount = pool.filter((id) => !this.map.selectedIds.has(id)).length;
        if (availableCount === 0) {
            this.notify('此範圍內所有區域都已被選取', 'info');
            return;
        }

        // 先收合右上控制面板，讓使用者完整觀看地圖上的輪盤跳動動畫
        this.setControlCollapsed(true);

        const randomBtn = document.getElementById('random-select');
        const banner = document.getElementById('roulette-banner');
        const bannerText = document.getElementById('roulette-text');
        if (randomBtn) randomBtn.disabled = true;
        if (banner) {
            banner.classList.remove('hidden', 'is-locked');
            bannerText.textContent = '輪盤抽選中⋯';
        }

        this.map.randomSelect(count, pool, {
            onTick: ({ feature, locked, lockIndex, totalLocks }) => {
                if (!banner || !bannerText) return;
                const p = feature.properties;
                if (locked) {
                    banner.classList.add('is-locked');
                    bannerText.textContent = `🎯 鎖定 (${lockIndex}/${totalLocks})：${p.prefecture} ${p.name}`;
                } else {
                    banner.classList.remove('is-locked');
                    bannerText.textContent = `${p.prefecture} ${p.name}`;
                }
            },
            onComplete: (picked) => {
                if (randomBtn) randomBtn.disabled = false;
                if (banner) {
                    setTimeout(() => banner.classList.add('hidden'), 900);
                }
                this.notify(`🎉 已抽中 ${picked.length} 個區域！`, 'success');
            }
        });
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
            this.updateLeaderLines();
            return;
        }
        feats.forEach((f) => {
            const p = f.properties;
            const badgeColor = this.getPrefStatusColor(p.prefecture);
            const isActive = this.map.activeId === p.id;
            const postCount = this.infoPanel.store.getAreaPostCount(p.id);

            const card = document.createElement('div');
            card.className = 'area-card' + (isActive ? ' active' : '');
            card.dataset.areaId = p.id;
            card.innerHTML = `
                <div class="area-card-top">
                    <div class="area-card-title-wrap">
                        <span class="area-card-dot"></span>
                        <span class="area-card-name">${p.name}</span>
                        ${postCount > 0 ? `<span class="area-card-post-indicator" title="有 ${postCount} 則旅遊分享">📷 ${postCount}</span>` : ''}
                    </div>
                    <div class="area-card-actions">
                        <span class="area-card-badge" style="color:${badgeColor};border-color:${badgeColor}66;background:${badgeColor}1a">${p.prefecture}</span>
                        <button type="button" class="area-card-remove" title="移除選取">✕</button>
                    </div>
                </div>`;

            // 點擊未注目卡片 → 飛至該區並注目；再次點擊已注目卡片 → 取消注目
            card.addEventListener('click', () => {
                if (this.map.activeId === p.id) {
                    this.map.unfocusArea();
                } else {
                    this.map.flyToArea(p.id);
                }
            });
            card.addEventListener('mouseenter', () => {
                this.hoveredCardId = p.id;
                this.updateLeaderLines();
            });
            card.addEventListener('mouseleave', () => {
                if (this.hoveredCardId === p.id) {
                    this.hoveredCardId = null;
                    this.updateLeaderLines();
                }
            });
            card.querySelector('.area-card-remove').addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.hoveredCardId === p.id) this.hoveredCardId = null;
                this.map.removeSelect(p.id);
            });
            container.appendChild(card);
        });

        requestAnimationFrame(() => this.updateLeaderLines());
    }

    // 繪製從右側「已選取區域卡片」連往地圖實際位置的指示輔助虛線
    updateLeaderLines() {
        const svg = document.getElementById('leader-lines-svg');
        const mainContent = document.querySelector('.main-content');
        const listEl = document.getElementById('selected-areas');
        if (!svg || !mainContent || !listEl || !this.map) return;

        // 手機版（螢幕寬度 <= 768px）面板橫跨全螢幕，直接隱藏 SVG 虛線，改由卡片點擊聚焦放大提示
        if (window.innerWidth <= 768) {
            svg.innerHTML = '';
            return;
        }

        const mainRect = mainContent.getBoundingClientRect();
        const listRect = listEl.getBoundingClientRect();
        svg.setAttribute('viewBox', `0 0 ${mainRect.width} ${mainRect.height}`);
        svg.innerHTML = '';

        const cards = listEl.querySelectorAll('.area-card');
        if (cards.length === 0) return;

        cards.forEach((card) => {
            const areaId = card.dataset.areaId;
            if (!areaId) return;

            const cardRect = card.getBoundingClientRect();
            const cardMidY = cardRect.top + cardRect.height / 2;
            // 若卡片因捲動而超出清單可視範圍，則不繪製該條線
            if (cardMidY < listRect.top - 4 || cardMidY > listRect.bottom + 4) return;

            const mapPt = this.map.getAreaContainerPoint(areaId);
            if (!mapPt) return;

            // 起點：右側卡片左邊緣中央；終點：地圖上該區域中心
            const x1 = cardRect.left - mainRect.left;
            const y1 = cardMidY - mainRect.top;
            const x2 = mapPt.x;
            const y2 = mapPt.y;

            const isFocused = this.map.activeId === areaId || this.hoveredCardId === areaId;
            const lineClass = isFocused ? 'leader-line is-focused' : 'leader-line';
            const dotClass = isFocused ? 'leader-dot is-focused' : 'leader-dot';

            // 使用平滑曲線虛線連接卡片與地圖位置
            const dx = Math.max(40, Math.min(140, Math.abs(x1 - x2) * 0.28));
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', `M ${x1} ${y1} C ${x1 - dx} ${y1}, ${x2 + dx * 0.4} ${y2}, ${x2} ${y2}`);
            path.setAttribute('class', lineClass);
            svg.appendChild(path);

            // 地圖端錨點小圓點
            const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dot.setAttribute('cx', String(x2));
            dot.setAttribute('cy', String(y2));
            dot.setAttribute('r', isFocused ? '4.5' : '3');
            dot.setAttribute('class', dotClass);
            svg.appendChild(dot);
        });
    }

    initGuideModal() {
        this.tourCurrentStep = 0;
        this.tourSteps = [
            {
                targetSelector: '.popular-prefs-box',
                title: '📍 步驟 1：選擇基地縣市',
                desc: '點擊此處的<strong>熱門基地標籤</strong>（例如東京都、大阪府），或展開下方地區選單挑選任一縣市。若不選取，預設為「全日本」大範圍抽選。'
            },
            {
                targetSelector: '.draw-options-row',
                title: '🎯 步驟 2：設定抽籤範圍與離島',
                desc: '點擊可切換<strong>「🎯 僅限基地縣」</strong>（單一縣內選取）或<strong>「🌐 基地＋鄰縣」</strong>，並可自由排除或納入需要搭機搭船的偏遠離島。'
            },
            {
                targetSelector: '.controls-row',
                title: '🎲 步驟 3：輸入數量並隨機選取',
                desc: '設定想要隨機抽選的景點數量（1～50），按下<strong>「隨機選取」</strong>按鈕，地圖就會開始跳動輪盤動畫並鎖定命中地點！'
            },
            {
                targetSelector: '#results-panel',
                title: '📋 步驟 4：查看結果與互動',
                desc: '選中的區域會排列在此清單中。<strong>點擊任一卡片</strong>，地圖會自動飛至該行政區中心，並在左側展開 Google Maps、景點美食與遊客照片牆！'
            }
        ];

        const overlay = document.getElementById('tour-overlay');
        const skipBtn = document.getElementById('tour-skip-btn');
        const prevBtn = document.getElementById('tour-prev-btn');
        const nextBtn = document.getElementById('tour-next-btn');

        if (!overlay) return;

        if (skipBtn) skipBtn.addEventListener('click', () => this.endTour());
        if (prevBtn) prevBtn.addEventListener('click', () => this.prevTourStep());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextTourStep());

        window.addEventListener('resize', () => {
            if (!overlay.classList.contains('hidden')) {
                this.renderTourStep(this.tourCurrentStep);
            }
        });

        // 首次造訪自動啟動高亮導覽（使用者完成或跳過後寫入 localStorage）
        const dismissed = typeof localStorage !== 'undefined' && localStorage.getItem('japanfun_tour_dismissed_v1_1') === 'true';
        if (!dismissed) {
            setTimeout(() => this.startTour(), 750);
        }
    }

    startTour() {
        // 先展開控制面板，確保所有導覽元素可見
        this.setControlCollapsed(false);
        this.tourCurrentStep = 0;
        const overlay = document.getElementById('tour-overlay');
        if (overlay) overlay.classList.remove('hidden');
        setTimeout(() => this.renderTourStep(0), 100);
    }

    endTour() {
        const overlay = document.getElementById('tour-overlay');
        if (overlay) overlay.classList.add('hidden');
        document.querySelectorAll('.tour-highlight-active').forEach((el) => {
            el.classList.remove('tour-highlight-active');
        });
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('japanfun_tour_dismissed_v1_1', 'true');
        }
    }

    prevTourStep() {
        if (this.tourCurrentStep > 0) {
            this.tourCurrentStep -= 1;
            this.renderTourStep(this.tourCurrentStep);
        }
    }

    nextTourStep() {
        if (this.tourCurrentStep < this.tourSteps.length - 1) {
            this.tourCurrentStep += 1;
            this.renderTourStep(this.tourCurrentStep);
        } else {
            this.endTour();
            this.notify('導覽完成！隨時點選頂部「🎯 操作導覽」可再次複習。', 'success');
        }
    }

    renderTourStep(stepIndex) {
        const step = this.tourSteps[stepIndex];
        if (!step) return;

        const targetEl = document.querySelector(step.targetSelector);
        const cutout = document.getElementById('tour-mask-cutout');
        const popover = document.getElementById('tour-popover');
        const badge = document.getElementById('tour-step-badge');
        const titleEl = document.getElementById('tour-step-title');
        const descEl = document.getElementById('tour-step-desc');
        const prevBtn = document.getElementById('tour-prev-btn');
        const nextBtn = document.getElementById('tour-next-btn');

        if (!targetEl || !popover || !cutout) return;

        // 移除先前的 active outline
        document.querySelectorAll('.tour-highlight-active').forEach((el) => {
            el.classList.remove('tour-highlight-active');
        });
        targetEl.classList.add('tour-highlight-active');

        // 計算目標元素的精確視窗座標
        const rect = targetEl.getBoundingClientRect();
        const padding = 6;
        const cutX = Math.max(0, rect.left - padding);
        const cutY = Math.max(0, rect.top - padding);
        const cutW = rect.width + padding * 2;
        const cutH = rect.height + padding * 2;

        cutout.setAttribute('x', String(cutX));
        cutout.setAttribute('y', String(cutY));
        cutout.setAttribute('width', String(cutW));
        cutout.setAttribute('height', String(cutH));

        // 更新文字
        if (badge) badge.textContent = `步驟 ${stepIndex + 1} / ${this.tourSteps.length}`;
        if (titleEl) titleEl.innerHTML = step.title;
        if (descEl) descEl.innerHTML = step.desc;

        if (prevBtn) prevBtn.disabled = stepIndex === 0;
        if (nextBtn) nextBtn.textContent = stepIndex === this.tourSteps.length - 1 ? '完成導覽 🎉' : '下一步 ➔';

        // 定位說明 Popover：在電腦版盡量放在目標左側；手機版由 CSS 底部全寬固定
        if (window.innerWidth > 768) {
            const popW = 320;
            let popLeft = rect.left - popW - 16;
            if (popLeft < 16) {
                // 若左側空間不足則放下方或右方
                popLeft = Math.max(16, rect.left);
            }
            let popTop = Math.max(20, Math.min(window.innerHeight - 240, rect.top));
            popover.style.top = `${popTop}px`;
            popover.style.left = `${popLeft}px`;
        }
    }

    openGuideModal() {
        this.startTour();
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
