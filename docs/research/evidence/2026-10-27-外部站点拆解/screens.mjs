import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = Number(process.env.CDP_PORT || 9455);
const URL_ = process.env.TARGET_URL;
const KEY = process.env.TARGET_KEY;
const SHOTS = 'C:/temp/audit/shots';
class CDP { constructor(u){this.u=u;this.id=0;this.p=new Map();this.ws=null;}
  async connect(){const s=this;this.ws=new WebSocket(this.u);await new Promise(function(r,j){s.ws.onopen=function(){r();};s.ws.onerror=function(){j(new Error('ws'));};});
    this.ws.onmessage=function(ev){const m=JSON.parse(ev.data);if(m.id&&s.p.has(m.id)){const q=s.p.get(m.id);s.p.delete(m.id);if(m.error)q.j(new Error(m.error.message));else q.r(m.result);} }; }
  send(method,params,timeout){const s=this;const id=++this.id;params=params||{};return new Promise(function(r,j){s.p.set(id,{r:r,j:j});s.ws.send(JSON.stringify({id:id,method:method,params:params}));setTimeout(function(){if(s.p.has(id)){s.p.delete(id);j(new Error('timeout '+method));}},timeout||30000);});}
  close(){try{this.ws.close();}catch(e){}} }
async function waitPage(port){for(let i=0;i<120;i++){try{const r=await fetch('http://127.0.0.1:'+port+'/json/list');const l=await r.json();const pg=l.find(function(t){return t.type==='page'&&t.webSocketDebuggerUrl;});if(pg)return pg;}catch(e){}await sleep(250);}throw new Error('no page');}
const profile='C:\\temp\\audit\\profile-shot';
fs.rmSync(profile,{recursive:true,force:true});
const child=spawn(EDGE,['--headless=new','--remote-debugging-port='+PORT,'--user-data-dir='+profile,'--no-first-run','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=1','--lang=zh-CN',URL_],{stdio:'ignore'});
const cdp=new CDP((await waitPage(PORT)).webSocketDebuggerUrl);
await cdp.connect();
await cdp.send('Page.enable');await cdp.send('Runtime.enable');
await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
await sleep(3000);
const evalJS=async function(expr){const r=await cdp.send('Runtime.evaluate',{expression:expr,returnByValue:true});return r.result&&r.result.value;};
const snap=async function(name){const sh=await cdp.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(SHOTS+'/'+KEY+'-'+name+'.png',Buffer.from(sh.data,'base64'));};
const state=async function(){return await evalJS('JSON.stringify({y:Math.round(scrollY),h:document.documentElement.scrollHeight,n:document.querySelectorAll("*").length,txt:document.body.innerText.replace(/\\s+/g," ").slice(0,300)})');};
const log=[];
await snap('d01');
log.push({step:'load',state:await state()});
const navs=JSON.parse(process.env.NAV_JSON||'[]');
for (let i=0;i<navs.length;i++){
  const label=navs[i];
  const expr='(function(){var t='+JSON.stringify(label)+';var els=Array.from(document.querySelectorAll("a,button,div,span,li,p"));var el=els.find(function(e){return e.textContent.trim()===t && e.children.length<=1;});if(!el)return "notfound";el.click();return el.tagName+":"+(el.className||"");})()';
  const clicked=await evalJS(expr);
  await sleep(1600);
  const name='d'+String(i+2).padStart(2,'0');
  await snap(name);
  log.push({step:label,clicked:clicked,state:await state()});
}
fs.writeFileSync('C:/temp/audit/steps-'+KEY+'.json',JSON.stringify(log,null,1));
console.log(JSON.stringify(log,null,1));
cdp.close();child.kill();await sleep(500);try{fs.rmSync(profile,{recursive:true,force:true});}catch(e){}