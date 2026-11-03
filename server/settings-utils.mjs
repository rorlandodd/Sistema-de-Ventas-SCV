import { brandLogo } from './product-utils.mjs';
export const defaultProfile = { id: 'rene-default', name: 'René Díaz Díaz', email: '', phone: '', role: 'Agente de ventas Electrolux' };
export const menuNames = ['Ventas', 'Catálogo', 'Garantías', 'Informes de ventas', 'Vendedores de tienda actual'];
export const defaultVisibleMenus = Object.fromEntries(menuNames.map(name => [name, true]));
export const defaultSettings = { companyName: 'Control de ventas', logo: '/brands/electrolux.png', brandLogos: {}, profiles: [defaultProfile], signatureId: 'rene-default', revision: 0, visibleMenus: defaultVisibleMenus };
export function signatureFor(settings) { const p = settings.profiles?.find((p) => p.id === settings.signatureId) || settings.profiles?.[0] || defaultProfile; return [p.name + (p.role ? ' – ' + p.role : ''), [settings.preferences?.signatureEmail === false ? '' : p.email, settings.preferences?.signaturePhone === false ? '' : p.phone].filter(Boolean).join(' · ')].filter(Boolean).join('\n'); }
export function logoFor(brand, settings) { const key = Object.keys(settings.brandLogos || {}).find(k => k.toLocaleLowerCase('es') === brand.toLocaleLowerCase('es')); return key ? settings.brandLogos[key] || brandLogo(brand) : brandLogo(brand); }
export const menuLabel = (name) => name === 'Vendedores de tienda actual' ? 'Vendedores' : name;
