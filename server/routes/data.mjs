import { env } from '../storage.mjs';
import { normalizeProduct } from '../product-utils.mjs';
import { normalizeRut, validRut, hierarchyError } from '../seller-utils.mjs';
const fail = (message, status = 400) => Response.json({ error: message }, { status });
export async function GET(req) {
    const uid = req.headers.get('oai-authenticated-user-id');
    if (!uid)
        return fail('Inicia sesión para acceder al negocio.', 401);
    const db = env.DB;
    const email = req.headers.get('oai-authenticated-user-email') || '';
    await db.prepare('INSERT INTO users(id,email,name) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email').bind(uid, email, email).run();
    const [p, s, t, g, u, v, c] = await Promise.all(['SELECT * FROM products WHERE active=1', "SELECT * FROM sales WHERE json_extract(data, '$.deletedAt') IS NULL ORDER BY date DESC", 'SELECT * FROM stores ORDER BY name', 'SELECT * FROM goals', 'SELECT * FROM users', 'SELECT * FROM store_sellers WHERE active=1', "SELECT DISTINCT json_extract(data, '$.type') AS type, json_extract(data, '$.brand') AS brand FROM products"].map(q => db.prepare(q).all()));
    return Response.json({ sellers: v.results.map((x) => ({ ...JSON.parse(x.data), id: x.id, storeId: x.store_id })), catalogOptions: { types: [...new Set(c.results.map((x) => x.type).filter(Boolean))], brands: [...new Set(c.results.map((x) => x.brand).filter(Boolean))] }, products: p.results.map((x) => ({ ...JSON.parse(x.data), id: x.id, code: x.code })), sales: s.results.map((x) => ({ ...JSON.parse(x.data), id: x.id, storeId: x.store_id, date: x.date, userId: x.user_id })), stores: t.results, goals: Object.fromEntries(g.results.map((x) => [x.id, x.amount])), users: u.results, me: uid });
}
export async function POST(req) {
    const uid = req.headers.get('oai-authenticated-user-id');
    if (!uid)
        return fail('Inicia sesión para guardar.', 401);
    if (req.headers.get('origin') && req.headers.get('origin') !== new URL(req.url).origin)
        return fail('Origen no válido', 403);
    const db = env.DB;
    try {
        const { action, data: d } = await req.json();
        const id = crypto.randomUUID();
        if (action === 'seller' || action === 'deleteSeller') {
            if (!await db.prepare('SELECT id FROM stores WHERE id=?').bind(d.storeId).first())
                return fail('Selecciona una tienda válida.');
            const old = d.id ? await db.prepare('SELECT * FROM store_sellers WHERE id=? AND store_id=? AND active=1').bind(d.id, d.storeId).first() : null;
            if (d.id && !old)
                return fail('El vendedor ya no está disponible en esta tienda.', 404);
            if (action === 'deleteSeller') {
                const reports = await db.prepare("SELECT id FROM store_sellers WHERE store_id=? AND active=1 AND json_extract(data, '$.managerId')=?").bind(d.storeId, d.id || '').first();
                if (reports)
                    return fail('Reasigna primero a los trabajadores que dependen de esta persona.');
                if (!old)
                    return fail('Selecciona un vendedor.', 400);
                await db.prepare('UPDATE store_sellers SET active=0 WHERE id=?').bind(d.id).run();
                return Response.json({ ok: true });
            }
            for (const k of ['name', 'role', 'department'])
                if (typeof d[k] !== 'string' || !d[k].trim() || d[k].length > 100)
                    return fail('Completa nombre, cargo y departamento.');
            if (typeof d.rut !== 'string' || d.rut.length > 20 || !validRut(d.rut))
                return fail('Ingresa un RUT válido con dígito verificador, por ejemplo 12.345.678-5.');
            const rut = normalizeRut(d.rut);
            const duplicate = await db.prepare("SELECT id FROM store_sellers WHERE store_id=? AND active=1 AND json_extract(data, '$.rut')=?").bind(d.storeId, rut).first();
            if (duplicate && duplicate.id !== d.id)
                return fail('Ya existe un vendedor con ese RUT en esta tienda.');
            const phone = d.phone === undefined ? (old ? JSON.parse(old.data).phone || '' : '') : d.phone;
            if (typeof phone !== 'string' || phone.length > 40 || (phone.trim() && (!/^[+\d ()-]+$/.test(phone) || phone.replace(/\D/g, '').length < 7 || phone.replace(/\D/g, '').length > 15)))
                return fail('Ingresa un celular válido, por ejemplo +56 9 1234 5678.');
            const managerId = d.managerId === undefined ? (old ? JSON.parse(old.data).managerId || '' : '') : d.managerId;
            if (typeof managerId !== 'string' || managerId.length > 100)
                return fail('Superior inválido.');
            const team = await db.prepare('SELECT id,data FROM store_sellers WHERE store_id=? AND active=1').bind(d.storeId).all();
            const hierarchy = hierarchyError(team.results.map((r) => ({ ...JSON.parse(r.data), id: r.id })), d.id || id, managerId);
            if (hierarchy)
                return fail(hierarchy);
            const clean = { name: d.name.trim(), rut, role: d.role.trim(), department: d.department.trim(), phone: phone.trim(), managerId };
            if (old)
                await db.prepare('UPDATE store_sellers SET data=? WHERE id=?').bind(JSON.stringify(clean), d.id).run();
            else
                await db.prepare('INSERT INTO store_sellers(id,store_id,data) VALUES(?,?,?)').bind(id, d.storeId, JSON.stringify(clean)).run();
            return Response.json({ ok: true, id: old ? d.id : id });
        }
        if (action === 'store') {
            const name = String(d.name || '').trim();
            if (!name || name.length > 100)
                return fail('Ingresa un nombre de tienda válido.');
            await db.prepare('INSERT INTO stores(id,name) VALUES(?,?)').bind(id, name).run();
            return Response.json({ id });
        }
        if (action === 'warrantyGoal') {
            if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(d.month) || !['amount', 'units'].includes(d.basis) || !Number.isSafeInteger(d.percentBps) || d.percentBps < 0 || d.percentBps > 10000)
                return fail('Ingresa una meta entre 0 y 100%, con hasta dos decimales.');
            if (d.storeId && !await db.prepare('SELECT id FROM stores WHERE id=?').bind(d.storeId).first())
                return fail('Tienda inválida.');
            await db.prepare('INSERT INTO goals(id,amount) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET amount=excluded.amount').bind('warranty:' + d.basis + '|' + d.month + '|' + (d.storeId || 'all'), d.percentBps).run();
            return Response.json({ ok: true });
        }
        if (action === 'goal') {
            if (!/^\d{4}-\d{2}\|.+$/.test(d.id) || !Number.isSafeInteger(d.amount) || d.amount < 0)
                return fail('Meta inválida.');
            await db.prepare('INSERT INTO goals(id,amount) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET amount=excluded.amount').bind(d.id, d.amount).run();
        }
        else if (action === 'product') {
            for (const k of ['code', 'type', 'brand', 'model'])
                if (typeof d[k] !== 'string' || !d[k].trim() || d[k].length > 150)
                    return fail('Completa código, tipo, marca y modelo.');
            const duplicate = await db.prepare('SELECT id FROM products WHERE active=1 AND lower(trim(code))=lower(?)').bind(d.code.trim()).first();
            if (duplicate && duplicate.id !== d.id)
                return fail('Este código ya existe en el catálogo. Modifica el producto existente o usa otro código.', 409);
            const productData = normalizeProduct(d);
            if (d.specifications !== undefined && (!Array.isArray(d.specifications) || d.specifications.length > 50 || d.specifications.some((s) => !s || typeof s.characteristic !== 'string' || !s.characteristic.trim() || s.characteristic.length > 100 || typeof s.specification !== 'string' || !s.specification.trim() || s.specification.length > 500)))
                return fail('Completa característica y especificación en cada fila (máximo 50).');
            productData.specifications = productData.specifications.map((s) => ({ characteristic: s.characteristic.trim(), specification: s.specification.trim() }));
            if (typeof d.details !== 'string' || d.details.length > 6000)
                return fail('La información adicional debe tener hasta 6000 caracteres.');
            if (!['P1', 'P3'].includes(productData.channel))
                return fail('Selecciona el canal P1 o P3 del producto.');
            for (const k of ['height', 'width', 'depth', 'weight', 'liters'])
                if (!Number.isFinite(Number(productData[k] || 0)) || Number(productData[k]) < 0)
                    return fail('Medidas inválidas.');
            if (!Array.isArray(d.photos) || d.photos.some((x) => typeof x !== 'string' || !/^\/api\/photos\/[a-z0-9-]+$/.test(x)))
                return fail('Fotos inválidas.');
            if (d.id) {
                const result = await db.prepare('UPDATE products SET code=?,data=? WHERE id=? AND active=1').bind(d.code.trim(), JSON.stringify(productData), d.id).run();
                if (!result.meta?.changes)
                    return fail('El producto ya no está disponible. Actualiza el catálogo.', 404);
            }
            else
                await db.prepare('INSERT INTO products(id,code,data) VALUES(?,?,?)').bind(id, d.code.trim(), JSON.stringify(productData)).run();
        }
        else if (action === 'deleteProduct') {
            await db.prepare('UPDATE products SET active=0,code=? WHERE id=?').bind('archived-' + id, d.id).run();
        }
        else if (action === 'deleteSale') {
            const previous = await db.prepare('SELECT * FROM sales WHERE id=?').bind(d.id).first();
            if (!previous || JSON.parse(previous.data).deletedAt)
                return fail('La venta ya no está disponible.', 404);
            const record = { ...JSON.parse(previous.data), deletedAt: new Date().toISOString(), deletedBy: uid };
            await db.prepare('UPDATE sales SET data=? WHERE id=?').bind(JSON.stringify(record), d.id).run();
        }
        else if (action === 'sale' || action === 'updateSale') {
            const previous = action === 'updateSale' ? await db.prepare('SELECT * FROM sales WHERE id=?').bind(d.id).first() : null;
            if (action === 'updateSale' && (!previous || JSON.parse(previous.data).deletedAt))
                return fail('La venta ya no está disponible.', 404);
            const original = previous ? JSON.parse(previous.data) : null;
            const sameProduct = original && original.productId === d.productId;
            const p = sameProduct ? null : await db.prepare('SELECT * FROM products WHERE id=? AND active=1').bind(d.productId).first();
            if (!sameProduct && !p)
                return fail('Selecciona un producto del catálogo.');
            if (!await db.prepare('SELECT id FROM stores WHERE id=?').bind(d.storeId).first())
                return fail('Selecciona una tienda.');
            if (!Number.isSafeInteger(d.units) || d.units < 1 || d.units > 100000 || !Number.isSafeInteger(d.price) || d.price < 0 || !Number.isSafeInteger(d.units * d.price))
                return fail('Unidades o precio inválidos.');
            if (!['P1', 'P3'].includes(d.channel) || !['Caja', 'Kiosco'].includes(d.mode))
                return fail('Canal o modo inválido.');
            if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || isNaN(Date.parse(d.date)) || new Date(d.date).toISOString().slice(0, 10) !== d.date)
                return fail('Fecha inválida.');
            const hasWarranty = d.channel === 'P1' && d.warranty === true;
            if (hasWarranty && (!Number.isSafeInteger(d.warrantyAmount) || d.warrantyAmount <= 0))
                return fail('Ingresa el monto total de la garantía en pesos chilenos, mayor a cero.');
            const warrantyAmount = hasWarranty ? d.warrantyAmount : 0;
            if (!Number.isSafeInteger(d.price * d.units + warrantyAmount))
                return fail('El total supera el límite permitido.');
            const receiptUrl = d.receiptUrl === undefined ? (original?.receiptUrl || '') : d.receiptUrl;
            if (typeof receiptUrl !== 'string' || (receiptUrl && !/^\/api\/receipts\/[a-f0-9-]{36}$/.test(receiptUrl)))
                return fail('Foto de boleta inválida.');
            if (receiptUrl && receiptUrl !== original?.receiptUrl && !await env.BUCKET.head('receipts/' + receiptUrl.split('/').pop()))
                return fail('La boleta no se encuentra. Vuelve a subirla.');
            const sellerId = d.sellerId === undefined ? (original?.sellerId || '') : d.sellerId;
            const hasSettings = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='system_settings'").first();
            const settingsRow = hasSettings ? await db.prepare('SELECT data FROM system_settings WHERE id=?').bind('main').first() : null;
            const rules = settingsRow ? JSON.parse(settingsRow.data).salesRules || {} : {};
            if (rules.requireSeller && !sellerId)
                return fail('La configuración de la empresa exige asignar un vendedor.');
            if (rules.requireReceipt && !receiptUrl)
                return fail('La configuración de la empresa exige adjuntar la boleta.');
            if (typeof sellerId !== 'string' || sellerId.length > 100)
                return fail('Vendedor inválido.');
            let sellerName = '', sellerRole = '', sellerDepartment = '';
            if (sellerId) {
                if (original?.sellerId === sellerId && previous.store_id === d.storeId) {
                    sellerName = original.sellerName || '';
                    sellerRole = original.sellerRole || '';
                    sellerDepartment = original.sellerDepartment || '';
                }
                else {
                    const seller = await db.prepare('SELECT * FROM store_sellers WHERE id=? AND store_id=? AND active=1').bind(sellerId, d.storeId).first();
                    if (!seller)
                        return fail('El vendedor no pertenece a la tienda de esta venta.');
                    const info = JSON.parse(seller.data);
                    sellerName = info.name;
                    sellerRole = info.role;
                    sellerDepartment = info.department;
                }
            }
            const product = sameProduct ? original : JSON.parse(p.data);
            const sale = { sellerId, sellerName, sellerRole, sellerDepartment, productId: sameProduct ? original.productId : p.id, code: sameProduct ? original.code : p.code, type: product.type, brand: product.brand, model: product.model, units: d.units, price: d.price, total: d.price * d.units, channel: d.channel, mode: d.mode, warranty: hasWarranty, warrantyAmount, receiptUrl };
            if (action === 'updateSale') {
                await db.prepare('UPDATE sales SET store_id=?,date=?,data=? WHERE id=?').bind(d.storeId, d.date, JSON.stringify({ ...sale, updatedAt: new Date().toISOString(), updatedBy: uid }), d.id).run();
            }
            else
                await db.prepare('INSERT INTO sales(id,store_id,date,data,user_id) VALUES(?,?,?,?,?)').bind(id, d.storeId, d.date, JSON.stringify(sale), uid).run();
        }
        else if (action !== 'goal' && action !== 'product' && action !== 'deleteProduct')
            return fail('Acción no válida.');
        return Response.json({ ok: true });
    }
    catch (e) {
        return fail(e.message?.includes('UNIQUE') ? 'Ese código o nombre ya está registrado.' : 'No se pudo guardar. Revisa los datos e inténtalo nuevamente.');
    }
}
