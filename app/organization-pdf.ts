import {organizationRows} from './seller-utils';
export async function organizationPdf(sellers:any[],storeName:string,company:string,signature:string){
 const {jsPDF}=await import('jspdf');const doc=new jsPDF({orientation:'landscape',format:'letter'});
 const rows=organizationRows(sellers),pageW=doc.internal.pageSize.getWidth(),pageH=doc.internal.pageSize.getHeight();
 const pageSize=5,rowH=30,top=43;
 const totalPages=Math.max(1,Math.ceil(rows.length/pageSize));
 const positions=new Map(rows.map((r,i)=>[r.seller.id,{page:Math.floor(i/pageSize),y:top+(i%pageSize)*rowH,x:17+Math.min(r.depth,7)*11}]));
 for(let page=0;page<totalPages;page++){
  if(page)doc.addPage('letter','landscape');doc.setFillColor(18,48,67);doc.rect(0,0,pageW,31,'F');doc.setTextColor(255);doc.setFont('helvetica','bold');doc.setFontSize(17);doc.text('Organigrama de trabajadores',14,12);doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text(doc.splitTextToSize(company+' · '+storeName,pageW-30).slice(0,2),14,19);
  doc.setTextColor(85);doc.setFontSize(8);doc.text('Las líneas indican dependencia directa. Numeración única para referencias entre páginas.',14,37);
  const batch=rows.slice(page*pageSize,(page+1)*pageSize);
  for(const node of batch){const pos=positions.get(node.seller.id)!;const parent=positions.get(node.parentId);const parentNode=rows.find(r=>r.seller.id===node.parentId);const width=pageW-pos.x-17;
   if(parent&&parent.page===page){doc.setDrawColor(121,151,165);doc.setLineWidth(.4);doc.line(pos.x-4,parent.y+26,pos.x-4,pos.y+11);doc.line(pos.x-4,pos.y+11,pos.x,pos.y+11);doc.line(parent.x+4,parent.y+26,pos.x-4,parent.y+26)}
   doc.setFillColor(node.depth===0?232:247,node.depth===0?242:249,node.depth===0?246:250);doc.setDrawColor(207,220,227);doc.roundedRect(pos.x,pos.y,width,26,2,2,'FD');doc.setTextColor(24,49,66);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text(doc.splitTextToSize(node.number+'. '+node.seller.name,width-9).slice(0,2),pos.x+4,pos.y+5);doc.setFont('helvetica','normal');doc.setFontSize(7);doc.text(doc.splitTextToSize(node.seller.role+' · '+node.seller.department,width-9).slice(0,2),pos.x+4,pos.y+14);doc.setTextColor(80);doc.setFontSize(7);const report=parentNode?'Reporta a #'+parentNode.number+' · página '+(Math.floor((parentNode.number-1)/pageSize)+1):'Sin superior asignado';doc.text(doc.splitTextToSize('Nivel '+(node.depth+1)+' · '+report,width-9).slice(0,1),pos.x+4,pos.y+23);
  }
  if(!rows.length){doc.setTextColor(90);doc.text('No hay trabajadores registrados en esta tienda.',14,55)}
  doc.setTextColor(100);doc.setFontSize(7);doc.text(doc.splitTextToSize(signature,pageW-55).slice(0,2),14,pageH-10);doc.text((page+1)+' / '+totalPages,pageW-14,pageH-10,{align:'right'});
 }
 return doc;
}
