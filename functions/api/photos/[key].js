// Cloudflare Pages Function：由 R2 讀取並回傳網友上傳之照片（含全球 CDN 快取標頭）

export async function onRequestGet(context) {
    const { params, env } = context;
    if (!env.PHOTOS_BUCKET) {
        return new Response('R2 bucket not configured', { status: 503 });
    }

    const key = decodeURIComponent(params.key || '');
    if (!key) {
        return new Response('Not found', { status: 404 });
    }

    const object = await env.PHOTOS_BUCKET.get(key);
    if (!object) {
        return new Response('Photo not found', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new Response(object.body, { headers });
}
