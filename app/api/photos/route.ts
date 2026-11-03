import {env} from '@portable/storage';
export async function POST(req:Request){
 if(!req.headers.get('oai-authenticated-user-id'))return new Response('No autorizado',{status:401});
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return new Response('Origen inválido',{status:403});
 const form=await req.formData();const file=form.get('file') as File;
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)return new Response('Usa JPG, PNG o WebP de hasta 5 MB.',{status:400});
 const id=crypto.randomUUID();await env.BUCKET!.put(id,await file.arrayBuffer(),{httpMetadata:{contentType:file.type}});
 return Response.json({url:'/api/photos/'+id});
}
