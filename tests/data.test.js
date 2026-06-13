const test = require('node:test');
const assert = require('node:assert');
const {
    getUnitName,
    deriveType,
    mergePolygonCoordinates,
    transformPrefectureData
} = require('../js/data.js');

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
            { type: 'Feature', properties: { N03_001: '東京都', N03_003: null, N03_004: null, N03_007: null }, geometry: { type: 'Polygon', coordinates: [ring3] } }
        ]
    };
    const features = transformPrefectureData(raw);

    assert.equal(features.length, 2); // 橫濱兩區合併為一、新宿一個、無名 feature 被跳過

    const yokohama = features.find((f) => f.properties.name === '横浜市');
    assert.equal(yokohama.properties.id, '神奈川県横浜市');
    assert.equal(yokohama.properties.prefecture, '神奈川県');
    assert.equal(yokohama.properties.type, '市');
    assert.equal(yokohama.geometry.type, 'MultiPolygon');
    assert.equal(yokohama.geometry.coordinates.length, 2);
});
