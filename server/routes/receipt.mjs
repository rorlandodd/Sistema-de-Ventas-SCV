import { env } from '../storage.mjs';
export async function GET(req, { params }) {
    if (!req.headers.get('oai-authenticated-user-id'))
        return new Response('No autorizado', { status: 401 });
    const { id } = await params;
    if (!/^[a-f0-9-]{36}$/.test(id))
        return new Response('No encontrada', { status: 404 });
    const file = await env.BUCKET.get('receipts/' + id);
    if (!file)
        return new Response('No encontrada', { status: 404 });
    return new Response(file.body, { headers: { 'Content-Type': file.httpMetadata?.contentType || 'image/jpeg', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'inline' } });
}
