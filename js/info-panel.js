// 左側區域資訊區塊：Google Maps 探索、Wikipedia 自動簡介、網友遊玩照片與心得投稿

const STORAGE_KEY = 'tokyofun_community_posts_v1';

// 常見日文新字體 → 繁體中文字元對照，提升中文維基百科命中率
const KANJI_TO_ZH_MAP = {
    '区': '區', '県': '縣', '沢': '澤', '浜': '濱', '渋': '澀',
    '広': '廣', '関': '關', '辺': '邊', '国': '國', '児': '兒',
    '竜': '龍', '桜': '櫻', '栄': '榮', '豊': '豐', '発': '發',
    '稲': '稻', '狭': '狹', '蔵': '藏', '条': '條', '郷': '鄉',
    '島': '島', 'ヶ': '之', 'ノ': '之', '横': '橫', '黒': '黑',
    '緑': '綠', '鶴': '鶴', '亀': '龜', '塩': '鹽', '芦': '蘆'
};

function toTraditionalKanji(str) {
    return Array.from(str).map((ch) => KANJI_TO_ZH_MAP[ch] || ch).join('');
}

function buildGoogleMapsUrls(prefecture, name) {
    if (prefecture === '千葉県' && name === '所属未定地') {
        return {
            place: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('ふなばし三番瀬海浜公園')}`,
            sightseeing: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('三番瀬 観光スポット')}`,
            food: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('船橋港 グルメ')}`
        };
    }
    if (prefecture === '東京都' && name === '所属未定地') {
        return {
            place: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('孀婦岩 鳥島')}`,
            sightseeing: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('孀婦岩')}`,
            food: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('八丈島 グルメ')}`
        };
    }
    const full = `${prefecture}${name}`;
    return {
        place: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(full)}`,
        sightseeing: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(full + ' 観光スポット')}`,
        food: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(full + ' グルメ')}`
    };
}

function buildWikiQueryCandidates(prefecture, name) {
    if (prefecture === '千葉県' && name === '所属未定地') {
        return {
            zh: ['三番瀨'],
            ja: ['三番瀬', 'ふなばし三番瀬海浜公園', '境界未定地域']
        };
    }
    if (prefecture === '東京都' && name === '所属未定地') {
        return {
            zh: ['孀婦岩', '鳥島 (八丈支廳)', '須美壽島', '巴約訥斯礁'],
            ja: ['孀婦岩', '鳥島 (八丈支庁)', '須美寿島', 'ベヨネース列岩']
        };
    }
    const zhName = toTraditionalKanji(name);
    const zhPref = toTraditionalKanji(prefecture);
    const zhSet = new Set([zhName, name, `${zhPref}${zhName}`]);
    const jaSet = new Set([name, `${prefecture}${name}`]);
    return {
        zh: [...zhSet],
        ja: [...jaSet]
    };
}

// 社群投稿儲存層（自動優先使用 Cloudflare Pages Functions D1+R2 API `/api/posts`，無後端時自動 fallback 至 localStorage）
class CommunityStore {
    constructor(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
        this.storage = storage;
        this.remoteCounts = new Map();
        this.remotePostsByArea = new Map();
    }

    _readAll() {
        if (!this.storage) return [];
        try {
            const raw = this.storage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    _writeAll(posts) {
        if (!this.storage) return;
        this.storage.setItem(STORAGE_KEY, JSON.stringify(posts));
    }

    getPostsByArea(areaId) {
        if (this.remotePostsByArea.has(areaId)) {
            return this.remotePostsByArea.get(areaId);
        }
        return this._readAll()
            .filter((p) => p.areaId === areaId)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    getAreaPostCount(areaId) {
        if (this.remoteCounts.has(areaId)) {
            return this.remoteCounts.get(areaId);
        }
        return this.getPostsByArea(areaId).length;
    }

    addPost({ areaId, author, visitDate, comment, photoDataUrl }) {
        const posts = this._readAll();
        const newPost = {
            id: `post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            areaId,
            author: (author || '匿名旅人').trim(),
            visitDate: visitDate || new Date().toISOString().slice(0, 10),
            comment: (comment || '').trim(),
            photoDataUrl: photoDataUrl || null,
            createdAt: new Date().toISOString()
        };
        posts.push(newPost);
        this._writeAll(posts);
        return newPost;
    }

    deletePost(postId) {
        const posts = this._readAll().filter((p) => p.id !== postId);
        this._writeAll(posts);
    }

    async syncCountsAsync() {
        if (typeof fetch === 'undefined') return false;
        try {
            const res = await fetch('/api/posts');
            if (!res.ok) return false;
            const data = await res.json();
            if (Array.isArray(data.counts)) {
                this.remoteCounts.clear();
                data.counts.forEach((row) => {
                    this.remoteCounts.set(row.areaId, Number(row.count) || 0);
                });
                return true;
            }
        } catch {
            // 本地靜態伺服器無 /api/posts 時自動維持 localStorage 模式
        }
        return false;
    }

    async fetchPostsByAreaAsync(areaId) {
        if (typeof fetch === 'undefined') return this.getPostsByArea(areaId);
        try {
            const res = await fetch(`/api/posts?areaId=${encodeURIComponent(areaId)}`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data.posts)) {
                    this.remotePostsByArea.set(areaId, data.posts);
                    this.remoteCounts.set(areaId, data.posts.length);
                    return data.posts;
                }
            }
        } catch {
            // Fallback 至 localStorage
        }
        return this.getPostsByArea(areaId);
    }

    async submitPostAsync(payload) {
        if (typeof fetch !== 'undefined') {
            try {
                const res = await fetch('/api/posts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    const data = await res.json();
                    await this.fetchPostsByAreaAsync(payload.areaId);
                    return data.post;
                }
            } catch {
                // Fallback 至 localStorage
            }
        }
        return this.addPost(payload);
    }

    async deletePostAsync(postId, areaId) {
        if (typeof fetch !== 'undefined') {
            try {
                const adminKey = typeof localStorage !== 'undefined' ? localStorage.getItem('japanfun_admin_secret_key') : '';
                const res = await fetch(`/api/posts?id=${encodeURIComponent(postId)}`, {
                    method: 'DELETE',
                    headers: adminKey ? { 'x-admin-key': adminKey } : {}
                });
                if (res.ok) {
                    await this.fetchPostsByAreaAsync(areaId);
                    return;
                }
            } catch {
                // Fallback 至 localStorage
            }
        }
        this.deletePost(postId);
    }
}

