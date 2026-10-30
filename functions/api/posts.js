// Cloudflare Pages Function：處理市町村網友照片與旅遊心得之查詢、上傳（D1 + R2）與刪除

function dataUrlToBytes(dataUrl) {
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl || '');
    if (!match) return null;
    const contentType = match[1];
    const base64 = match[2];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    const ext = contentType.includes('webp') ? 'webp' : (contentType.includes('png') ? 'png' : 'jpg');
    return { bytes, contentType, ext };
}

export async function onRequestGet(context) {
    const { request, env } = context;
    if (!env.DB) {
        return Response.json({ error: 'D1 binding not configured' }, { status: 503 });
    }

    const url = new URL(request.url);
    const areaId = url.searchParams.get('areaId');

    if (areaId) {
        const { results } = await env.DB.prepare(
            "SELECT id, area_id AS areaId, author, visit_date AS visitDate, comment, photo_key AS photoKey, created_at AS createdAt, status FROM posts WHERE area_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 50"
        ).bind(areaId).all();

        const posts = (results || []).map((row) => ({
            ...row,
            photoDataUrl: row.photoKey ? `/api/photos/${encodeURIComponent(row.photoKey)}` : null
        }));
        return Response.json({ posts });
    }

    // 未指定 areaId 時，回傳各市町村已通過審核的投稿數量統計（供右側清單顯示 📷 數量）
    const { results } = await env.DB.prepare(
        "SELECT area_id AS areaId, COUNT(*) AS count FROM posts WHERE status = 'approved' GROUP BY area_id"
    ).all();
    return Response.json({ counts: results || [] });
}

export async function onRequestPost(context) {
    const { request, env } = context;
    if (!env.DB) {
        return Response.json({ error: 'D1 binding not configured' }, { status: 503 });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const areaId = String(body.areaId || '').trim();
    const author = String(body.author || '匿名旅人').trim().slice(0, 24) || '匿名旅人';
    const visitDate = String(body.visitDate || new Date().toISOString().slice(0, 10)).slice(0, 10);
    const comment = String(body.comment || '').trim().slice(0, 300);
    const photoDataUrl = body.photoDataUrl || null;

    if (!areaId || (!comment && !photoDataUrl)) {
        return Response.json({ error: '缺少必要欄位' }, { status: 400 });
    }

    const id = `post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const createdAt = new Date().toISOString();
    let photoKey = null;

    if (photoDataUrl && env.PHOTOS_BUCKET) {
        const parsed = dataUrlToBytes(photoDataUrl);
        if (!parsed) {
            return Response.json({ error: '圖片格式不支援' }, { status: 400 });
        }
        if (parsed.bytes.byteLength > 2 * 1024 * 1024) {
            return Response.json({ error: '圖片檔案過大（上限 2MB）' }, { status: 413 });
        }
        photoKey = `${id}.${parsed.ext}`;
        await env.PHOTOS_BUCKET.put(photoKey, parsed.bytes, {
            httpMetadata: { contentType: parsed.contentType }
        });
    }

    // 方案 B：先審後發，預設存入 'pending' 狀態
    await env.DB.prepare(
        'INSERT INTO posts (id, area_id, author, visit_date, comment, photo_key, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, areaId, author, visitDate, comment, photoKey, createdAt, 'pending').run();

    return Response.json({
        post: {
            id,
            areaId,
            author,
            visitDate,
            comment,
            photoKey,
            photoDataUrl: photoKey ? `/api/photos/${encodeURIComponent(photoKey)}` : null,
            createdAt,
            status: 'pending'
        }
    }, { status: 201 });
}

export async function onRequestDelete(context) {
    const { request, env } = context;
    if (!env.DB) {
        return Response.json({ error: 'D1 binding not configured' }, { status: 503 });
    }

    // 刪除權限校驗：僅管理員或帶有正確金鑰可刪除
    const adminKey = request.headers.get('x-admin-key') || new URL(request.url).searchParams.get('key');
    const validKey = env.ADMIN_SECRET || 'japanfun888';
    if (!adminKey || adminKey !== validKey) {
        return Response.json({ error: '未經授權的操作' }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) {
        return Response.json({ error: 'Missing id' }, { status: 400 });
    }

    const row = await env.DB.prepare('SELECT photo_key AS photoKey FROM posts WHERE id = ?').bind(id).first();
    if (row?.photoKey && env.PHOTOS_BUCKET) {
        await env.PHOTOS_BUCKET.delete(row.photoKey);
    }
    await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();

    return Response.json({ ok: true });
}
