import {money,saleHeaders,saleRows,monthlyReport} from './report-utils';
type Report=ReturnType<typeof monthlyReport>;
export async function exportMonthly(r:Report,stores:any[],store:string,kind:string,signature='René Díaz Díaz – Agente de ventas Electrolux',company='Control de ventas'){
 const sections:[string,any[]][]=[['Canales',r.channels],['Kiosco y tienda',r.modes],['Productos con y sin garantía',r.warranties],['Marcas',r.brands],['Tipos',r.types],['Modelos',r.models]];
 const summary=[['Empresa',company],['Mes',r.month],['Tienda',store],['Meta CLP',r.target||'Sin definir'],['Ventas CLP',r.total],['Unidades',r.units],['Número de ventas',r.rows.length],['Cumplimiento %',r.progress===null?'Sin meta':Number(r.progress.toFixed(2))],['Falta CLP',r.remaining??'Sin meta'],['Proyección CLP',r.projection],['Unidades con garantía',r.warrantyUnits],['Garantías CLP',r.warranty.amount],['Meta garantías por monto %',r.warranty.target??'Sin definir'],['Resultado garantías por monto %',r.warranty.actual?.toFixed(2)??'Sin base'],['Meta garantías por unidades %',r.warrantyByUnits.target??'Sin definir'],['Resultado garantías por unidades %',r.warrantyByUnits.actual?.toFixed(2)??'Sin base'],['Proyección garantías CLP',r.warranty.projectedAmount],['Garantías sin monto (datos parciales)',r.warranty.missingAmount]];
 if(kind==='excel'){
 const XLSX=await import('xlsx');const wb=XLSX.utils.book_new();const add=(name:string,rows:any[][])=>{const ws=XLSX.utils.aoa_to_sheet(rows);ws['!cols']=Array.from({length:Math.max(...rows.map(row=>row.length))},()=>({wch:24}));XLSX.utils.book_append_sheet(wb,ws,name);};
 add('Resumen',[['Indicador','Valor'],...summary,['Firma',signature],['Nota','Tienda = Caja. Garantías separadas del valor de los productos. P3 y kiosco sin garantía no afectan el porcentaje.']]);
 for(const [name,groups] of sections)add(name,[['Detalle','Unidades','Ventas','Total CLP','% meta'],...groups.map(g=>[g.label,g.units,g.count,g.total,r.target?Number((g.total/r.target*100).toFixed(2)):'Sin meta'])]);
 add('Diario',[['Día','Venta CLP','Acumulado CLP','Meta acumulada CLP'],...r.daily.map(d=>[d.day,d.amount,d.cumulative,Math.round(d.goal)])]);
 add('Productos vendidos',[saleHeaders,...saleRows(r.rows,stores),['TOTAL','','','','',r.units,'',r.total]]);
 XLSX.writeFile(wb,'Informe-mensual-'+r.month+'.xlsx');return;
 }
 const {jsPDF}=await import('jspdf');const {default:autoTable}=await import('jspdf-autotable');const doc=new jsPDF();let y=43;
 const banner=()=>{doc.setFillColor(15,48,62);doc.rect(0,0,210,31,'F');doc.setTextColor(255);doc.setFontSize(17);doc.text('Informe mensual de ventas',14,14);doc.setFontSize(9);doc.text(doc.splitTextToSize(r.month+' · '+store,180).slice(0,2),14,23);doc.setTextColor(30,45,55);};banner();
 const space=(height:number)=>{if(y+height>270){doc.addPage();banner();y=43;}};
 const title=(text:string)=>{space(15);doc.setFontSize(12);doc.setTextColor(30,45,55);doc.text(text,14,y);y+=8;};
 const table=(head:string[],body:any[][],foot?:any[][])=>{autoTable(doc,{startY:y,head:[head],body,foot,showFoot:'lastPage',margin:{top:42,bottom:22},styles:{fontSize:8,overflow:'linebreak'},headStyles:{fillColor:[15,48,62]},footStyles:{fillColor:[229,242,237],textColor:[15,48,62]}});y=(doc as any).lastAutoTable.finalY+12;};
 title('Resultados frente a la meta del mes');table(['Indicador','Resultado'],summary.map(([key,value])=>[key,String(key).includes('CLP')&&typeof value==='number'?money(value):String(value)]));
 space(80);title('Ventas acumuladas frente a la meta');const top=y,max=Math.max(1,r.target,...r.daily.map(d=>d.cumulative));doc.setFontSize(8);doc.text(money(max),14,top);doc.setDrawColor(220);doc.line(20,top+50,194,top+50);doc.setDrawColor(39,139,117);doc.setLineWidth(.7);
 for(let i=1;i<r.daily.length;i++){const prev=r.daily[i-1],cur=r.daily[i];doc.line(20+(i-1)/(r.days-1)*174,top+50-prev.cumulative/max*45,20+i/(r.days-1)*174,top+50-cur.cumulative/max*45);}
 if(r.target){doc.setDrawColor(178,121,44);doc.setLineDashPattern([2,1],0);doc.line(20,top+50-r.daily[0].goal/max*45,194,top+50-r.target/max*45);doc.setLineDashPattern([],0);}
 doc.setTextColor(30,45,55);doc.text('Día 1',20,top+56);doc.text('Día '+r.days,180,top+56);doc.text('Verde: venta acumulada. Discontinua: avance esperado de la meta.',14,top+63);y=top+76;
 for(const [name,groups] of sections){space(Math.min(10,groups.length)*10+45);title(name+' · montos y cantidades');if(groups.length){const chart=groups.slice(0,10);space(chart.length*10+14);const maximum=Math.max(1,...chart.map(g=>g.total));doc.setFontSize(8);if(groups.length>10){doc.text('Gráfico: 10 mayores montos. Tabla: detalle completo.',14,y);y+=7;}
 for(const g of chart){space(11);doc.setTextColor(30,45,55);doc.text(doc.splitTextToSize(g.label,60)[0],14,y+4);doc.setFillColor(64,151,127);if(g.total>0)doc.rect(78,y,65*g.total/maximum,5,'F');doc.text(money(g.total),195,y+4,{align:'right'});y+=10;}y+=4;}
 table(['Detalle','Unidades','Ventas','Total CLP','% meta'],groups.map(g=>[g.label,g.units,g.count,money(g.total),r.target?(g.total/r.target*100).toFixed(1)+'%':'Sin meta']));}
 space(26);doc.setFontSize(8);doc.text(doc.splitTextToSize('Tienda corresponde al modo Caja. Los montos de garantías son adicionales a los productos. Base del porcentaje: P1 en caja y cualquier venta con garantía; P3 y kiosco sin garantía quedan excluidos. Garantías antiguas sin monto: resultados parciales.',180),14,y);y+=20;
 title('Detalle de garantías vendidas');table(['Fecha','Marca / modelo','Unidades','Canal / modo','Garantía CLP'],r.warranty.covered.map(s=>[s.date,s.brand+' '+s.model,s.units,s.channel+' / '+s.mode,s.warrantyAmount>0?money(s.warrantyAmount):'Monto pendiente']),[['TOTAL','','','',money(r.warranty.amount)]]);
 title('Listado completo de productos vendidos');table(saleHeaders,saleRows(r.rows,stores).map(row=>row.map((v,i)=>i===7?money(Number(v)):v)),[['TOTAL','','','','',r.units,'',money(r.total)]]);
 for(let i=1;i<=doc.getNumberOfPages();i++){doc.setPage(i);banner();doc.setTextColor(100);doc.setFontSize(7);doc.text(doc.splitTextToSize(signature,165),14,280);doc.text(`${i} / ${doc.getNumberOfPages()}`,190,286,{align:'right'});}
 doc.save('Informe-mensual-'+r.month+'.pdf');
}
