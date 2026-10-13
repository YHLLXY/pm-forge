
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const ROOT = 'C:/dev/pm-forge/site/dist';
const TYPES = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.woff2':'font/woff2' };
http.createServer((req,res)=>{
  let p = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(ROOT, p);
  try { if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); } catch {}
  if (!fs.existsSync(f)) f = path.join(ROOT, p + '.html');
  if (!fs.existsSync(f)) { res.statusCode = 404; res.end('404'); return; }
  res.setHeader('Content-Type', TYPES[path.extname(f)] || 'application/octet-stream');
  fs.createReadStream(f).pipe(res);
}).listen(4321, '127.0.0.1', ()=>console.log('SERVING http://127.0.0.1:4321'));