// 瀏覽器端圖片壓縮（長邊最大 1200px，轉為 WebP 或 JPEG 節省空間）
function compressImageToDataUrl(file, maxSide = 1200, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('圖片讀取失敗'));
        reader.onload = (e) => {
            const img = new Image();
            img.onerror = () => reject(new Error('圖片格式不支援'));
            img.onload = () => {
                let { width, height } = img;
                if (width > maxSide || height > maxSide) {
                    if (width >= height) {
                        height = Math.round((height * maxSide) / width);
                        width = maxSide;
                    } else {
                        width = Math.round((width * maxSide) / height);
                        height = maxSide;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                let out = canvas.toDataURL('image/webp', quality);
                if (!out.startsWith('data:image/webp')) {
                    out = canvas.toDataURL('image/jpeg', quality);
                }
                resolve(out);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

class AreaInfoPanel {
    constructor({ onClose, onPostsChange, notify } = {}) {
        this.panelEl = typeof document !== 'undefined' ? document.getElementById('info-panel') : null;
        this.onClose = onClose || (() => {});
        this.onPostsChange = onPostsChange || (() => {});
        this.notify = notify || (() => {});
        this.store = new CommunityStore();
        this.wikiCache = new Map();
        this.currentFeature = null;
        this.pendingPhotoDataUrl = null;
        this._initLightbox();
    }

    _initLightbox() {
        if (typeof document === 'undefined') return;
        let lb = document.getElementById('photo-lightbox');
        if (!lb) {
            lb = document.createElement('div');
            lb.id = 'photo-lightbox';
            lb.className = 'lightbox hidden';
            lb.innerHTML = `
                <button class="lightbox-close" aria-label="關閉預覽">✕</button>
                <img class="lightbox-img" src="" alt="照片放大預覽">
                <div class="lightbox-caption"></div>`;
            lb.addEventListener('click', (e) => {
                if (e.target === lb || e.target.classList.contains('lightbox-close')) {
                    lb.classList.add('hidden');
                }
            });
            document.body.appendChild(lb);
        }
        this.lightboxEl = lb;
    }

    openLightbox(src, captionText = '') {
        if (!this.lightboxEl) return;
        this.lightboxEl.querySelector('.lightbox-img').src = src;
        this.lightboxEl.querySelector('.lightbox-caption').textContent = captionText;
        this.lightboxEl.classList.remove('hidden');
    }

    async fetchWikiSummary(prefecture, name) {
        const cacheKey = `${prefecture}${name}`;
        if (this.wikiCache.has(cacheKey)) return this.wikiCache.get(cacheKey);

        // 特例支援：千葉縣所屬未定地（三番瀨／市川・船橋境界地先）專屬歷史由來介紹
        if (prefecture === '千葉県' && name === '所属未定地') {
            let thumbUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Sanbanze_ichikawa.jpg/320px-Sanbanze_ichikawa.jpg';
            try {
                const res = await fetch('https://ja.wikipedia.org/api/rest_v1/page/summary/%E4%B8%89%E7%95%AA%E7%80%AC');
                if (res.ok) {
                    const data = await res.json();
                    if (data.thumbnail?.source) {
                        thumbUrl = data.thumbnail.source;
                    }
                }
            } catch {
                // 離線或 API 暫時無法連線時維持預設有效縮圖
            }

            const specialResult = {
                lang: 'zh',
                title: '三番瀨人工海濱（市川・船橋境界所屬未定地）',
                extract: '位於東京灣沿岸市川市（東濱）與船橋市（潮見町）交界處的公有水面填海地與三番瀨人工海濱。1970年代末作為京葉港第二期填海計畫之暫定設施而填造；後因三番瀨濕地環境保育運動促使填海計畫中止，這塊土地未能完成正式劃入特定市町村的法定程序。2014年市川市與船橋市簽署協定改由兩市「共同使用、共同管理」，但在國土地理院與國土數值情報等公務地籍統計圖資中，至今仍作為特異的獨立「所屬未定地」保留。',
                thumbnail: thumbUrl,
                url: 'https://ja.wikipedia.org/wiki/%E4%B8%89%E7%95%AA%E7%80%AC'
            };
            this.wikiCache.set(cacheKey, specialResult);
            return specialResult;
        }

        // 特例支援：東京都所屬未定地（伊豆諸島南方直轄孤島：孀婦岩・鳥島・須美寿島・ベヨネース列岩）
        if (prefecture === '東京都' && name === '所属未定地') {
            let thumbUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Soufuiwa_07.jpg/320px-Soufuiwa_07.jpg';
            try {
                const res = await fetch('https://ja.wikipedia.org/api/rest_v1/page/summary/%E5%AD%80%E5%A9%A6%E5%B2%A9');
                if (res.ok) {
                    const data = await res.json();
                    if (data.thumbnail?.source) {
                        thumbUrl = data.thumbnail.source;
                    }
                }
            } catch {
                // 離線維持有效縮圖
            }

            const specialResult = {
                lang: 'zh',
                title: '伊豆諸島南方孤立島礁（孀婦岩・鳥島等 東京都直轄所屬未定地）',
                extract: '位於伊豆諸島青島以南數百公里太平洋上的四處絕海孤島與火山岩礁群（孀婦岩、鳥島、須美壽島、巴約訥斯礁）。行政上雖屬於東京都，但不劃入任何區市町村管轄，由東京都總務局八丈支廳直接管轄，因此在國土地理院公務圖資中被標記為「東京都所屬未定地」。全境皆為活火山無人島礁，其中鳥島為國際級稀有鳥類短尾信天翁的最大繁殖基地，孀婦岩則是海上拔起99公尺的垂直玄武岩柱，常人皆無法登島。',
                thumbnail: thumbUrl,
                url: 'https://ja.wikipedia.org/wiki/%E5%AD%80%E5%A9%A6%E5%B2%A9'
            };
            this.wikiCache.set(cacheKey, specialResult);
            return specialResult;
        }

        const candidates = buildWikiQueryCandidates(prefecture, name);

        // 1. 優先查詢中文維基百科（指定 zh-TW 轉換）
        for (const title of candidates.zh) {
            try {
                const res = await fetch(
                    `https://zh.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
                    { headers: { 'Accept-Language': 'zh-TW,zh-Hant;q=0.9' } }
                );
                if (res.ok) {
                    const data = await res.json();
                    if (data.type !== 'disambiguation' && data.extract) {
                        const result = {
                            lang: 'zh',
                            title: data.title,
                            extract: data.extract,
                            thumbnail: data.thumbnail?.source || null,
                            url: data.content_urls?.desktop?.page || `https://zh.wikipedia.org/wiki/${encodeURIComponent(title)}`
                        };
                        this.wikiCache.set(cacheKey, result);
                        return result;
                    }
                }
            } catch {
                // 忽略單次網路錯誤，繼續嘗試候選詞
            }
        }

        // 2. Fallback 至日文維基百科
        for (const title of candidates.ja) {
            try {
                const res = await fetch(
                    `https://ja.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
                );
                if (res.ok) {
                    const data = await res.json();
                    if (data.type !== 'disambiguation' && data.extract) {
                        const result = {
                            lang: 'ja',
                            title: data.title,
                            extract: data.extract,
                            thumbnail: data.thumbnail?.source || null,
                            url: data.content_urls?.desktop?.page || `https://ja.wikipedia.org/wiki/${encodeURIComponent(title)}`
                        };
                        this.wikiCache.set(cacheKey, result);
                        return result;
                    }
                }
            } catch {
                // 忽略錯誤
            }
        }

        this.wikiCache.set(cacheKey, null);
        return null;
    }

    open(feature, { badgeColor } = {}) {
        if (!this.panelEl || !feature) return;
        this.currentFeature = feature;
        this.currentBadgeColor = badgeColor || '#74b9ff';
        this.pendingPhotoDataUrl = null;
        this.panelEl.classList.remove('hidden');
        this.render();
        // 若部署於 Cloudflare Pages，非同步向 D1 抓取最新網友投稿並更新畫面
        const targetId = feature.properties.id;
        this.store.fetchPostsByAreaAsync(targetId).then((posts) => {
            if (this.currentFeature && this.currentFeature.properties.id === targetId) {
                this._renderPostsList(posts, feature.properties);
                const titleEl = this.panelEl.querySelector('.community-block .info-block-title');
                if (titleEl) titleEl.textContent = `📷 網友遊玩照片＆心得 (${posts.length})`;
                this.onPostsChange();
            }
        });
    }

    close() {
        if (!this.panelEl) return;
        this.currentFeature = null;
        this.panelEl.classList.add('hidden');
        this.onClose();
    }

    render() {
        if (!this.panelEl || !this.currentFeature) return;
        const p = this.currentFeature.properties;
        const color = this.currentBadgeColor || '#74b9ff';
        const maps = buildGoogleMapsUrls(p.prefecture, p.name);
        const posts = this.store.getPostsByArea(p.id);

        this.panelEl.innerHTML = `
            <div class="info-header">
                <div class="info-title-group">
                    <div class="info-badges">
                        <span class="area-card-badge" style="color:${color};border-color:${color}66;background:${color}1a">${p.prefecture}</span>
                        <span class="info-type-badge">${p.type}</span>
                    </div>
                    <h2 class="info-area-name">${p.name}</h2>
                </div>
                <button class="btn-icon-close" id="close-info-panel" title="關閉區域資訊">✕</button>
            </div>

            <div class="info-scroll-body">
                <!-- Google Maps 探索連結 -->
                <div class="info-block">
                    <div class="info-block-title">🗺️ Google Maps 探索</div>
                    <div class="gmaps-actions">
                        <a href="${maps.place}" target="_blank" rel="noopener" class="gmaps-btn">📍 地圖位置</a>
                        <a href="${maps.sightseeing}" target="_blank" rel="noopener" class="gmaps-btn">⛩️ 熱門景點</a>
                        <a href="${maps.food}" target="_blank" rel="noopener" class="gmaps-btn">🍜 在地美食</a>
                    </div>
                </div>

                <!-- 維基百科區域簡介 -->
                <div class="info-block">
                    <div class="info-block-title">📖 區域簡介</div>
                    <div id="wiki-content" class="wiki-box">
                        <div class="wiki-loading">載入百科簡介中⋯</div>
                    </div>
                </div>

                <!-- 網友遊玩照片與心得 -->
                <div class="info-block community-block">
                    <div class="info-block-header">
                        <span class="info-block-title">📷 網友遊玩照片＆心得 (${posts.length})</span>
                        <button id="toggle-upload-form" class="btn-small-accent">＋ 我要投稿</button>
                    </div>

                    <form id="community-upload-form" class="upload-form hidden">
                        <div class="form-row">
                            <input type="text" id="post-author" placeholder="你的暱稱（選填）" maxlength="24">
                            <input type="date" id="post-date" value="${new Date().toISOString().slice(0, 10)}">
                        </div>
                        <textarea id="post-comment" rows="3" placeholder="分享你在 ${p.name} 的旅遊回憶、私房景點或美食推薦⋯" maxlength="300"></textarea>
                        <div class="upload-file-row">
                            <label class="file-pick-label" for="post-photo">
                                🖼️ 選擇照片（自動壓縮）
                            </label>
                            <input type="file" id="post-photo" accept="image/*" class="hidden-file-input">
                            <span id="photo-status" class="photo-status">未選擇照片</span>
                        </div>
                        <div id="photo-preview-wrap" class="photo-preview-wrap hidden">
                            <img id="photo-preview-img" src="" alt="上傳預覽">
                            <button type="button" id="remove-photo-btn" class="remove-photo-btn">✕ 移除照片</button>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn-primary btn-submit-post">發佈投稿</button>
                        </div>
                    </form>

                    <div id="community-posts-list" class="community-posts-list"></div>
                </div>
            </div>
        `;

        this._bindPanelEvents(p, posts);
        this._loadWikiIntoDom(p);
    }

    _bindPanelEvents(props, posts) {
        this.panelEl.querySelector('#close-info-panel')
            .addEventListener('click', () => this.close());

        const toggleFormBtn = this.panelEl.querySelector('#toggle-upload-form');
        const uploadForm = this.panelEl.querySelector('#community-upload-form');
        toggleFormBtn.addEventListener('click', () => {
            const isHidden = uploadForm.classList.toggle('hidden');
            toggleFormBtn.textContent = isHidden ? '＋ 我要投稿' : '收起表單';
        });

        const fileInput = this.panelEl.querySelector('#post-photo');
        const photoStatus = this.panelEl.querySelector('#photo-status');
        const previewWrap = this.panelEl.querySelector('#photo-preview-wrap');
        const previewImg = this.panelEl.querySelector('#photo-preview-img');
        const removePhotoBtn = this.panelEl.querySelector('#remove-photo-btn');

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            photoStatus.textContent = '壓縮處理中⋯';
            try {
                this.pendingPhotoDataUrl = await compressImageToDataUrl(file);
                previewImg.src = this.pendingPhotoDataUrl;
                previewWrap.classList.remove('hidden');
                photoStatus.textContent = '已準備好上傳';
            } catch (err) {
                photoStatus.textContent = err.message || '圖片處理失敗';
            }
        });

        removePhotoBtn.addEventListener('click', () => {
            this.pendingPhotoDataUrl = null;
            fileInput.value = '';
            previewWrap.classList.add('hidden');
            photoStatus.textContent = '未選擇照片';
        });

        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const author = this.panelEl.querySelector('#post-author').value;
            const visitDate = this.panelEl.querySelector('#post-date').value;
            const comment = this.panelEl.querySelector('#post-comment').value.trim();

            if (!comment && !this.pendingPhotoDataUrl) {
                this.notify('請至少上傳一張照片或填寫旅遊心得', 'error');
                return;
            }

            const submitBtn = uploadForm.querySelector('.btn-submit-post');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = '上傳發佈中⋯';
            }

            const resPost = await this.store.submitPostAsync({
                areaId: props.id,
                author,
                visitDate,
                comment,
                photoDataUrl: this.pendingPhotoDataUrl
            });

            this.pendingPhotoDataUrl = null;
            if (resPost?.status === 'pending') {
                this.notify(`已收到你在 ${props.name} 的旅遊分享！管理員審核通過後即會公開上架。`, 'success');
            } else {
                this.notify(`已新增 ${props.name} 的旅遊分享！`, 'success');
            }
            this.onPostsChange();
            this.render();
        });

        this._renderPostsList(posts, props);
    }

    _renderPostsList(posts, props) {
        const listEl = this.panelEl.querySelector('#community-posts-list');
        if (!listEl) return;

        if (posts.length === 0) {
            listEl.innerHTML = `
                <div class="empty-posts">
                    <p>目前還沒有人分享 <strong>${props.name}</strong> 的遊玩紀錄。</p>
                    <p class="empty-posts-sub">點擊上方「＋ 我要投稿」成為第一位分享照片或心得的旅人吧！</p>
                </div>`;
            return;
        }

        const isAdmin = typeof localStorage !== 'undefined' && Boolean(localStorage.getItem('japanfun_admin_secret_key'));

        listEl.innerHTML = '';
        posts.forEach((post) => {
            const item = document.createElement('article');
            item.className = 'post-card';
            item.innerHTML = `
                ${post.photoDataUrl ? `<div class="post-photo-wrap"><img src="${post.photoDataUrl}" alt="${props.name} 旅遊照片" class="post-photo"></div>` : ''}
                <div class="post-body">
                    <div class="post-meta">
                        <span class="post-author">👤 ${this._escapeHtml(post.author)}</span>
                        <span class="post-date">${this._escapeHtml(post.visitDate)}</span>
                        ${isAdmin ? `<button class="post-delete-btn" title="管理員刪除此則分享">🗑️</button>` : ''}
                    </div>
                    ${post.comment ? `<p class="post-comment">${this._escapeHtml(post.comment)}</p>` : ''}
                </div>`;

            if (post.photoDataUrl) {
                item.querySelector('.post-photo').addEventListener('click', () => {
                    this.openLightbox(
                        post.photoDataUrl,
                        `${props.prefecture} ${props.name} — ${post.author} (${post.visitDate})${post.comment ? '：' + post.comment : ''}`
                    );
                });
            }

            const deleteBtn = item.querySelector('.post-delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', async () => {
                    if (confirm('確定要下架此篇投稿嗎？')) {
                        await this.store.deletePostAsync(post.id, props.id);
                        this.onPostsChange();
                        this.render();
                    }
                });
            }

            listEl.appendChild(item);
        });
    }

    async _loadWikiIntoDom(props) {
        const targetId = props.id;
        const wiki = await this.fetchWikiSummary(props.prefecture, props.name);
        if (!this.currentFeature || this.currentFeature.properties.id !== targetId) return;

        const box = this.panelEl.querySelector('#wiki-content');
        if (!box) return;

        if (!wiki) {
            box.innerHTML = `<p class="wiki-empty">暫無維基百科條目摘要，可點選上方 Google Maps 按鈕探索當地資訊。</p>`;
            return;
        }

        box.innerHTML = `
            ${wiki.thumbnail ? `<img class="wiki-thumb" src="${wiki.thumbnail}" alt="${this._escapeHtml(props.name)}" referrerpolicy="no-referrer" onerror="this.style.display='none'">` : ''}
            <p class="wiki-extract">${this._escapeHtml(wiki.extract)}</p>
            <div class="wiki-footer">
                <span class="wiki-lang-tag">${wiki.lang === 'zh' ? '中文維基百科' : '日文維基百科'}</span>
                <a href="${wiki.url}" target="_blank" rel="noopener" class="wiki-link">閱讀完整百科 ↗</a>
            </div>`;
    }

    _escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        buildGoogleMapsUrls,
        buildWikiQueryCandidates,
        CommunityStore,
        AreaInfoPanel
    };
}
