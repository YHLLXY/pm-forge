import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9488;
const SHOTS = 'C:/temp/audit/shots';
const URL_ = process.env.TARGET_URL;
const LABELS = JSON.parse(process.env.LABELS_JSON||'[]');
const KEY = process.env.TARGET_KEY||'nav';
class CDP { constructor(u){this.u=u;this.id=0;this.p=new Map();this.ws=null;}
  async connect(){const s=this;this.ws=new WebSocket(this.u);await new Promise(function(r,j){s.ws.onopen=function(){r();};s.ws.onerror=function(){j(new Error('ws'));};});
    this.ws.onmessage=function(ev){const m=JSON.parse(ev.data);if(m.id&&s.p.has(m.id)){const q=s.p.get(m.id);s.p.delete(m.id);if(m.error)q.j(new Error(m.error.message));else q.r(m.result);} }; }
  send(method,params,timeout){const s=this;const id=++this.id;params=params||{};return new Promise(function(r,j){s.p.set(id,{r:r,j:j});s.ws.send(JSON.stringify({id:id,method:method,params:params}));setTimeout(function(){if(s.p.has(id)){s.p.delete(id);j(new Error('timeout '+method));}},timeout||20000);});}
  close(){try{this.ws.close();}catch(e){}} }
async function waitPage(port){for(let i=0;i<120;i++){try{const r=await fetch('http://127.0.0.1:'+port+'/json/list');const l=await r.json();const pg=l.find(function(t){return t.type==='page'&&t.webSocketDebuggerUrl;});if(pg)return pg;}catch(e){}await sleep(250);}throw new Error('no page');}
const profile='C:\\temp\\audit\\profile-nav';
fs.rmSync(profile,{recursive:true,force:true});
const child=spawn(EDGE,['--headless=new','--remote-debugging-port='+PORT,'--user-data-dir='+profile,'--no-first-run','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=1','--lang=zh-CN',URL_],{stdio:'ignore'});
const cdp=new CDP((await waitPage(PORT)).webSocketDebuggerUrl);
await cdp.connect();
await cdp.send('Page.enable');await cdp.send('Runtime.enable');
await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
const ev=async function(e){const r=await cdp.send('Runtime.evaluate',{expression:e,returnByValue:true});return r.result&&r.result.value;};
const snap=async function(n){const sh=await cdp.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(SHOTS+'/'+KEY+'-'+n+'.png',Buffer.from(sh.data,'base64'));};
const wheel=async function(times){for(let w=0;w<times;w++){await cdp.send('Input.dispatchMouseEvent',{type:'mouseWheel',x:720,y:450,deltaX:0,deltaY:120});await sleep(120);}};
const log=[];
const idx=['01','02','03','04','05','06','07','08'];
for(let i=0;i<LABELS.length;i++){
  const label=LABELS[i];
  await cdp.send('Page.navigate',{url:URL_});
  await sleep(3000);
  const expr='(function(){var t='+JSON.stringify(label)+';var els=Array.from(document.querySelectorAll("a,div,span,li"));var el=els.find(function(e){return e.textContent.trim()===t&&e.children.length<=1;});if(!el)return "notfound";el.click();return "ok";})()';
  const clicked=await ev(expr);
  await sleep(2200);
  const slug=idx[i]+'-'+i;
  await snap(slug+'-a');
  const st1=await ev('JSON.stringify({n:document.querySelectorAll("*").length,t:document.body.innerText.replace(/\\s+/g," ").slice(0,100)})');
  await wheel(3); await sleep(1600);
  await snap(slug+'-b');
  const st2=await ev('JSON.stringify({n:document.querySelectorAll("*").length,t:document.body.innerText.replace(/\\s+/g," ").slice(0,100)})');
  await wheel(3); await sleep(1600);
  await snap(slug+'-c');
  const st3=await ev('JSON.stringify({n:document.querySelectorAll("*").length,t:document.body.innerText.replace(/\\s+/g," ").slice(0,100)})');
  log.push({label:label,clicked:clicked,a:st1,b:st2,c:st3});
  console.log(label, clicked, st1, st2, st3);
}
fs.writeFileSync('C:/temp/audit/navwalk-'+KEY+'.json',JSON.stringify(log,null,1));
cdp.close();child.kill();await sleep(400);try{fs.rmSync(profile,{recursive:true,force:true});}catch(e){}