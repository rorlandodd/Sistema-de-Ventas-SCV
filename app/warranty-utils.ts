export type WarrantyBasis='amount'|'units';
export function warrantyGoalKey(month:string,shop:string,basis:WarrantyBasis='amount'){return `warranty:${basis}|${month}|${shop||'all'}`;}
export function warrantySummary(sales:any[],month:string,shop:string,goals:any,today:string,basis:WarrantyBasis='amount'){
 const rows=sales.filter(s=>!s.deletedAt&&s.date.startsWith(month)&&(!shop||s.storeId===shop));
 const covered=rows.filter(s=>s.warranty===true);
 // Only eligible counter sales affect the denominator. Kiosk/P3 rows without a warranty have no impact.
 const eligible=rows.filter(s=>s.warranty===true||(s.channel==='P1'&&s.mode==='Caja'));
 const sum=(items:any[],key:string)=>items.reduce((n,s)=>n+(Number(s[key])||0),0);
 const known=covered.filter(s=>Number.isSafeInteger(s.warrantyAmount)&&s.warrantyAmount>0);
 const missingAmount=covered.length-known.length;
 const amount=sum(known,'warrantyAmount'),units=sum(covered,'units');
 const eligibleAmount=sum(eligible,'total'),eligibleUnits=sum(eligible,'units');
 const numerator=basis==='amount'?amount:units,denominator=basis==='amount'?eligibleAmount:eligibleUnits;
 const key=warrantyGoalKey(month,shop,basis),target=goals[key]==null?null:goals[key]/100;
 const actual=denominator>0?numerator/denominator*100:null;
 const targetValue=target===null?null:denominator*target/100;
 const gap=targetValue===null?null:Math.max(0,(basis==='units'?Math.ceil(targetValue):Math.ceil(targetValue))-numerator);
 const days=new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate();
 const elapsed=month===today.slice(0,7)?Number(today.slice(8)):month<today.slice(0,7)?days:0;
 // Project only from elapsed dates; future-dated records are shown in the list but cannot inflate the daily pace.
 const accrued=eligible.filter(s=>s.date<=today),accruedCovered=covered.filter(s=>s.date<=today);
 const accruedAmount=sum(accruedCovered.filter(s=>Number.isSafeInteger(s.warrantyAmount)&&s.warrantyAmount>0),'warrantyAmount');
 const projectedAmount=elapsed?Math.round(accruedAmount/elapsed*days):0;
 const projectedUnits=elapsed?Math.round(sum(accruedCovered,'units')/elapsed*days):0;
 const accruedBase=basis==='amount'?sum(accrued,'total'):sum(accrued,'units');
 const accruedValue=basis==='amount'?accruedAmount:sum(accruedCovered,'units');
 const projectedPercent=elapsed&&accruedBase>0?accruedValue/accruedBase*100:null;
 const pendingFuture=rows.filter(s=>s.date>today).length;
 const daily=Array.from({length:days},(_,i)=>{const to=month+'-'+String(i+1).padStart(2,'0');const den=sum(eligible.filter(s=>s.date<=to),basis==='amount'?'total':'units');const num=basis==='amount'?sum(known.filter(s=>s.date<=to),'warrantyAmount'):sum(covered.filter(s=>s.date<=to),'units');return {day:i+1,value:den>0?num/den*100:null};});
 return {rows,covered,eligible,amount,units,eligibleAmount,eligibleUnits,missingAmount,denominator,numerator,target,actual,gap,targetValue,days,elapsed,projectedAmount,projectedUnits,projectedPercent,pendingFuture,daily,basis};
}
