export const salesPdfColumns=[
 {key:'date',label:'Fecha'},{key:'store',label:'Tienda'},{key:'type',label:'Tipo de producto'},{key:'brand',label:'Marca'},{key:'model',label:'Modelo'},{key:'code',label:'Código identificador'},{key:'units',label:'Unidades'},{key:'channel',label:'Canal P1 / P3'},{key:'mode',label:'Caja / kiosco'},{key:'seller',label:'Vendedor'},{key:'price',label:'Valor unitario'},{key:'warranty',label:'Garantía extendida'},{key:'warrantyAmount',label:'Monto garantía'},{key:'total',label:'Total'}
];
export const defaultSalesPdfColumns=['date','store','type','brand','model','units','channel','total'];
const clp=(v:number)=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(v||0);
export function salesPdfTable(rows:any[],stores:any[],selected:string[]){
 const columns=salesPdfColumns.filter(c=>selected.includes(c.key));if(!columns.length)throw Error('Selecciona al menos un dato para el informe.');
 const body=rows.map(s=>{const values:Record<string,string|number>={date:String(s.date||'').split('-').reverse().join('/'),store:stores.find(t=>t.id===s.storeId)?.name||'Tienda',type:s.type||'—',brand:s.brand||'—',model:s.model||'—',code:s.code||'—',units:s.units,channel:s.channel||'—',mode:s.mode||'—',seller:s.sellerName||'Sin asignar',price:clp(s.price),warranty:s.warranty?'Sí':'No',warrantyAmount:s.warranty?clp(s.warrantyAmount):clp(0),total:clp(s.total)};return columns.map(c=>values[c.key]);});
 return {columns,head:columns.map(c=>c.label),body,total:rows.reduce((n,s)=>n+Number(s.total||0),0)};
}
export async function createSalesPdf({rows,stores,selected,company,signature,filters}:{rows:any[];stores:any[];selected:string[];company:string;signature:string;filters:string}){
 const data=salesPdfTable(rows,stores,selected);const {jsPDF}=await import('jspdf');const {default:autoTable}=await import('jspdf-autotable');
 const doc=new jsPDF({format:'letter',orientation:data.columns.length>7?'landscape':'portrait'});const w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight();
 doc.setFontSize(15);doc.setFont('helvetica','bold');const title=doc.splitTextToSize(company,w-28);doc.text(title,14,17);let y=17+title.length*6;doc.setFontSize(11);doc.text('Informe de ventas',14,y);doc.setFont('helvetica','normal');doc.setFontSize(8);y+=7;const caption=doc.splitTextToSize(filters,w-28);doc.text(caption,14,y);y+=caption.length*4+6;
 autoTable(doc,{startY:y,margin:{top:16,bottom:32,left:14,right:14},head:[data.head],body:data.body,styles:{fontSize:data.columns.length>10?7:8,cellPadding:2.5,overflow:'linebreak'},headStyles:{fillColor:[12,38,58]},rowPageBreak:'avoid'});
 let end=(doc as any).lastAutoTable.finalY+10;if(end>h-35){doc.addPage();end=22}doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text('Total del informe: '+clp(data.total),14,end);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text(`${rows.length} ventas · Pesos chilenos (CLP) · Total de productos, sin garantías`,14,end+6);
 const n=doc.getNumberOfPages();for(let i=1;i<=n;i++){doc.setPage(i);doc.setFontSize(7);doc.setTextColor(90);doc.text(doc.splitTextToSize(signature,w-50),14,h-20);doc.text(`${i} / ${n}`,w-14,h-10,{align:'right'});}return doc;
}
