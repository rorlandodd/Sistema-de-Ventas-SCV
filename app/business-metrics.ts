export function businessPace(rows:any[],month:string,today:string,target:number){
 const days=new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate();
 const elapsed=month===today.slice(0,7)?Number(today.slice(8)):month<today.slice(0,7)?days:0;
 const accrued=rows.filter(r=>r.date<=today).reduce((n,r)=>n+r.total,0);
 const remainingDays=month===today.slice(0,7)?days-elapsed+1:month>today.slice(0,7)?days:0;
 return {days,elapsed,accrued,projection:elapsed?Math.round(accrued/elapsed*days):0,expected:target*elapsed/days,dailyNeeded:remainingDays?Math.ceil(Math.max(0,target-accrued)/remainingDays):0,remainingDays};
}
