// 東京首都圈地理數據
// 包含東京都、神奈川縣、埼玉縣、千葉縣、山梨縣的主要市區鎮

const tokyoMetroData = {
    "type": "FeatureCollection",
    "features": [
        // 東京都 23區
        {
            "type": "Feature",
            "properties": {
                "name": "新宿區",
                "prefecture": "東京都",
                "type": "區",
                "population": 346000,
                "area_km2": 18.23
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[35.7, 139.7], [35.7, 139.72], [35.72, 139.72], [35.72, 139.7], [35.7, 139.7]]]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": "澀谷區",
                "prefecture": "東京都",
                "type": "區",
                "population": 235000,
                "area_km2": 15.11
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[35.65, 139.68], [35.65, 139.7], [35.67, 139.7], [35.67, 139.68], [35.65, 139.68]]]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": "港區",
                "prefecture": "東京都",
                "type": "區",
                "population": 260000,
                "area_km2": 20.37
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[35.65, 139.72], [35.65, 139.75], [35.68, 139.75], [35.68, 139.72], [35.65, 139.72]]]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": "中央區",
                "prefecture": "東京都",
                "type": "區",
                "population": 169000,
                "area_km2": 10.21
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[35.67, 139.75], [35.67, 139.77], [35.69, 139.77], [35.69, 139.75], [35.67, 139.75]]]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": "千代田區",
                "prefecture": "東京都",
                "type": "區",
                "population": 66000,
                "area_km2": 11.66
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[35.69, 139.73], [35.69, 139.75], [35.71, 139.75], [35.71, 139.73], [35.69, 139.73]]]
            }
        },
        // 東京都 市
        {
            "type": "Feature",
            "properties": {
                "name": "八王子市",
                "prefecture": "東京都",
                "type": "市",
                "population": 580000,
                "area_km2": 186.31
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[35.65, 139.3], [35.65, 139.35], [35.7, 139.35], [35.7, 139.3], [35.65, 139.3]]]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": "立川市",
                "prefecture": "東京都",
                "type": "市",
                "population": 180000,
                "area_km2": 24.38
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[35.7, 139.4], [35.7, 139.42], [35.72, 139.42], [35.72, 139.4], [35.7, 139.4]]]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": "武藏野市",
                "prefecture": "東京都",
                "type": "市",
                "population": 150000,
                "area_km2": 10.98
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[35.72, 139.55], [35.72, 139.57], [35.74, 139.57], [35.74, 139.55], [35.72, 139.55]]]
            }
        },
        // 神奈川縣 市
        {
            "type": "Feature",
            "properties": {
                "name": "橫濱市",
                "prefecture": "神奈川縣",
                "type": "市",
                "population": 3770000,
                "area_km2": 437.56
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[35.4, 139.6], [35.4, 139.7], [35.5, 139.7], [35.5, 139.6], [35.4, 139.6]]]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": "川崎市",
                "prefecture": "神奈川縣",
                "type": "市",
                "population": 1540000,
                "area_km2": 144.35
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[35.5, 139.65], [35.5, 139.75], [35.6, 139.75], [35.6, 139.65], [35.5, 139.65]]]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": "相模原市",
                "prefecture": "神奈川縣",
                "type": "市",
                "population": 720000,
                "area_km2": 328.84
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[35.5, 139.3], [35.5, 139.4], [35.6, 139.4], [35.6, 139.3], [35.5, 139.3]]]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": "藤澤市",
                "prefecture": "神奈川縣",
                "type": "市",
                "population": 440000,
                "area_km2": 69.51
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[35.35, 139.45], [35.35, 139.55], [35.45, 139.55], [35.45, 139.45], [35.35, 139.45]]]
            }
        },
        // 埼玉縣 市
        {
            "type": "Feature",
            "properties": {
                "name": "埼玉市",
                "prefecture": "埼玉縣",
                "type": "市",
                "population": 1320000,
                "area_km2": 217.43
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[35.85, 139.6], [35.85, 139.7], [35.95, 139.7], [35.95, 139.6], [35.85, 139.6]]]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": "川越市",
                "prefecture": "埼玉縣",
                "type": "市",
                "population": 350000,
                "area_km2": 109.16
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[35.9, 139.45], [35.9, 139.55], [36.0, 139.55], [36.0, 139.45], [35.9, 139.45]]]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": "所澤市",
                "prefecture": "埼玉縣",
                "type": "市",
                "population": 340000,
                "area_km2": 72.11
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[35.8, 139.45], [35.8, 139.55], [35.9, 139.55], [35.9, 139.45], [35.8, 139.45]]]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": "新座市",
                "prefecture": "埼玉縣",
                "type": "市",
                "population": 170000,
                "area_km2": 22.80
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[35.75, 139.55], [35.75, 139.65], [35.8, 139.65], [35.8, 139.55], [35.75, 139.55]]]
            }
        },
        // 千葉縣 市
        {
            "type": "Feature",
            "properties": {
                "name": "千葉市",
                "prefecture": "千葉縣",
                "type": "市",
                "population": 980000,
                "area_km2": 271.76
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[35.6, 140.1], [35.6, 140.2], [35.7, 140.2], [35.7, 140.1], [35.6, 140.1]]]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": "船橋市",
                "prefecture": "千葉縣",
                "type": "市",
                "population": 640000,
                "area_km2": 85.64
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[35.7, 139.95], [35.7, 140.05], [35.8, 140.05], [35.8, 139.95], [35.7, 139.95]]]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": "市川市",
                "prefecture": "千葉縣",
                "type": "市",
                "population": 480000,
                "area_km2": 57.45
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[35.75, 139.9], [35.75, 140.0], [35.8, 140.0], [35.8, 139.9], [35.75, 139.9]]]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": "習志野市",
                "prefecture": "千葉縣",
                "type": "市",
                "population": 170000,
                "area_km2": 20.99
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[35.65, 140.0], [35.65, 140.1], [35.7, 140.1], [35.7, 140.0], [35.65, 140.0]]]
            }
        },
        // 山梨縣 市
        {
            "type": "Feature",
            "properties": {
                "name": "甲府市",
                "prefecture": "山梨縣",
                "type": "市",
                "population": 190000,
                "area_km2": 212.47
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[35.65, 138.5], [35.65, 138.6], [35.75, 138.6], [35.75, 138.5], [35.65, 138.5]]]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": "大月市",
                "prefecture": "山梨縣",
                "type": "市",
                "population": 25000,
                "area_km2": 80.88
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[35.6, 138.9], [35.6, 139.0], [35.7, 139.0], [35.7, 138.9], [35.6, 138.9]]]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": "上野原市",
                "prefecture": "山梨縣",
                "type": "市",
                "population": 25000,
                "area_km2": 170.57
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[35.6, 139.1], [35.6, 139.2], [35.7, 139.2], [35.7, 139.1], [35.6, 139.1]]]
            }
        }
    ]
};

// 導出數據供其他模組使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = tokyoMetroData;
}
