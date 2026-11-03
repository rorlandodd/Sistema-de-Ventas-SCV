'use client';
import {Pencil,Trash2} from 'lucide-react';
import VisibleTable,{type TableColumn} from './visible-table';
import {money} from './report-utils';
export default function SalesTable({rows,stores,account,report=false,onEdit,onDelete,onReceipt}:{rows:any[];stores:any[];account:string;report?:boolean;onEdit:(s:any)=>void;onDelete:(s:any)=>void;onReceipt:(url:string)=>void}){
 const columns:TableColumn[]=[
 {key:'date',label:'Fecha',render:s=>s.date.split('-').reverse().join('/')},
 {key:'store',label:'Tienda',render:s=>stores.find(t=>t.id===s.storeId)?.name||'Tienda'},
 {key:'type',label:'Tipo',render:s=>s.type},{key:'brand',label:'Marca',render:s=>s.brand},{key:'model',label:'Modelo',render:s=><b>{s.model}</b>},
 {key:'code',label:'Código',defaultVisible:!report,render:s=>s.code},
 {key:'seller',label:'Vendedor',defaultVisible:!report,render:s=>s.sellerName||'Sin asignar'},
 {key:'units',label:'Unidades',render:s=>s.units},{key:'channel',label:'Canal',render:s=><span className="badge">{s.channel}</span>},
 {key:'mode',label:'Caja / kiosco',defaultVisible:!report,render:s=>s.mode},
 {key:'warranty',label:'Garantía extendida',defaultVisible:!report,render:s=>s.warranty?'Sí':'No'},
 {key:'warrantyAmount',label:'Monto garantía',defaultVisible:!report,render:s=>s.warranty?(s.warrantyAmount>0?money(s.warrantyAmount):'Monto pendiente'):'—'},
 {key:'price',label:'Valor unitario',defaultVisible:!report,render:s=>money(s.price)},
 {key:'total',label:'Total CLP',className:'right',render:s=><b>{money(s.total)}</b>},
 {key:'receipt',label:'Boleta',defaultVisible:!report,render:s=>s.receiptUrl?<button className="textbutton" onClick={()=>onReceipt(s.receiptUrl)}>Ver boleta</button>:'—'}
 ];
 if(!report)columns.push({key:'actions',label:'Acciones',fixed:true,className:'saleactions',render:s=><div className="actions"><button className="icon" title="Modificar venta" aria-label={'Modificar venta '+s.model} onClick={()=>onEdit(s)}><Pencil size={15}/></button><button className="icon danger" title="Eliminar venta" aria-label={'Eliminar venta '+s.model} onClick={()=>onDelete(s)}><Trash2 size={15}/></button></div>});
 return <VisibleTable columns={columns} rows={rows} preferenceKey={'table-columns:'+account+':'+(report?'reports':'sales')} empty="No hay ventas para esta selección."/>;
}
