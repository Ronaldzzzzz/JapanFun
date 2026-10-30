-- Cloudflare D1 資料表結構：各市町村網友遊玩照片與心得投稿
CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    area_id TEXT NOT NULL,
    author TEXT NOT NULL,
    visit_date TEXT NOT NULL,
    comment TEXT NOT NULL DEFAULT '',
    photo_key TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_posts_area_id ON posts(area_id, created_at DESC);
