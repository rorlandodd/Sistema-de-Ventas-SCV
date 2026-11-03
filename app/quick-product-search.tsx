'use client';
import {useState} from 'react';
export default function QuickProductSearch({products,onSelect}:{products:any[];onSelect:(code:string)=>void}){
 const [search,setSearch]=useState('');const q=search.trim().toLocaleLowerCase('es');const matches=q?products.filter(p=>[p.code,p.brand,p.model,p.type].join(' ').toLocaleLowerCase('es').includes(q)):[];
 return <div className="quickproduct"><label>Buscar en el catálogo<input aria-label="Búsqueda rápida de producto" placeholder="Código, marca o modelo…" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();if(matches.length===1){onSelect(matches[0].code);setSearch('')}}}}/></label>{q&&<div className="quickresults">{matches.slice(0,8).map(p=><button type="button" key={p.id} onClick={()=>{onSelect(p.code);setSearch('')}}><b>{p.brand} {p.model}</b><small>{p.code} · {p.type} · {p.channel}</small></button>)}{!matches.length&&<p>Sin coincidencias. Usa el código identificador para crear un producto.</p>}{matches.length>8&&<small>{matches.length} coincidencias. Escribe más para precisar la búsqueda.</small>}</div>}</div>;
}
