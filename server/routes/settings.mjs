import { defaultPreferences, defaultSalesRules, validPreferences, validSalesRules } from '../preferences.mjs';
import { env } from '../storage.mjs';
import { defaultSettings, defaultVisibleMenus, menuNames } from '../settings-utils.mjs';
async function init() { await env.DB.prepare('CREATE TABLE IF NOT EXISTS system_settings (id TEXT PRIMARY KEY, data TEXT NOT NULL, revision INTEGER NOT NULL)').run(); }
const error = (text, status = 400) => Response.json({ error: text }, { status });
function publicSettings(value) { const { preferencesByUser, menusByUser, signatures, ...visible } = value; return visible; }
export async function GET(req) {
    const uid = req.headers.get('oai-authenticated-user-id');
    if (!uid)
        return error('Inicia sesión.', 401);
    await init();
    const row = await env.DB.prepare('SELECT * FROM system_settings WHERE id=?').bind('main').first();
    if (row) {
        const d = JSON.parse(row.data);
        return Response.json(publicSettings({ ...d, preferences: d.preferencesByUser?.[uid] || null, salesRules: { ...defaultSalesRules, ...d.salesRules }, visibleMenus: { ...defaultVisibleMenus, ...d.menusByUser?.[uid] }, signatureId: d.signatures?.[uid] || d.profiles[0]?.id, revision: row.revision }), { headers: { 'Cache-Control': 'no-store' } });
    }
    const old = await env.BUCKET.get('settings/branding.json');
    const logo = old ? JSON.parse(await old.text()).logo : defaultSettings.logo;
    return Response.json({ ...defaultSettings, logo, preferences: null, salesRules: defaultSalesRules }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function POST(req) {
    const uid = req.headers.get('oai-authenticated-user-id');
    if (!uid)
        return error('Inicia sesión.', 401);
    if (req.headers.get('origin') && req.headers.get('origin') !== new URL(req.url).origin)
        return error('Origen inválido.', 403);
    try {
        const d = await req.json();
        const text = (v, max, required = false) => typeof v === 'string' && v.length <= max && (!required || v.trim().length > 0) && !/[\x00-\x1f]/.test(v);
        if (!text(d.companyName, 100, true) || !Array.isArray(d.profiles) || d.profiles.length < 1 || d.profiles.length > 100 || !Number.isSafeInteger(d.revision) || d.revision < 0)
            return error('Revisa la empresa y los usuarios.');
        const ids = new Set();
        for (const p of d.profiles) {
            if (!text(p.id, 100, true) || ids.has(p.id) || !text(p.name, 100, true) || !text(p.email, 150) || !text(p.phone, 40) || !text(p.role, 120) || p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email))
                return error('Revisa nombre, correo, número y cargo de cada usuario.');
            ids.add(p.id);
        }
        if (d.visibleMenus !== undefined && (!d.visibleMenus || typeof d.visibleMenus !== 'object' || Array.isArray(d.visibleMenus) || Object.entries(d.visibleMenus).some(([k, v]) => !menuNames.includes(k) || typeof v !== 'boolean')))
            return error('Revisa las opciones de menú visible.');
        if (d.preferences !== undefined && !validPreferences(d.preferences))
            return error('Revisa las preferencias de apariencia y ventas.');
        if (d.salesRules !== undefined && !validSalesRules(d.salesRules))
            return error('Revisa las reglas de ventas.');
        if (d.preferences?.defaultStore && !await env.DB.prepare('SELECT id FROM stores WHERE id=?').bind(d.preferences.defaultStore).first())
            return error('La tienda inicial ya no está disponible.');
        if (!ids.has(d.signatureId))
            return error('Selecciona el usuario de la firma.');
        if (!d.brandLogos || typeof d.brandLogos !== 'object' || Array.isArray(d.brandLogos) || Object.keys(d.brandLogos).length > 100)
            return error('Logos inválidos.');
        const checkLogo = async (url) => { if (['/brands/electrolux.png', '/brands/mademsa.webp', '/brands/fensa.png'].includes(url))
            return true; return typeof url === 'string' && /^\/api\/photos\/[a-f0-9-]{36}$/.test(url) && !!await env.BUCKET.head(url.split('/').pop()); };
        if (!await checkLogo(d.logo))
            return error('Selecciona un logo válido para la empresa.');
        for (const [brand, url] of Object.entries(d.brandLogos))
            if (!text(brand, 150, true) || ['__proto__', 'constructor', 'prototype'].includes(brand) || url !== '' && !await checkLogo(url))
                return error('Revisa los logos de las marcas.');
        await init();
        const old = await env.DB.prepare('SELECT * FROM system_settings WHERE id=?').bind('main').first();
        if ((old?.revision || 0) !== d.revision)
            return error('Otra persona cambió los ajustes. Cierra y abre Ajustes para cargar la versión actual.', 409);
        const signatures = old ? JSON.parse(old.data).signatures || {} : {};
        for (const account of Object.keys(signatures))
            if (!ids.has(signatures[account]))
                signatures[account] = d.profiles[0].id;
        signatures[uid] = d.signatureId;
        const menusByUser = old ? JSON.parse(old.data).menusByUser || {} : {};
        menusByUser[uid] = { ...defaultVisibleMenus, ...menusByUser[uid], ...d.visibleMenus };
        const previous = old ? JSON.parse(old.data) : {};
        const preferencesByUser = { ...previous.preferencesByUser };
        if (d.preferences)
            preferencesByUser[uid] = Object.fromEntries(Object.entries(defaultPreferences).map(([key, fallback]) => [key, d.preferences[key] ?? fallback]));
        const salesRules = d.salesRules || previous.salesRules || defaultSalesRules;
        const clean = { preferencesByUser, salesRules, companyName: d.companyName.trim(), logo: d.logo, brandLogos: d.brandLogos, profiles: d.profiles.map((p) => ({ id: p.id, name: p.name.trim(), email: p.email.trim(), phone: p.phone.trim(), role: p.role.trim() })), signatures, menusByUser };
        const result = old ? await env.DB.prepare('UPDATE system_settings SET data=?,revision=revision+1 WHERE id=? AND revision=?').bind(JSON.stringify(clean), 'main', d.revision).run() : await env.DB.prepare('INSERT OR IGNORE INTO system_settings(id,data,revision) VALUES(?,?,1)').bind('main', JSON.stringify(clean)).run();
        if (!(result.meta?.changes ?? result.changes))
            return error('Los ajustes cambiaron. Cierra y vuelve a abrir Ajustes.', 409);
        return Response.json(publicSettings({ ...clean, preferences: preferencesByUser[uid] || null, visibleMenus: menusByUser[uid], signatureId: d.signatureId, revision: d.revision + 1 }));
    }
    catch {
        return error('No se pudieron guardar los ajustes.');
    }
}
