// scripts/check-vercel-ips.mjs —— 阿里云 A 记录钉死的 Vercel IP 可达性巡检（ISSUES #10）
// 探测语义：对钉住 IP 直接发 TLS+HTTP（SNI=域名），模拟 A 记录解析路径——IP 被墙时这里先红。
//
// 双栈判级（2026-10-07 实测引入）：GFW 对部分 Vercel IP 做 TLS 指纹级差异化丢弃——
// node/OpenSSL 系握手可被单丢而 Schannel（Edge/系统 curl）路径仍通。单栈探测会把
// "指纹级干扰"误报成"IP 不可达"。故 node 探针失败时用系统 curl（Schannel 指纹）交叉复核：
//   双红 = IP 硬不可达（exit 1，执行 #10 后手迁移 Cloudflare）
//   单红 = TLS 指纹级干扰（⚠ 记录观察；若升级为双红再走后手），exit 0
// 解析核对：先本地 DNS 直查；本机 53 端口常被代理/TUN 接管（ECONNREFUSED），兜底走阿里云
// DoH（恰为钉记录的服务商）。两者都不通时中性跳过——解析核对是辅助，探针才是主判据。
// 只在国内网络的本机运行有意义；海外机器全绿不代表国内可达。单次运行可能抖动，宜多次跑。
// 用法：node scripts/check-vercel-ips.mjs（退出码：0=无硬不可达，1=有钉住 IP 硬不可达）
import { spawn } from "node:child_process";
import https from "node:https";
import dns from "node:dns/promises";

const DOMAINS = ["www.yuhailinlxy.com", "toolbox.yuhailinlxy.com"];
const PINNED = ["76.76.21.21", "64.29.17.65"];

function probe(ip, domain, timeoutMs = 8000) {
  return new Promise(resolve => {
    const req = https.request(
      { host: ip, servername: domain, path: "/", method: "HEAD", headers: { Host: domain }, timeout: timeoutMs },
      res => {
        res.resume();
        // 网络层问题只看"有没有 HTTP 响应"，状态码本身（含 4xx/5xx）都算可达
        resolve({ ok: true, status: res.statusCode });
      }
    );
    req.on("timeout", () => { req.destroy(); resolve({ ok: false, status: "timeout" }); });
    req.on("error", err => resolve({ ok: false, status: err.code ?? String(err) }));
    req.end();
  });
}

// 系统级 curl（Win10+ 自带，Schannel 指纹）交叉复核；不可用（无 curl/超时/非 2xx-5xx 响应）返回 null
function crossCheck(ip, domain, timeoutMs = 12000) {
  return new Promise(resolve => {
    const args = ["-s", "-o", "NUL", "-w", "%{http_code}", "--max-time", "8", "--resolve", `${domain}:443:${ip}`, `https://${domain}/`];
    const child = spawn("curl", args, { windowsHide: true });
    const timer = setTimeout(() => { child.kill(); resolve(null); }, timeoutMs);
    let out = "";
    child.stdout.on("data", c => (out += c));
    child.on("error", () => { clearTimeout(timer); resolve(null); });
    child.on("close", code => {
      clearTimeout(timer);
      const status = parseInt(out.trim(), 10);
      resolve(Number.isInteger(status) && status >= 200 && status < 600 ? status : null);
    });
  });
}

// 返回 { addrs, via }；addrs=null 表示两条路都不通（调用方中性跳过核对）
async function resolveA(domain) {
  try {
    return { addrs: await dns.resolve4(domain), via: "本地直查" };
  } catch {
    // 本地 53 被接管/拒绝时落到 DoH
  }
  const addrs = await new Promise(resolve => {
    const req = https.request(
      { host: "dns.alidns.com", servername: "dns.alidns.com", path: `/resolve?name=${encodeURIComponent(domain)}&type=A`, timeout: 8000 },
      res => {
        let body = "";
        res.on("data", c => (body += c));
        res.on("end", () => {
          try {
            const data = JSON.parse(body);
            resolve((data.Answer ?? []).filter(a => a.type === 1).map(a => a.data));
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on("timeout", () => { req.destroy(); resolve(null); });
    req.on("error", () => resolve(null));
    req.end();
  });
  return addrs ? { addrs, via: "阿里云 DoH 兜底" } : { addrs: null, via: "" };
}

let hardBad = 0;
let warns = 0;
for (const domain of DOMAINS) {
  const { addrs, via } = await resolveA(domain);
  if (addrs) {
    console.log(`\n${domain}  当前解析（${via}）：${addrs.join(", ")}`);
    const missing = PINNED.filter(ip => !addrs.includes(ip));
    if (missing.length) console.log(`  ⚠ 解析结果已不含钉住 IP：${missing.join(", ")}（阿里云解析被改动？核对 #8）`);
  } else {
    console.log(`\n${domain}  DNS 核对不可用（本地直查与 DoH 均失败）——跳过解析核对，探针结论不受影响`);
  }
  for (const ip of PINNED) {
    const r = await probe(ip, domain);
    if (r.ok) {
      console.log(`  ${ip}  ✓ ${r.status}`);
      continue;
    }
    const cross = await crossCheck(ip, domain);
    if (cross !== null) {
      warns++;
      console.log(`  ${ip}  ⚠ node 探针 ${r.status}，但系统 curl（Schannel 指纹）✓ ${cross}`);
      console.log(`      → TLS 指纹级干扰（OpenSSL 系握手被丢弃，浏览器主路径仍通）——记录观察，若升级为双红执行 #10 后手`);
    } else {
      hardBad++;
      console.log(`  ${ip}  ✗ node 探针 ${r.status}，系统 curl 交叉复核也不通`);
    }
  }
}
if (hardBad) {
  console.error(`\n✗ ${hardBad} 个钉住 IP 硬不可达——处置看 ISSUES #10：后手 = Cloudflare 代理（已实测国内可达）`);
  process.exit(1);
}
if (warns) {
  console.log(`\n⚠ ${warns} 个 TLS 指纹级干扰迹象（无硬不可达）——宜多次复跑观察趋势，干扰持续或升级再迁移`);
  process.exit(0);
}
console.log("\n✓ 钉住 IP 全部可达");
