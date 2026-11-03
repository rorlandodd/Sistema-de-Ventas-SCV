import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync,existsSync,writeFileSync,renameSync,unlinkSync,copyFileSync,cpSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
export const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const dataDir=resolve(process.env.DATA_DIR||resolve(root,'data'));
mkdirSync(dataDir,{recursive:true,mode:0o700});
const databasePath=resolve(dataDir,'ventas.sqlite');if(!existsSync(databasePath)){const selected=process.env.INITIAL_DATABASE==='vacia'?'ventas-vacia.sqlite':'ventas-actual.sqlite';const initial=resolve(root,'database',selected);if(existsSync(initial)){copyFileSync(initial,databasePath);if(selected==='ventas-actual.sqlite'&&existsSync(resolve(root,'database/uploads')))cpSync(resolve(root,'database/uploads'),resolve(dataDir,'uploads'),{recursive:true})}}
export const database=new DatabaseSync(databasePath);
database.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
const schema=readFileSync(resolve(root,'database/schema.sql'),'utf8').replace(/CREATE TABLE (?!IF NOT EXISTS )/g,'CREATE TABLE IF NOT EXISTS ').replace(/CREATE UNIQUE INDEX (?!IF NOT EXISTS )/g,'CREATE UNIQUE INDEX IF NOT EXISTS ');
database.exec(schema);
function query(sql,args=[]){return {bind(...values){return query(sql,values)},async run(){const result=database.prepare(sql).run(...args);return {meta:{changes:Number(result.changes)}}},async first(){return database.prepare(sql).get(...args)||null},async all(){return {results:database.prepare(sql).all(...args)}}};}
const objectRoot=resolve(dataDir,'uploads');mkdirSync(objectRoot,{recursive:true,mode:0o700});
function location(key){if(!/^(?:[a-f0-9-]{36}|receipts\/[a-f0-9-]{36}|settings\/branding\.json)$/.test(key))throw Error('Archivo inválido');return resolve(objectRoot,key);}
export const env={DB:{prepare:sql=>query(sql)},BUCKET:{async head(key){try{return existsSync(location(key))?{}:null}catch{return null}},async get(key){let path;try{path=location(key)}catch{return null}if(!existsSync(path))return null;const bytes=readFileSync(path);let meta={contentType:'application/octet-stream'};if(existsSync(path+'.meta.json'))meta=JSON.parse(readFileSync(path+'.meta.json','utf8'));return {body:bytes,httpMetadata:meta,async text(){return bytes.toString('utf8')}}},async put(key,value,options={}){const path=location(key);mkdirSync(dirname(path),{recursive:true,mode:0o700});const bytes=typeof value==='string'?value:Buffer.from(value);const tmp=path+'.'+randomUUID()+'.tmp';writeFileSync(tmp,bytes,{mode:0o600});writeFileSync(path+'.meta.json',JSON.stringify(options.httpMetadata||{}),{mode:0o600});renameSync(tmp,path);}}};
export function initializeProfile(id,name,email,adoptExisting=false){
 const row=database.prepare('SELECT * FROM system_settings WHERE id=?').get('main');const settings=row?JSON.parse(row.data):{companyName:'Control de ventas',logo:'/brands/electrolux.png',brandLogos:{},profiles:[],signatures:{}};
 settings.profiles||=[];settings.signatures||={};settings.preferencesByUser||={};settings.menusByUser||={};
 const legacyUser=adoptExisting?database.prepare('SELECT id FROM users WHERE id<>? ORDER BY id LIMIT 1').get(id):null;
 const inherited=adoptExisting?(settings.profiles.find(p=>p.email?.toLowerCase()===email.toLowerCase())||settings.profiles.find(p=>p.id===settings.signatures[legacyUser?.id])||settings.profiles[0]):null;
 settings.profiles.push({id,name:inherited?.name||name,email,phone:inherited?.phone||'',role:inherited?.role||''});settings.signatures[id]=id;
 if(legacyUser){if(settings.preferencesByUser[legacyUser.id])settings.preferencesByUser[id]={...settings.preferencesByUser[legacyUser.id]};if(settings.menusByUser[legacyUser.id])settings.menusByUser[id]={...settings.menusByUser[legacyUser.id]};database.prepare('UPDATE saved_views SET user_id=? WHERE user_id=?').run(id,legacyUser.id)}
 database.prepare('INSERT INTO system_settings(id,data,revision) VALUES(?,?,1) ON CONFLICT(id) DO UPDATE SET data=excluded.data,revision=system_settings.revision+1').run('main',JSON.stringify(settings));
}
