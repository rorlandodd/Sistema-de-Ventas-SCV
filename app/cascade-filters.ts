type ProductFields={type:string;brand:string;model:string};
export function cascadeFilters(rows:ProductFields[],selected:ProductFields){
 const values=(items:ProductFields[],key:keyof ProductFields)=>[...new Set(items.map(r=>r[key]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es',{numeric:true,sensitivity:'base'}));
 const types=values(rows,'type');
 const type=types.includes(selected.type)?selected.type:'';
 const typed=rows.filter(r=>!type||r.type===type);
 const brands=values(typed,'brand');
 const brand=brands.includes(selected.brand)?selected.brand:'';
 const models=values(typed.filter(r=>!brand||r.brand===brand),'model');
 const model=models.includes(selected.model)?selected.model:'';
 return {types,brands,models,type,brand,model};
}
