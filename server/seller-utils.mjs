export function normalizeRut(value) { return value.replace(/[.\s]/g, '').toUpperCase(); }
export function validRut(value) { const rut = normalizeRut(value); if (!/^\d{7,8}-[\dK]$/.test(rut))
    return false; const [body, dv] = rut.split('-'); let sum = 0, factor = 2; for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
} const check = 11 - sum % 11; return dv === (check === 11 ? '0' : check === 10 ? 'K' : String(check)); }
export function hierarchyError(sellers, id, managerId) {
    if (!managerId)
        return '';
    const byId = new Map(sellers.map(s => [s.id, s]));
    if (!byId.has(managerId))
        return 'El superior debe pertenecer a esta tienda y estar activo.';
    const visited = new Set();
    let current = managerId;
    while (current) {
        if (current === id)
            return 'La jerarquía no puede tener ciclos ni asignarse a sí mismo como superior.';
        if (visited.has(current))
            return 'La jerarquía seleccionada contiene un ciclo. Revisa los superiores.';
        visited.add(current);
        current = byId.get(current)?.managerId || '';
    }
    return '';
}
export function organizationRows(sellers) {
    const byId = new Map(sellers.map(s => [s.id, s]));
    const children = new Map();
    for (const s of sellers) {
        const parent = s.managerId && byId.has(s.managerId) && s.managerId !== s.id ? s.managerId : '';
        children.set(parent, [...(children.get(parent) || []), s]);
    }
    for (const group of children.values())
        group.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    const result = [], seen = new Set();
    const walk = (seller, depth, parentId) => { if (seen.has(seller.id))
        return; seen.add(seller.id); result.push({ seller, depth, parentId, number: result.length + 1 }); for (const child of children.get(seller.id) || [])
        walk(child, depth + 1, seller.id); };
    for (const root of children.get('') || [])
        walk(root, 0, '');
    for (const s of sellers)
        if (!seen.has(s.id))
            walk(s, 0, '');
    return result;
}
