'use client';
import {useState} from 'react';

export default function CatalogChoice({kind,value,options,onChange}:{kind:'brand'|'type';value:string;options:string[];onChange:(value:string)=>void}){
 const [creating,setCreating]=useState(false);
 const label=kind==='brand'?'Marca':'Tipo de producto';
 const newLabel=kind==='brand'?'Nueva marca':'Nuevo tipo de producto';
 const choices=Array.from(new Set([...options,value].filter(Boolean))).sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'}));
 return <div className="catalogchoice"><label>{label}<select required value={creating?'__new_option__':value} onChange={e=>{const custom=e.target.value==='__new_option__';setCreating(custom);onChange(custom?'':e.target.value)}}><option value="">Selecciona {kind==='brand'?'una marca':'un tipo'}</option>{choices.map(option=><option key={option} value={option}>{option}</option>)}<option value="__new_option__">+ Agregar {kind==='brand'?'nueva marca':'nuevo tipo de producto'}</option></select></label>{creating&&<label className="newcatalogchoice">{newLabel}<input autoFocus required maxLength={150} pattern=".*\S.*" title="Escribe un nombre, no solo espacios." placeholder={kind==='brand'?'Escribe el nombre de la marca':'Escribe el tipo de producto'} value={value} onChange={e=>onChange(e.target.value)} onBlur={()=>{const trimmed=value.trim().replace(/\s+/g,' ');const existing=options.find(option=>option.localeCompare(trimmed,'es',{sensitivity:'base'})===0);onChange(existing||trimmed)}}/><small>Quedará disponible al guardar el producto.</small></label>}</div>;
}
