// FORM server: static files + one JSON blob per tailnet user, keyed on the identity headers tailscale serve adds.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const DATA=path.join(ROOT,'data');
const PORT=+process.env.PORT||4500;
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.webmanifest':'application/manifest+json','.json':'application/json'};
fs.mkdirSync(DATA,{recursive:true});

function user(req){
  const login=String(req.headers['tailscale-user-login']||'local');
  const name=String(req.headers['tailscale-user-name']||login.split('@')[0]);
  return {login,name,file:path.join(DATA,login.replace(/[^a-z0-9@._-]/gi,'_').toLowerCase()+'.json')};
}
const json=(res,code,obj)=>{res.writeHead(code,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(obj))};

http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/api/state'){
    const u=user(req);
    if(req.method==='GET'){let state=null;try{state=JSON.parse(fs.readFileSync(u.file,'utf8'))}catch{}return json(res,200,{user:{login:u.login,name:u.name},state})}
    if(req.method==='PUT'){
      let body='';
      req.on('data',c=>{body+=c;if(body.length>2e6)req.destroy()});
      req.on('end',()=>{try{const s=JSON.parse(body);if(!Array.isArray(s.sessions))throw new Error('bad state');fs.writeFileSync(u.file+'.tmp',JSON.stringify(s));fs.renameSync(u.file+'.tmp',u.file);json(res,200,{ok:true})}catch{json(res,400,{error:'invalid state'})}});
      return;
    }
    return json(res,405,{error:'method'});
  }
  let p=decodeURIComponent(url.pathname);if(p==='/')p='/index.html';
  const f=path.normalize(path.join(ROOT,p));
  const blocked=!f.startsWith(ROOT+path.sep)||f.startsWith(DATA)||path.basename(f)==='server.mjs'||p.split('/').some(seg=>seg.startsWith('.'))||!fs.existsSync(f)||fs.statSync(f).isDirectory();
  if(blocked){res.writeHead(404);return res.end('not found')}
  res.writeHead(200,{'content-type':TYPES[path.extname(f)]||'application/octet-stream','cache-control':'no-cache'});
  fs.createReadStream(f).pipe(res);
}).listen(PORT,'127.0.0.1',()=>console.log('FORM listening on http://127.0.0.1:'+PORT));
