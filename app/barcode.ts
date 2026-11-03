import JsBarcode from 'jsbarcode';
export function barcodeData(code:string){
 if(!code||!/^[\x20-\x7e]+$/.test(code))throw Error('El código de barras requiere un identificador con letras, números o símbolos sin tildes.');
 const result:any={};
 JsBarcode(result,code,{format:'CODE128',displayValue:false});
 const bits=result.encodings.map((e:any)=>e.data).join('');
 return {bits,width:bits.length+20};
}
