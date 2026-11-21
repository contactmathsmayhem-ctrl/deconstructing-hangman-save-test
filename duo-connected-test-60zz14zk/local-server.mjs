import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {service,MemoryRepository} from './lib/service.mjs';
const api=service(new MemoryRepository(),{allowTest:true});
const server=http.createServer(async(req,res)=>{try{
 const origin='http://127.0.0.1:8787';const url=new URL(req.url,origin);
 if(url.pathname==='/.netlify/functions/hangman'){
  let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>16384){res.writeHead(413);res.end();return;}}
  const out=await api(new Request(url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body}:{})}));res.writeHead(out.status,Object.fromEntries(out.headers));res.end(await out.text());return;
 }
 const allowed={'/':'connection-test.html','/connection-test.html':'connection-test.html','/index.html':'index.html'};
 if(!allowed[url.pathname]){res.writeHead(404);res.end('Not found');return;}
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(await readFile(new URL('public/'+allowed[url.pathname],import.meta.url)));
}catch{res.writeHead(500);res.end('Local test error');}});
server.listen(8787,'127.0.0.1',()=>console.log('Local connection test: http://127.0.0.1:8787 — temporary in-memory rooms; no Netlify services used.'));
