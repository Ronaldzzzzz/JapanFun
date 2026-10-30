// Cloudflare Pages Function：管理員專用審核 API（先審後發審查、核准、駁回與刪除）

function checkAuth(request, env) {
    const key = request.headers.get('x-admin-key') || new URL(request.url).searchParams.get('key');
    const validKey = env.ADMIN_SECRET || 'japanfun888';
    return Boolean(key && key === validKey);
}

export async function onRequestGet(context) {
    const { request, env } = context;
    if (!checkAuth(request, env)) {
        return Response.json({ error: '未經授權，請提供正確的管理員金鑰' }, { status: 401 });
    }
    if (!env.DB) {
        return Response.json({ error: 'D1 binding not configured' }, { status: 503 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'pending';

    let query = 'SELECT id, area_id AS areaId, author, visit_date AS visitDate, comment, photo_key AS photoKey, created_at AS createdAt, status FROM posts';
    const params = [];

    if (status !== 'all') {
        query += ' WHERE status = ?';
        params.push(status);
    }
    query += ' ORDER BY created_at DESC LIMIT 100';

    const { results } = await env.DB.prepare(query).bind(...params).all();

    // 統計各狀態數量供後台標籤顯示
    const countsResult = await env.DB.prepare(
        'SELECT status, COUNT(*) AS count FROM posts GROUP BY status'
    ).all();
    const counts = { pending: 0, approved: 0 };
    (countsResult.results || []).forEach((row) => {
        if (row.status) counts[row.status] = Number(row.count) || 0;
    });

    const posts = (results || []).map((row) => ({
        ...row,
        photoDataUrl: row.photoKey ? `/api/photos/${encodeURIComponent(row.photoKey)}` : null
    }));

    return Response.json({ posts, counts });
}

export async function onRequestPost(context) {
    const { request, env } = context;
    if (!checkAuth(request, env)) {
        return Response.json({ error: '未經授權，請提供正確的管理員金鑰' }, { status: 401 });
    }
    if (!env.DB) {
        return Response.json({ error: 'D1 binding not configured' }, { status: 503 });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { id, action } = body;

    // 驗證密鑰專用端點
    if (action === 'verify') {
        return Response.json({ ok: true });
    }

    if (!id || !['approve', 'reject'].includes(action)) {
        return Response.json({ error: '缺少 id 或無效的 action（須為 approve 或 reject）' }, { status: 400 });
    }

    if (action === 'approve') {
        await env.DB.prepare('UPDATE posts SET status = ? WHERE id = ?')
            .bind('approved', id).run();
        return Response.json({ ok: true, id, status: 'approved' });
    }

    if (action === 'reject') {
        const row = await env.DB.prepare('SELECT photo_key AS photoKey FROM posts WHERE id = ?').bind(id).first();
        if (row?.photoKey && env.PHOTOS_BUCKET) {
            await env.PHOTOS_BUCKET.delete(row.photoKey);
        }
        await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
        return Response.json({ ok: true, id, deleted: true });
    }
}
