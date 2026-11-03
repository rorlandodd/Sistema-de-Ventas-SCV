import {env} from '@portable/storage';
const defaultLogo='/brands/electrolux.png';
export async function GET(req:Request){
 if(!req.headers.get('oai-authenticated-user-id'))return new Response('No autorizado',{status:401});
 const saved=await env.BUCKET!.get('settings/branding.json');
 return Response.json(saved?JSON.parse(await saved.text()):{logo:defaultLogo},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(req:Request){
 if(!req.headers.get('oai-authenticated-user-id'))return new Response('No autorizado',{status:401});
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return new Response('Origen inválido',{status:403});
 try{const {logo}=await req.json() as any;
 if(logo!==defaultLogo&&(typeof logo!=='string'||!/^\/api\/photos\/[a-f0-9-]{36}$/.test(logo)||!await env.BUCKET!.head(logo.split('/').pop()!)))return new Response('Logo inválido',{status:400});
 await env.BUCKET!.put('settings/branding.json',JSON.stringify({logo}),{httpMetadata:{contentType:'application/json'}});return Response.json({logo});
 }catch{return new Response('No se pudo guardar el logo.',{status:400});}
}
