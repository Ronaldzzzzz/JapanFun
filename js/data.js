// 資料層：載入並轉換東京首都圈真實行政區邊界 GeoJSON（國土數值情報 N03）

const PREF_CODES = Array.from({ length: 47 }, (_, i) => String(i + 1).padStart(2, '0'));
const GEOJSON_URL = (code) =>
    `https://raw.githubusercontent.com/smartnews-smri/japan-topography/main/data/municipality/geojson/s0010/N03-21_${code}_210101.json`;

// 政令指定都市的轄區合併為市；其餘以 N03_004 為單位
function getUnitName(props) {
    if (props.N03_003 && props.N03_003.endsWith('市')) return props.N03_003;
    return props.N03_004;
}

// 依名稱結尾推導行政區劃類型
function deriveType(name) {
    const suffixMap = { '区': '區', '市': '市', '町': '町', '村': '村' };
    return suffixMap[name[name.length - 1]] || '其他';
}

// 將多個 Polygon / MultiPolygon 幾何攤平為單一 MultiPolygon 坐標陣列
function mergePolygonCoordinates(geometries) {
    const polygons = [];
    geometries.forEach((geom) => {
        if (geom.type === 'Polygon') polygons.push(geom.coordinates);
        else if (geom.type === 'MultiPolygon') polygons.push(...geom.coordinates);
    });
    return polygons;
}

// 球面近似計算單一環的面積（平方公尺）
function ringAreaM2(ring) {
    const R = 6378137;
    const rad = (d) => (d * Math.PI) / 180;
    let total = 0;
    for (let i = 0; i < ring.length; i++) {
        const [lon1, lat1] = ring[i];
        const [lon2, lat2] = ring[(i + 1) % ring.length];
        total += (rad(lon2) - rad(lon1)) * (2 + Math.sin(rad(lat1)) + Math.sin(rad(lat2)));
    }
    return Math.abs((total * R * R) / 2);
}

// MultiPolygon 面積（km²，1 位小數）：外環加總、內環（洞）扣除
function multiPolygonAreaKm2(multiCoords) {
    let m2 = 0;
    multiCoords.forEach((polygon) => {
        polygon.forEach((ring, i) => {
            m2 += (i === 0 ? 1 : -1) * ringAreaM2(ring);
        });
    });
    return Math.round((m2 / 1e6) * 10) / 10;
}

// 將原始 N03 GeoJSON 轉為應用程式格式：分組合併 + 屬性補齊
function transformPrefectureData(rawGeoJson, populationTable) {
    const groups = new Map();
    rawGeoJson.features.forEach((f) => {
        const props = f.properties;
        if (!props || !props.N03_004) return; // 跳過所屬未定地
        const name = getUnitName(props);
        const id = `${props.N03_001}${name}`;
        if (!groups.has(id)) {
            groups.set(id, { name, prefecture: props.N03_001, geometries: [] });
        }
        groups.get(id).geometries.push(f.geometry);
    });

    const features = [];
    groups.forEach((g, id) => {
        const coordinates = mergePolygonCoordinates(g.geometries);
        features.push({
            type: 'Feature',
            properties: {
                id,
                name: g.name,
                prefecture: g.prefecture,
                type: deriveType(g.name),
                population: populationTable[g.name] ?? null,
                area_km2: multiPolygonAreaKm2(coordinates)
            },
            geometry: { type: 'MultiPolygon', coordinates }
        });
    });
    return features;
}

// 載入五縣資料並合併為單一 FeatureCollection
async function loadTokyoMetroData() {
    const responses = await Promise.all(PREF_CODES.map((code) => fetch(GEOJSON_URL(code))));
    const failed = responses.find((r) => !r.ok);
    if (failed) throw new Error(`GeoJSON 載入失敗：HTTP ${failed.status}`);
    const rawList = await Promise.all(responses.map((r) => r.json()));
    const features = rawList.flatMap((raw) => transformPrefectureData(raw, POPULATION_DATA));
    return { type: 'FeatureCollection', features };
}

if (typeof window !== 'undefined') {
    window.tokyoMetroDataPromise = loadTokyoMetroData();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getUnitName,
        deriveType,
        mergePolygonCoordinates,
        ringAreaM2,
        multiPolygonAreaKm2,
        transformPrefectureData
    };
}
