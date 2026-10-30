const test = require('node:test');
const assert = require('node:assert');
const {
    getUnitName,
    deriveType,
    isRemoteIsland,
    isNonTouristArea,
    mergePolygonCoordinates,
    transformPrefectureData
} = require('../js/data.js');

test('isNonTouristArea：正確識別無法登島之無人岩礁與北方四島等非觀光區域', () => {
    // 東京都所屬未定地（孀婦岩、鳥島等絕海無人岩礁）直接排除
    assert.equal(isNonTouristArea('東京都', '所属未定地'), true);
    // 北方四島（無法前往旅遊之6村）直接排除
    assert.equal(isNonTouristArea('北海道', '色丹村'), true);
    assert.equal(isNonTouristArea('北海道', '蘂取村'), true);
    // 千葉縣所屬未定地（三番瀨海濱公園）為休閒遊憩區，保留
    assert.equal(isNonTouristArea('千葉県', '所属未定地'), false);
    // 一般正常自治體保留
    assert.equal(isNonTouristArea('東京都', '新宿区'), false);
    assert.equal(isNonTouristArea('北海道', '札幌市'), false);
});

test('isRemoteIsland：正確識別東京都小笠原村等偏遠離島與本島市町村', () => {
    assert.equal(isRemoteIsland('東京都', '小笠原村'), true);
    assert.equal(isRemoteIsland('東京都', '八丈町'), true);
    assert.equal(isRemoteIsland('東京都', '新宿区'), false);
    assert.equal(isRemoteIsland('神奈川県', '横浜市'), false);
});

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
            { type: 'Feature', properties: { N03_001: '東京都', N03_003: null, N03_004: null, N03_007: null }, geometry: { type: 'Polygon', coordinates: [ring3] } },
            // 以下為非觀光區域，應被直接過濾剔除：
            { type: 'Feature', properties: { N03_001: '東京都', N03_003: null, N03_004: '所属未定地', N03_007: null }, geometry: { type: 'Polygon', coordinates: [ring3] } },
            { type: 'Feature', properties: { N03_001: '北海道', N03_003: '色丹郡', N03_004: '色丹村', N03_007: '01695' }, geometry: { type: 'Polygon', coordinates: [ring3] } },
            // 千葉縣所屬未定地（三番瀨）應被保留：
            { type: 'Feature', properties: { N03_001: '千葉県', N03_003: null, N03_004: '所属未定地', N03_007: null }, geometry: { type: 'Polygon', coordinates: [ring3] } }
        ]
    };
    const features = transformPrefectureData(raw);

    assert.equal(features.length, 3); // 橫濱兩區合併為一、新宿一個、千葉三番瀨一個；東京都所屬未定地與北方四島被剔除
    assert.equal(features.some((f) => f.properties.id === '東京都所属未定地'), false);
    assert.equal(features.some((f) => f.properties.id === '北海道色丹村'), false);
    assert.equal(features.some((f) => f.properties.id === '千葉県所属未定地'), true);

    const yokohama = features.find((f) => f.properties.name === '横浜市');
    assert.equal(yokohama.properties.id, '神奈川県横浜市');
    assert.equal(yokohama.properties.prefecture, '神奈川県');
    assert.equal(yokohama.properties.type, '市');
    assert.equal(yokohama.geometry.type, 'MultiPolygon');
    assert.equal(yokohama.geometry.coordinates.length, 2);
});
