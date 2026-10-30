const test = require('node:test');
const assert = require('node:assert');
const {
    buildGoogleMapsUrls,
    buildWikiQueryCandidates,
    CommunityStore
} = require('../js/info-panel.js');
const { TokyoMetroMap, buildPrefectureBoundaries } = require('../js/map.js');

test('TokyoMetroMap.prototype.styleFor & prefBorderStyleFor：隱藏範圍外縣市，並突顯基地縣與相鄰縣市邊界', () => {
    const fakeContext = {
        selectedIds: new Set(['東京都新宿区']),
        activeId: '東京都渋谷区',
        poolPrefs: new Set(['東京都', '神奈川県']),
        anchorPref: '東京都',
        includeIslands: false,
        isFeatureInPool: TokyoMetroMap.prototype.isFeatureInPool
    };
    fakeContext.selectedIds.add('東京都渋谷区');

    // 預設排除偏遠離島：即使東京都本身在 pool 內，小笠原村仍視為不在池中並完全隱藏
    assert.equal(
        fakeContext.isFeatureInPool({
            properties: { id: '東京都小笠原村', prefecture: '東京都', isRemoteIsland: true }
        }),
        false
    );

    // 範圍外其他外縣市：完全隱藏 (fillOpacity 0, opacity 0, weight 0)
    const outOfPoolStyle = TokyoMetroMap.prototype.styleFor.call(fakeContext, {
        properties: { id: '北海道札幌市', prefecture: '北海道' }
    });
    assert.equal(outOfPoolStyle.fillOpacity, 0);
    assert.equal(outOfPoolStyle.opacity, 0);
    assert.equal(outOfPoolStyle.weight, 0);
    assert.equal(
        TokyoMetroMap.prototype.isFeatureInPool.call(fakeContext, {
            properties: { id: '北海道札幌市', prefecture: '北海道' }
        }),
        false
    );

    // 縣界樣式：基地縣（東京都）突顯為亮金色粗框，鄰縣（神奈川県）為亮藍框，範圍外（北海道）完全隱藏
    const anchorBorder = TokyoMetroMap.prototype.prefBorderStyleFor.call(fakeContext, {
        properties: { prefecture: '東京都' }
    });
    const neighborBorder = TokyoMetroMap.prototype.prefBorderStyleFor.call(fakeContext, {
        properties: { prefecture: '神奈川県' }
    });
    const outBorder = TokyoMetroMap.prototype.prefBorderStyleFor.call(fakeContext, {
        properties: { prefecture: '北海道' }
    });
    assert.ok(anchorBorder.weight > neighborBorder.weight);
    assert.ok(neighborBorder.weight >= 2.0);
    assert.equal(outBorder.opacity, 0);

    // 縣市浮水印標籤狀態：基地縣為 is-anchor、鄰縣為 is-neighbor、範圍外為 null (隱藏)
    assert.equal(TokyoMetroMap.prototype.getPrefLabelState.call(fakeContext, '東京都'), 'is-anchor');
    assert.equal(TokyoMetroMap.prototype.getPrefLabelState.call(fakeContext, '神奈川県'), 'is-neighbor');
    assert.equal(TokyoMetroMap.prototype.getPrefLabelState.call(fakeContext, '北海道'), null);
});

test('TokyoMetroMap.prototype.getSelectedFeatures：依緯度由北到南（高→低）排序', () => {
    const fakeMap = {
        selectedIds: new Set(['南區', '北區', '中區']),
        layersById: new Map([
            ['南區', { feature: { properties: { id: '南區' } }, getBounds: () => ({ getCenter: () => ({ lat: 34.0, lng: 135.0 }) }) }],
            ['北區', { feature: { properties: { id: '北區' } }, getBounds: () => ({ getCenter: () => ({ lat: 43.0, lng: 141.0 }) }) }],
            ['中區', { feature: { properties: { id: '中區' } }, getBounds: () => ({ getCenter: () => ({ lat: 36.0, lng: 139.0 }) }) }]
        ]),
        _getMainPolygonCenter: TokyoMetroMap.prototype._getMainPolygonCenter
    };

    const sorted = TokyoMetroMap.prototype.getSelectedFeatures.call(fakeMap);
    assert.deepEqual(sorted.map((f) => f.properties.id), ['北區', '中區', '南區']);
});

test('buildPrefectureBoundaries：消去同縣內共用的市町村邊界，保留都道府縣外框線段', () => {
    const f1 = {
        properties: { prefecture: '東京都' },
        geometry: { type: 'MultiPolygon', coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]] }
    };
    const f2 = {
        properties: { prefecture: '東京都' },
        geometry: { type: 'MultiPolygon', coordinates: [[[[1, 0], [2, 0], [2, 1], [1, 1], [1, 0]]]] }
    };
    const fc = buildPrefectureBoundaries([f1, f2]);
    assert.equal(fc.features.length, 1);
    assert.equal(fc.features[0].properties.prefecture, '東京都');
    // 兩個相鄰正方形各 4 邊，中間共用 1 邊消去後應剩 6 段外框線段
    assert.equal(fc.features[0].geometry.coordinates.length, 6);
});

