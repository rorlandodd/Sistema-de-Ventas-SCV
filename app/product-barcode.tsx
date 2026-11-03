'use client';
import {barcodeData} from './barcode';
export default function ProductBarcode({code}:{code:string}){
 try{const {bits,width}=barcodeData(code);return <figure className="productbarcode"><div className="barcode-scroll"><svg role="img" aria-label={'Código de barras CODE 128: '+code} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} 90`} style={{width:Math.max(240,width*2),maxWidth:'none',height:110}} preserveAspectRatio="none"><rect width={width} height="90" fill="white"/>{Array.from(bits).map((bit,i)=>bit==='1'?<rect key={i} x={i+10} y="8" width="1" height="65" fill="black"/>:null)}<text x={width/2} y="85" textAnchor="middle" fill="black" fontFamily="monospace" fontSize="10">{code}</text></svg></div><figcaption>Identificador del producto · CODE 128</figcaption></figure>}
 catch(e:any){return <p className="hint" role="status">{e.message}</p>}
}
