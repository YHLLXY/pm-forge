import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9499;
const SHOTS = 'C:/temp/audit/shots';
const URL_ = 'https://webapp.codeghub.com/release/app/admin/home/index.html';
const LABELS = JSON.parse(process.env.LABELS_JSON||'[]');
class CDP { constructor(u){this.u=u;this.id=0;this.p=new Map();this.ws=null;}
  async connect(){const s=this;this.ws=new WebSocket(this.u);await new Promise(function(r,j){s.ws.onopen=function(){r();};s.ws.onerror=function(){j(new Error('ws'));};});
    this.ws.onmessage=function(ev){const m=JSON.parse(ev.data);if(m.id&&s.p.has(m.id)){const q=s.p.get(m.id);s.p.delete(m.id);if(m.error)q.j(new Error(m.error.message));else q.r(m.result);} }; }
  send(method,params,timeout){const s=this;const id=++this.id;params=params||{};return new Promise(function(r,j){s.p.set(id,{r:r,j:j});s.ws.send(JSON.stringify({id:id,method:method,params:params}));setTimeout(function(){if(s.p.has(id)){s.p.delete(id);j(new Error('timeout '+method));}},timeout||15000);});}
  close(){try{this.ws.close();}catch(e){}} }
async function waitPage(port){for(let i=0;i<120;i++){try{const r=await fetch('http://127.0.0.1:'+port+'/json/list');const l=await r.json();const pg=l.find(function(t){return t.type==='page'&&t.webSocketDebuggerUrl;});if(pg)return pg;}catch(e){}await sleep(250);}throw new Error('no page');}
const profile='C:\\temp\\audit\\profile-final';
fs.rmSync(profile,{recursive:true,force:true});
const child=spawn(EDGE,['--headless=new','--remote-debugging-port='+PORT,'--user-data-dir='+profile,'--no-first-run','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=1','--lang=zh-CN',URL_],{stdio:'ignore'});
const cdp=new CDP((await waitPage(PORT)).webSocketDebuggerUrl);
await cdp.connect();
const ev=async function(e){try{const r=await cdp.send('Runtime.evaluate',{expression:e,returnByValue:true});return r.result&&r.result.value;}catch(err){return 'ERR '+err.message;}};
const snap=async function(n){try{const sh=await cdp.send('Page.captureScreenshot',{format:'png'},25000);fs.writeFileSync(SHOTS+'/cgf-'+n+'.png',Buffer.from(sh.data,'base64'));return 'ok';}catch(e){return 'ERR '+e.message;}};
await cdp.send('Page.enable');await cdp.send('Runtime.enable');
await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
const WHEEL='(function(){for(var i=0;i<3;i++){window.dispatchEvent(new WheelEvent("wheel",{deltaY:120,deltaMode:0,bubbles:true,cancelable:true}));}return "sent";})()';
for(let i=0;i<LABELS.length;i++){
  const label=LABELS[i];
  await cdp.send('Page.navigate',{url:URL_},20000);
  await sleep(3200);
  const clicked=await ev('(function(){var t='+JSON.stringify(label)+';var els=Array.from(document.querySelectorAll("a,div,span,li"));var el=els.find(function(e){return e.textContent.trim()===t&&e.children.length<=1;});if(!el)return "notfound";el.click();return "ok";})()');
  await sleep(2500);
  console.log(label, 'click='+clicked, 'snapA='+await snap(i+'-a'));
  console.log('  wheel1='+await ev(WHEEL));await sleep(1800);
  console.log('  snapB='+await snap(i+'-b')+' '+await ev('document.querySelectorAll("*").length'));
  console.log('  wheel2='+await ev(WHEEL));await sleep(1800);
  console.log('  snapC='+await snap(i+'-c')+' '+await ev('document.body.innerText.replace(/\\s+/g," ").slice(0,80)'));
}
cdp.close();child.kill();await sleep(400);try{fs.rmSync(profile,{recursive:true,force:true});}catch(e){}