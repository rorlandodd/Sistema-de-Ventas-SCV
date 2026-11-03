'use client';
import {useState} from 'react';
import {monthlyReport} from './report-utils';
export default function MonthlyReport({sales,stores,goals,shop,today,signature,company}:{sales:any[];stores:any[];goals:any;shop:string;today:string;signature?:string;company?:string}){
 const [month,setMonth]=useState(today.slice(0,7)),[error,setError]=useState(''),[working,setWorking]=useState(false);
 const label=stores.find(s=>s.id===shop)?.name||'Todas las tiendas';
 async function download(){setWorking(true);setError('');try{const {exportMonthly}=await import('./monthly-export');const report=monthlyReport(sales,month,shop,goals,today);await exportMonthly(report,stores,label,'pdf',signature,company)}catch{setError('No se pudo generar el informe. Inténtalo de nuevo.')}finally{setWorking(false)}}
 return <div className="monthlydownload"><div><b>Informe mensual completo en PDF</b><p>Incluye gráficos, garantías y avance de meta. Usa el mes y la tienda seleccionados; no los filtros del listado.</p></div><div className="actions wrap"><label>Mes<input type="month" aria-label="Mes del informe completo PDF" value={month} disabled={working} onChange={e=>{if(e.target.value)setMonth(e.target.value)}}/></label><button className="primary" disabled={working||!month} onClick={download}>{working?'Generando PDF…':'Generar PDF completo'}</button></div>{error&&<p className="downloaderror" role="alert">{error}</p>}</div>;
}
