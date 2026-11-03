import { env } from '../storage.mjs';
export async function GET(req, { params }) {
    if (!req.headers.get('oai-authenticated-user-id'))
        return new Response('No autorizado', { status: 401 });
    const { id } = await params;
    const object = await env.BUCKET.get(id);
    if (!object)
        return new Response('No encontrado', { status: 404 });
    return new Response(object.body, { headers: { 'Content-Type': object.httpMetadata?.contentType || 'image/jpeg', 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' } });
}
