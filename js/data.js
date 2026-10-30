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
    if (name === '所属未定地') return '境界未定地';
    const suffixMap = { '区': '區', '市': '市', '町': '町', '村': '村' };
    return suffixMap[name[name.length - 1]] || '其他';
}

// 實務上需搭船／飛機前往之偏遠離島行政區清單（預設排除於一般陸路旅遊抽選之外）
const REMOTE_ISLAND_MUNICIPALITIES = new Set([
    // 東京都：伊豆諸島・小笠原諸島（9町村）
    '東京都大島町', '東京都利島村', '東京都新島村', '東京都神津島村',
    '東京都三宅村', '東京都御蔵島村', '東京都八丈町', '東京都青ヶ島村', '東京都小笠原村',
    // 北海道：利尻・禮文・奧尻（4町）
    '北海道利尻町', '北海道利尻富士町', '北海道礼文町', '北海道奥尻町',
    // 新潟県：佐渡・粟島
    '新潟県佐渡市', '新潟県粟島浦村',
    // 島根県：隱岐諸島（4町村）
    '島根県海士町', '島根県西ノ島町', '島根県知夫村', '島根県隠岐の島町',
    // 香川県：小豆島・直島
    '香川県土庄町', '香川県小豆島町', '香川県直島町',
    // 愛媛県・広島県・山口県（瀨戶內海無橋純離島町）
    '愛媛県上島町', '広島県大崎上島町',
    // 大分県：姬島
    '大分県姫島村',
    // 長崎県：對馬・壹岐・五島列島
    '長崎県対馬市', '長崎県壱岐市', '長崎県五島市', '長崎県小値賀町', '長崎県新上五島町',
    // 鹿児島県：種子島・屋久島・吐噶喇列島・奄美群島
    '鹿児島県西之表市', '鹿児島県中種子町', '鹿児島県南種子町', '鹿児島県屋久島町',
    '鹿児島県三島村', '鹿児島県十島村', '鹿児島県奄美市', '鹿児島県大和村',
    '鹿児島県宇検村', '鹿児島県瀬戸内町', '鹿児島県龍郷町', '鹿児島県喜界町',
    '鹿児島県徳之島町', '鹿児島県天城町', '鹿児島県伊仙町', '鹿児島県和泊町',
    '鹿児島県知名町', '鹿児島県与論町',
    // 沖縄県：沖繩本島以外之離島町村（先島諸島・大東諸島・慶良間等）
    '沖縄県宮古島市', '沖縄県石垣市', '沖縄県多良間村', '沖縄県竹富町', '沖縄県与那国町',
    '沖縄県北大東村', '沖縄県南大東村', '沖縄県久米島町', '沖縄県渡嘉敷村', '沖縄県座間味村',
    '沖縄県粟国村', '沖縄県渡名喜村', '沖縄県伊江村', '沖縄県伊平屋村', '沖縄県伊是名村'
]);

// 無法登島、絕海無人岩礁或無法前往旅遊之行政區域（自資料載入階段直接剔除）
const EXCLUDED_NON_TOURIST_AREAS = new Set([
    // 東京都：直轄無人活火山岩礁群（孀婦岩、鳥島、須美壽島、巴約訥斯礁，全境無人且無法登島）
    '東京都所属未定地',
    // 北海道：北方四島（目前一般旅客無法自由渡航登島旅遊之6村）
    '北海道色丹村',
    '北海道泊村',
    '北海道留夜別村',
    '北海道留別村',
    '北海道紗那村',
    '北海道蘂取村'
]);

function isNonTouristArea(prefecture, name) {
    // 剔除非千葉縣三番瀨海濱公園之所有所屬未定地（如湖沼水面、無人岩礁等）
    if (name === '所属未定地' && prefecture !== '千葉県') return true;
    return EXCLUDED_NON_TOURIST_AREAS.has(`${prefecture}${name}`);
}

function isRemoteIsland(prefecture, name) {
    return REMOTE_ISLAND_MUNICIPALITIES.has(`${prefecture}${name}`);
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

// 將原始 N03 GeoJSON 轉為應用程式格式：分組合併 + 屬性補齊 + 剔除非觀光區域
function transformPrefectureData(rawGeoJson) {
    const groups = new Map();
    rawGeoJson.features.forEach((f) => {
        const props = f.properties;
        if (!props || !props.N03_004) return;
        const name = getUnitName(props);
        const prefecture = props.N03_001;
        const id = `${prefecture}${name}`;

        // 剔除無法登島或無法前往旅遊之非觀光區域
        if (isNonTouristArea(prefecture, name)) return;

        if (!groups.has(id)) {
            groups.set(id, { name, prefecture, geometries: [] });
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
                isRemoteIsland: isRemoteIsland(g.prefecture, g.name)
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
    const features = rawList.flatMap((raw) => transformPrefectureData(raw));
    return { type: 'FeatureCollection', features };
}

if (typeof window !== 'undefined') {
    window.tokyoMetroDataPromise = loadTokyoMetroData();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getUnitName,
        deriveType,
        isRemoteIsland,
        isNonTouristArea,
        mergePolygonCoordinates,
        transformPrefectureData
    };
}
