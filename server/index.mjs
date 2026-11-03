import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {root,database} from './storage.mjs';
import {authRoute,currentUser,origin,installed} from './auth.mjs';
import * as data from './routes/data.mjs';
import * as photos from './routes/photos.mjs';
import * as photo from './routes/photo.mjs';
import * as receipts from './routes/receipts.mjs';
import * as receipt from './routes/receipt.mjs';
import * as settings from './routes/settings.mjs';
import * as views from './routes/views.mjs';
import * as branding from './routes/branding.mjs';

const routes={'/api/data':data,'/api/photos':photos,'/api/receipts':receipts,'/api/settings':settings,'/api/views':views,'/api/branding':branding};
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon'};

async function bodyBytes(req){
 const chunks=[];let size=0;
 for await(const chunk of req){
  size+=chunk.length;
  if(size>6*1024*1024)throw Object.assign(Error('Archivo demasiado grande (máximo 5 MB por imagen).'),{status:413});
  chunks.push(chunk);
 }
 return Buffer.concat(chunks);
}

const server=createServer(async(req,res)=>{
 try{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Cache-Control','no-store');

  const url=new URL(req.url,'http://localhost');
  const path=url.pathname;

  if(!['GET','HEAD','POST','PATCH'].includes(req.method)){
   res.writeHead(405);
   return res.end();
  }

  let bytes=null;
  if(['POST','PATCH'].includes(req.method)){
   if(req.headers.origin!==origin){
    res.writeHead(403,{'Content-Type':'application/json'});
    return res.end(JSON.stringify({error:'Origen no válido. Revisa APP_URL en .env.'}));
   }
   bytes=await bodyBytes(req);
  }

  const mediaRequest=req.method==='GET'&&/^\/api\/(photos|receipts)\/[a-f0-9-]{36}$/.test(path);
  const user=currentUser(req,mediaRequest);

  if(path.startsWith('/api/')){
   let result;
   if(path.startsWith('/api/auth/')||path==='/api/accounts'){
    let body={};
    if(bytes?.length){
     try{body=JSON.parse(bytes.toString())}
     catch{throw Object.assign(Error('JSON inválido'),{status:400})}
    }
    result=await authRoute(path,req,body,user);
   }else if(!user){
    result=Response.json({error:'Inicia sesión para acceder al negocio.'},{status:401});
   }else{
    const headers=new Headers();
    for(const [key,value] of Object.entries(req.headers)){
     if(!key.startsWith('oai-')&&!['host','content-length','cookie'].includes(key)&&typeof value==='string')
      headers.set(key,value);
    }
    headers.set('oai-authenticated-user-id',user.id);
    headers.set('oai-authenticated-user-email',user.email);

    let request=new Request(origin+url.pathname+url.search,{method:req.method,headers,...(bytes?.length?{body:bytes}:{})});
    let handler=routes[path],id;
    const match=path.match(/^\/api\/(photos|receipts)\/([a-f0-9-]{36})$/);
    if(match){handler=match[1]==='photos'?photo:receipt;id=match[2]}

    if(path==='/api/settings'&&req.method==='POST'&&user.role!=='admin'){
     const submitted=await request.json();
     const current=await (await settings.GET(new Request(origin+path,{headers}))).json();
     const own=submitted.profiles?.find(p=>p.id===user.id);
     const safe={
      ...current,
      revision:submitted.revision,
      preferences:submitted.preferences,
      visibleMenus:submitted.visibleMenus,
      signatureId:user.id,
      profiles:current.profiles.map(p=>p.id===user.id&&own?{...own,id:user.id}:p)
     };
     request=new Request(origin+path,{method:'POST',headers,body:JSON.stringify(safe)});
     result=await settings.POST(request);
    }else if(path==='/api/branding'&&req.method==='POST'&&user.role!=='admin'){
     result=Response.json({error:'Solo el administrador puede modificar la marca del negocio.'},{status:403});
    }else{
     result=handler?.[req.method]?await handler[req.method](request,{params:Promise.resolve({id})}):Response.json({error:'Ruta no encontrada.'},{status:404});
    }
   }
   result??=Response.json({error:'Ruta no encontrada.'},{status:404});
   res.writeHead(result.status,Object.fromEntries(result.headers));
   return res.end(Buffer.from(await result.arrayBuffer()));
  }

  if(req.method!=='GET'&&req.method!=='HEAD'){
   res.writeHead(405);
   return res.end();
  }

  let pathname;
  try{pathname=decodeURIComponent(path)}
  catch{res.writeHead(400);return res.end();}

  const staticRoot=resolve(root,'dist');
  let file=resolve(staticRoot,'.'+pathname);
  if(!file.startsWith(staticRoot+sep)&&file!==staticRoot){
   res.writeHead(403);
   return res.end();
  }

  try{
   if(!(await stat(file)).isFile())throw Error();
  }catch{
   if(extname(pathname)){
    res.writeHead(404);
    return res.end('No encontrado');
   }
   file=resolve(staticRoot,'index.html');
  }

  res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');
  if(path.startsWith('/assets/'))res.setHeader('Cache-Control','public, max-age=31536000, immutable');
  res.end(req.method==='HEAD'?undefined:await readFile(file));

}catch(e){
  const status=e.status||500;
  res.writeHead(status,{'Content-Type':'application/json'});
  res.end(JSON.stringify({error:status===500?'Error interno del servidor.':e.message}));
  if(status===500)console.error('Error de operación:',e.code||e.name);
}
});

server.requestTimeout=30000;
server.headersTimeout=15000;

server.listen(Number(process.env.PORT||3000),process.env.HOST||'127.0.0.1',()=>{
 console.log('Control de ventas 3.02: '+origin);
 
 // Mostrar código de instalación si aplica
 if(!installed()){
  try{
   const codigoPath=resolve(process.env.DATA_DIR||resolve(root,'data'),'codigo-instalacion.txt');
   const codigo=readFileSync(codigoPath,'utf8').trim();
   console.log('----------------------------------------------------');
   console.log('🔑 CÓDIGO DE INSTALACIÓN:', codigo);
   console.log('----------------------------------------------------');
  }catch(e){
   console.log('⚠️ Primera instalación: el archivo de código se está generando en data/.');
  }
 }

 // --- AUTO-RELOADER PARA MANTENER ACTIVO EL SERVIDOR ---
 const targetUrl = process.env.APP_URL;
 if (targetUrl && !targetUrl.includes('localhost') && !targetUrl.includes('127.0.0.1')) {
  const interval = 30000; // 30 segundos
  setInterval(() => {
   fetch(targetUrl)
    .then(response => {
     console.log(`[Auto-Ping] Recargado a las ${new Date().toISOString()}: Código ${response.status}`);
    })
    .catch(error => {
     console.error(`[Auto-Ping] Error a las ${new Date().toISOString()}:`, error.message);
    });
  }, interval);
  console.log(`🚀 Sistema de auto-ping activado para: ${targetUrl}`);
 }
});

for(const signal of ['SIGTERM','SIGINT'])
 process.on(signal,()=>server.close(()=>{database.close();process.exit(0)}));