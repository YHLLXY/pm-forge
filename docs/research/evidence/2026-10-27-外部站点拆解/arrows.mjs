import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9477;
const SHOTS = 'C:/temp/audit/shots';
class CDP { constructor(u){this.u=u;this.id=0;this.p=new Map();this.ws=null;}
  async connect(){const s=this;this.ws=new WebSocket(this.u);await new Promise(function(r,j){s.ws.onopen=function(){r();};s.ws.onerror=function(){j(new Error('ws'));};});
    this.ws.onmessage=function(ev){const m=JSON.parse(ev.data);if(m.id&&s.p.has(m.id)){const q=s.p.get(m.id);s.p.delete(m.id);if(m.error)q.j(new Error(m.error.message));else q.r(m.result);} }; }
  send(method,params,timeout){const s=this;const id=++this.id;params=params||{};return new Promise(function(r,j){s.p.set(id,{r:r,j:j});s.ws.send(JSON.stringify({id:id,method:method,params:params}));setTimeout(function(){if(s.p.has(id)){s.p.delete(id);j(new Error('timeout '+method));}},timeout||20000);});}
  close(){try{this.ws.close();}catch(e){}} }
async function waitPage(port){for(let i=0;i<120;i++){try{const r=await fetch('http://127.0.0.1:'+port+'/json/list');const l=await r.json();const pg=l.find(function(t){return t.type==='page'&&t.webSocketDebuggerUrl;});if(pg)return pg;}catch(e){}await sleep(250);}throw new Error('no page');}
const profile='C:\\temp\\audit\\profile-arrow';
fs.rmSync(profile,{recursive:true,force:true});
const child=spawn(EDGE,['--headless=new','--remote-debugging-port='+PORT,'--user-data-dir='+profile,'--no-first-run','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=1','--lang=zh-CN','https://webapp.codeghub.com/release/app/admin/home/index.html'],{stdio:'ignore'});
const cdp=new CDP((await waitPage(PORT)).webSocketDebuggerUrl);
await cdp.connect();
await cdp.send('Page.enable');await cdp.send('Runtime.enable');
await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
await sleep(3500);
const ev=async function(e){const r=await cdp.send('Runtime.evaluate',{expression:e,returnByValue:true});return r.result&&r.result.value;};
const cands = await ev('JSON.stringify(Array.from(document.querySelectorAll("div,span,button,a,svg,img")).filter(function(e){var t=(e.textContent||"").trim();var c=(e.className&&e.className.toString?e.className.toString():"");return (t==="›"||t===">"||t==="»")||/next|arrow|chevron/i.test(c);}).slice(0,20).map(function(e){var r=e.getBoundingClientRect();return {tag:e.tagName,cls:(e.className&&e.className.toString?e.className.toString():"").slice(0,80),txt:(e.textContent||"").trim().slice(0,20),x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)};}))');
console.log('CANDS', cands);
const snap=async function(n){const sh=await cdp.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(SHOTS+'/cgN-'+String(n).padStart(2,'0')+'.png',Buffer.from(sh.data,'base64'));};
const clickNext = '(function(){var els=Array.from(document.querySelectorAll("div,span,button,a"));var c=els.filter(function(e){var t=(e.textContent||"").trim();return t==="›"||t===">";});if(!c.length)return "none";var e=c[c.length-1];e.click();return "clicked:"+(e.className||"");})()';
const log=[];
for(let i=1;i<=7;i++){
  const r=await ev(clickNext);
  await sleep(1800);
  await snap(i);
  const st=await ev('JSON.stringify({n:document.querySelectorAll("*").length,t:document.body.innerText.replace(/\\s+/g," ").slice(0,120)})');
  log.push({i:i,click:r,state:st});
}
console.log(JSON.stringify(log,null,1));
cdp.close();child.kill();await sleep(400);try{fs.rmSync(profile,{recursive:true,force:true});}catch(e){}