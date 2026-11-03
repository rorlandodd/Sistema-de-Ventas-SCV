import {env} from '@portable/storage';
export async function POST(req:Request){
 if(!req.headers.get('oai-authenticated-user-id'))return new Response('No autorizado',{status:401});
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return new Response('Origen inválido',{status:403});
 try{
 const form=await req.formData();const file=form.get('file');
 if(!(file instanceof File)||file.size===0||file.size>5*1024*1024)return new Response('Selecciona una foto de hasta 5 MB.',{status:400});
 const bytes=new Uint8Array(await file.arrayBuffer());
 const isJpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 const isPng=[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
 const isWebp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
 const type=isJpeg?'image/jpeg':isPng?'image/png':isWebp?'image/webp':null;
 if(!type||type!==file.type)return new Response('La boleta debe ser una imagen JPG, PNG o WebP válida.',{status:400});
 const id=crypto.randomUUID();await env.BUCKET!.put('receipts/'+id,bytes,{httpMetadata:{contentType:type}});
 return Response.json({url:'/api/receipts/'+id});
 }catch{return new Response('No se pudo subir la boleta. Inténtalo nuevamente.',{status:400});}
}
