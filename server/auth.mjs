import {randomBytes,randomUUID,scrypt as rawScrypt,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {existsSync,readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {resolve} from 'node:path';
import {database,dataDir,initializeProfile} from './storage.mjs';
const scrypt=promisify(rawScrypt),hash=x=>createHash('sha256').update(x).digest('hex');
export const origin=new URL(process.env.APP_URL||'http://localhost:3000').origin;
export const secure=origin.startsWith('https://');
if(!secure&&!['localhost','127.0.0.1','[::1]'].includes(new URL(origin).hostname))throw Error('APP_URL debe usar HTTPS para un dominio público.');
const codeFile=resolve(dataDir,'codigo-instalacion.txt');
export function installed(){return !!database.prepare('SELECT id FROM installation WHERE id=1').get();}
if(!installed()&&!existsSync(codeFile))writeFileSync(codeFile,randomBytes(24).toString('base64url'),{mode:0o600});
export async function passwordHash(password){const salt=randomBytes(16).toString('hex');const value=await scrypt(password,salt,64);return salt+':'+Buffer.from(value).toString('hex');}
async function verify(password,encoded){const [salt,key]=encoded.split(':');const computed=Buffer.from(await scrypt(password,salt,64));const expected=Buffer.from(key,'hex');return expected.length===computed.length&&timingSafeEqual(expected,computed);}
export function validateUser(d){return typeof d.username==='string'&&/^[a-zA-Z0-9_.-]{3,40}$/.test(d.username)&&typeof d.email==='string'&&d.email.length<=150&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)&&typeof d.password==='string'&&d.password.length>=12&&d.password.length<=128&&d.password===d.repeat;}
const publicUser=u=>({id:u.id,username:u.username,name:u.name,email:u.email,role:u.role,active:u.active});
export function currentUser(req,allowMedia=false){const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('sales_session='))?.slice(14);if(!token||token.length>100)return null;const session=database.prepare('SELECT a.*,s.client_hash FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>? AND a.active=1').get(hash(token),Date.now());if(!session)return null;if(!allowMedia&&hash(String(req.headers['x-session-key']||''))!==session.client_hash)return null;return session;}
export function sessionCookie(token){return 'sales_session='+token+'; Path=/; HttpOnly; SameSite=Strict'+(secure?'; Secure':'');}
function limited(ip,username){const now=Date.now();database.prepare('DELETE FROM login_attempts WHERE reset_at<?').run(now);const keys=['ip:'+ip,'user:'+username.toLowerCase()];if(keys.some(k=>(database.prepare('SELECT attempts FROM login_attempts WHERE key=?').get(hash(k))?.attempts||0)>=10))return true;for(const k of keys)database.prepare('INSERT INTO login_attempts(key,attempts,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1').run(hash(k),now+15*60*1000);return false;}
export async function authRoute(path,req,body,user){
 const json=(data,status=200,headers={})=>Response.json(data,{status,headers});
 if(path==='/api/auth/status'&&req.method==='GET')return json({setup:!installed(),user:user?publicUser(user):null});
 if(path==='/api/auth/setup'&&req.method==='POST'){
 if(installed())return json({error:'El administrador ya fue creado.'},409);
 if(limited(req.socket.remoteAddress,'setup'))return json({error:'Demasiados intentos. Espera 15 minutos.'},429);
 if(!validateUser(body))return json({error:'Usuario: 3 a 40 caracteres. Contraseña: mínimo 12 caracteres y ambas iguales. Correo válido.'},400);
 const expected=readFileSync(codeFile,'utf8').trim();const candidate=String(body.setupCode||'');if(hash(candidate)!==hash(expected))return json({error:'Código de instalación incorrecto.'},403);
 const password=await passwordHash(body.password),id=randomUUID();
 database.exec('BEGIN IMMEDIATE');try{if(installed())throw Error('already');database.prepare('INSERT INTO accounts(id,username,email,name,password_hash,role,created_at) VALUES(?,?,?,?,?,?,?)').run(id,body.username.toLowerCase(),body.email,body.username,password,'admin',Date.now());database.prepare('INSERT INTO users(id,email,name) VALUES(?,?,?)').run(id,body.email,body.username);initializeProfile(id,body.username,body.email,true);database.prepare('INSERT INTO installation(id,completed_at) VALUES(1,?)').run(Date.now());database.exec('COMMIT');}catch(e){database.exec('ROLLBACK');return json({error:'La instalación ya se completó o no pudo guardarse.'},409)}
 try{unlinkSync(codeFile)}catch{}return json({ok:true});
 }
 if(path==='/api/auth/login'&&req.method==='POST'){
 if(!installed())return json({error:'Primero crea el administrador.'},409);
 const username=String(body.username||'').slice(0,40).toLowerCase();if(limited(req.socket.remoteAddress,username))return json({error:'Demasiados intentos. Espera 15 minutos.'},429);
 const account=database.prepare('SELECT * FROM accounts WHERE username=? AND active=1').get(username);
 const pass=String(body.password||'').slice(0,129);const valid=await verify(pass,account?.password_hash||'0123456789abcdef0123456789abcdef:'+('00'.repeat(64)));
 if(!account||!valid)return json({error:'Usuario o contraseña incorrectos.'},401);
 for(const key of ['ip:'+req.socket.remoteAddress,'user:'+username])database.prepare('DELETE FROM login_attempts WHERE key=?').run(hash(key));
 const token=randomBytes(32).toString('base64url'),clientKey=randomBytes(32).toString('base64url');database.prepare('DELETE FROM sessions WHERE expires_at<?').run(Date.now());database.prepare('INSERT INTO sessions(token_hash,account_id,expires_at,client_hash) VALUES(?,?,?,?)').run(hash(token),account.id,Date.now()+8*3600*1000,hash(clientKey));return json({ok:true,clientKey},200,{'Set-Cookie':sessionCookie(token)});
 }
 if(path==='/api/auth/logout'&&req.method==='POST'){const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('sales_session='))?.slice(14);if(token)database.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token));return json({ok:true},200,{'Set-Cookie':sessionCookie('')+'; Max-Age=0'});}
 if(path==='/api/accounts'){
 if(!user||user.role!=='admin')return json({error:'Solo el administrador puede gestionar accesos.'},403);
 if(req.method==='GET')return json({accounts:database.prepare('SELECT * FROM accounts ORDER BY username').all().map(publicUser)});
 if(req.method==='POST'){
 if(!validateUser(body))return json({error:'Revisa el usuario, correo y las contraseñas (mínimo 12 caracteres).'},400);
 if(!['admin','seller'].includes(body.role))return json({error:'Rol inválido.'},400);
 const id=randomUUID(),password=await passwordHash(body.password);try{database.exec('BEGIN IMMEDIATE');database.prepare('INSERT INTO accounts(id,username,email,name,password_hash,role,created_at) VALUES(?,?,?,?,?,?,?)').run(id,body.username.toLowerCase(),body.email,body.username,password,body.role,Date.now());database.prepare('INSERT INTO users(id,email,name) VALUES(?,?,?)').run(id,body.email,body.username);initializeProfile(id,body.username,body.email);database.exec('COMMIT');return json({ok:true});}catch{database.exec('ROLLBACK');return json({error:'El usuario ya existe o no se pudo guardar.'},400)}
 }
 if(req.method==='PATCH'){const account=database.prepare('SELECT * FROM accounts WHERE id=?').get(body.id);if(!account)return json({error:'Cuenta no encontrada.'},404);if(body.id===user.id&&body.active===false)return json({error:'No puedes desactivar tu propia cuenta.'},400);if(typeof body.active==='boolean'){database.prepare('UPDATE accounts SET active=? WHERE id=?').run(body.active?1:0,body.id);database.prepare('DELETE FROM sessions WHERE account_id=?').run(body.id);return json({ok:true})}
 if(typeof body.password==='string'&&body.password.length>=12&&body.password.length<=128&&body.password===body.repeat){database.prepare('UPDATE accounts SET password_hash=? WHERE id=?').run(await passwordHash(body.password),body.id);database.prepare('DELETE FROM sessions WHERE account_id=?').run(body.id);return json({ok:true})}return json({error:'Contraseñas inválidas.'},400);}
 }
 return null;
}
