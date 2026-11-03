export function brandLogo(brand:string):string|null {
 const key=String(brand||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,'');
 return ({electrolux:'/brands/electrolux.png',mademsa:'/brands/mademsa.webp',fensa:'/brands/fensa.png',fenza:'/brands/fensa.png'} as Record<string,string>)[key]||null;
}
export function normalizeProduct(p:any){
 const {price,length,...rest}=p;
 return {...rest,depth:p.depth??length??'',liters:p.liters??'',specifications:Array.isArray(p.specifications)?p.specifications:[]};
}
export function selectSaleProduct(sale:any,product:any,code:string){
 const channel=product?.channel==='P1'||product?.channel==='P3'?product.channel:sale.channel;
 return {...sale,code,productId:product?.id||'',channel,warranty:channel==='P3'?false:sale.warranty,warrantyAmount:channel==='P3'?'':sale.warrantyAmount};
}