test('buildGoogleMapsUrls：產生正確編碼的地圖位置、景點與美食搜尋連結', () => {
    const urls = buildGoogleMapsUrls('東京都', '新宿区');
    assert.ok(urls.place.includes(encodeURIComponent('東京都新宿区')));
    assert.ok(urls.sightseeing.includes(encodeURIComponent('東京都新宿区 観光スポット')));
    assert.ok(urls.food.includes(encodeURIComponent('東京都新宿区 グルメ')));

    // 千葉縣所屬未定地導向三番瀨與海濱公園
    const chibaUrls = buildGoogleMapsUrls('千葉県', '所属未定地');
    assert.ok(chibaUrls.place.includes(encodeURIComponent('ふなばし三番瀬海浜公園')));
    assert.ok(chibaUrls.sightseeing.includes(encodeURIComponent('三番瀬')));

    // 東京都所屬未定地導向孀婦岩與鳥島
    const tokyoUrls = buildGoogleMapsUrls('東京都', '所属未定地');
    assert.ok(tokyoUrls.place.includes(encodeURIComponent('孀婦岩 鳥島')));
    assert.ok(tokyoUrls.sightseeing.includes(encodeURIComponent('孀婦岩')));
});

test('buildWikiQueryCandidates：同時提供繁體與日文維基查詢候選詞', () => {
    const candidates = buildWikiQueryCandidates('神奈川県', '横浜市');
    assert.ok(candidates.zh.includes('橫濱市') || candidates.zh.includes('横浜市'));
    assert.equal(candidates.ja[0], '横浜市');
    assert.ok(candidates.ja.includes('神奈川県横浜市'));

    // 千葉縣所屬未定地提供三番瀨等候選詞
    const chibaCandidates = buildWikiQueryCandidates('千葉県', '所属未定地');
    assert.ok(chibaCandidates.zh.includes('三番瀨'));
    assert.ok(chibaCandidates.ja.includes('三番瀬'));

    // 東京都所屬未定地提供孀婦岩等候選詞
    const tokyoCandidates = buildWikiQueryCandidates('東京都', '所属未定地');
    assert.ok(tokyoCandidates.zh.includes('孀婦岩'));
    assert.ok(tokyoCandidates.ja.includes('孀婦岩'));
});

test('CommunityStore：新增與依區域 ID 篩選網友投稿資料', () => {
    const memoryBacking = {};
    const mockStorage = {
        getItem: (k) => memoryBacking[k] || null,
        setItem: (k, v) => { memoryBacking[k] = v; }
    };
    const store = new CommunityStore(mockStorage);

    assert.equal(store.getPostsByArea('東京都新宿区').length, 0);

    const added = store.addPost({
        areaId: '東京都新宿区',
        author: '旅人A',
        comment: '新宿御苑櫻花超美！',
        photoDataUrl: 'data:image/webp;base64,AAAA'
    });

    assert.equal(added.author, '旅人A');
    assert.equal(added.areaId, '東京都新宿区');
    assert.ok(added.createdAt);

    const posts = store.getPostsByArea('東京都新宿区');
    assert.equal(posts.length, 1);
    assert.equal(posts[0].comment, '新宿御苑櫻花超美！');
    assert.equal(store.getPostsByArea('北海道札幌市').length, 0);
});

test('AreaInfoPanel.prototype.fetchWikiSummary：千葉県所属未定地回傳正確三番瀨介紹與有效圖片網址', async () => {
    const fakePanel = {
        wikiCache: new Map()
    };
    const wiki = await require('../js/info-panel.js').AreaInfoPanel.prototype.fetchWikiSummary.call(
        fakePanel,
        '千葉県',
        '所属未定地'
    );

    assert.equal(wiki.lang, 'zh');
    assert.ok(wiki.title.includes('三番瀨'));
    assert.ok(wiki.extract.includes('市川市'));
    assert.ok(wiki.extract.includes('船橋市'));
    assert.ok(wiki.thumbnail.includes('Sanbanze'));
    assert.equal(wiki.thumbnail.startsWith('https://upload.wikimedia.org/'), true);
    assert.ok(!wiki.thumbnail.includes('Sanbanze_from_Funabashi.jpg')); // 舊失效檔名已修正
});

test('AreaInfoPanel.prototype.fetchWikiSummary：東京都所属未定地回傳正確孀婦岩與鳥島介紹與圖片網址', async () => {
    const fakePanel = {
        wikiCache: new Map()
    };
    const wiki = await require('../js/info-panel.js').AreaInfoPanel.prototype.fetchWikiSummary.call(
        fakePanel,
        '東京都',
        '所属未定地'
    );

    assert.equal(wiki.lang, 'zh');
    assert.ok(wiki.title.includes('孀婦岩') || wiki.title.includes('鳥島'));
    assert.ok(wiki.extract.includes('八丈支廳') || wiki.extract.includes('八丈支庁') || wiki.extract.includes('孀婦岩'));
    assert.ok(wiki.thumbnail.startsWith('https://upload.wikimedia.org/'));
});
