# STATUS.md —— 跨会话交接

> AI 连续工作协议核心文件（AGENTS.md 仓库特化规则 4）：每次会话开工先读本文件，收工必更新并 commit+push。

## 当前任务卡

- M2 计划（docs/plans/2026-09-27-pm-forge-m2-实施计划.md）Task 1-12 **全部完成**（2026-09-27）
- **验收①-④全部达成**：三工具可用+e2e ✓ / 真实报告 ✓ / token 守卫 ✓ / **自定义域名上线 ✓（https://toolbox.yuhailinlxy.com）**
- 下一张卡：**M3 计划编写**（Astro 作品集站点，选型见余粮工作区资料库 08 号调研）

## 上线记录（2026-09-27 · 部署日，接上条同会话）

**做了什么**：
- Vercel 部署完成：Root Directory = toolkit、环境变量 LLM_API_KEY（真实模式 /api/health 返回 live+deepseek-chat）、域名 `toolbox.yuhailinlxy.com`
- **GFW 排障（关键）**：域名 CNAME 指向 vercel-dns-017.com 随机解析到两台 IP——`216.198.79.65` 被 IP 级封锁（443 端口 TLS 握手被重置，80 通；换无关 SNI 同样失败，确认非关键字封锁）；`64.29.17.65` 与 Vercel 官方 IP `76.76.21.21` 均稳定
- **修复**：阿里云解析弃用 CNAME，改两条 A 记录钉死可用 IP（76.76.21.21 + 64.29.17.65）→ 实测 20/20 全通 + 分 IP 6/6
- 验证：三工具页 200、首页 200、API live 模式、证书正常

**关键决策**：
- 用 A 记录钉 IP 而非 CNAME：牺牲 Vercel 官方推荐接法（面板可能报 Invalid Configuration，功能无影响），换国内 100% 可达
- 后手：若这批 IP 也被封，切 Cloudflare 代理（已实测国内可达）
- 域名 typo 插曲：排查早期一直查 `yuhanlinlxy.com`（少个 i）导致误判"注册局未提交"，真域名 `yuhailinlxy.com` 一切正常

**遗留**：
1. **验收②剩余半步（精选报告发布进 site/content/）**：三份真实报告在 `toolkit/artifacts/`（gitignored），随 M3 站点建设精选发布
2. 用户侧验收：手机流量打开 https://toolbox.yuhailinlxy.com 确认国内直连（待用户确认）
3. P2 清单见 docs/ISSUES.md

## 下一步

用户手机流量验收 → **M3 计划（Astro 作品集站，2027-02 第一版上线）**。

## 上次会话（2026-09-27 · M2 实施日）

**做了什么**：
- M1 收尾遗留提交（ingest.py 单线程修复 + site/content 报告副本）→ b9a327c
- M2 计划编写（12 张任务卡，提示词与代码全文落盘）→ e00a809
- **仓库迁移：E:\homework\开发\pm-forge（exFAT）→ C:\dev\pm-forge（NTFS）**
  - 根因：exFAT 不支持 reparse point，`fs.readlink` 对普通文件返回 EISDIR(-4068)（NTFS 对照组为 EINVAL），Next 构建必然失败；E 盘仅剩 8.3GB 也是隐患
  - 数据完整性验证后才清理旧位置（git 完好 + UserBehavior.csv 3,672,347,465 字节一致 + 13 pytest 绿 + build 成功）；E 盘旧位置留指针 README
- **toolkit 三工具全链路实现（Next 15.5.26 + React 19 + TS + Tailwind 4）**：
  - lib：config / token-estimate（0.7 token/字符保守估算）/ llm（OpenAI 兼容 + mock 演示模式）/ stream-client / history（localStorage 最近 10 次）/ insights（JSON 契约解析）
  - prompts：三个版本化提示词（PROMPT_VERSION 1.0.0），骨架内嵌自有模板（03-PRD-精简版 / 04-竞品分析），证据链标注铁律（【依据输入】/【行业常识】/【推断】+ 禁编数字）
  - API：POST /api/tools/[tool]（zod 校验 → token 预算守卫（超限 400 TOKEN_BUDGET 需 force）→ 流式响应 + X-PMForge-Mode 头）；GET /api/health
  - UI：工作台（流式渲染 / token 确认卡 / 复制与 .md/.json 下载 / 历史面板 / 5×5 优先级矩阵）+ 首页 + /tools/[tool] SSG 页
  - e2e：Playwright 3 条（MOCK_LLM=1 确定性），浏览器下载走 npmmirror
- 测试：**52 vitest 全绿 + 3 e2e 全绿**；`next build` 通过（webpack；turbopack build 在 Windows 有 styled-jsx readlink 问题，dev 仍用 turbopack）
- 字体改 `geist` npm 本地包：`next/font/google` 在国内拉不到 Google Fonts 导致 build 失败
- 真实 LLM 冒烟脚本 `npm run smoke:real`（无 key 时退出并给指引——本机当前无 key，验收②挂起等用户）

**关键决策**：
- pm-skills 对标（spec §8 遗留项）：v1 三工具对标 `create-prd` / `competitor-analysis` / `sentiment-analysis` 三技能
- 提示词骨架内嵌 TS 常量（不运行时读盘）；smoke 脚本同构复制文本并注明"改动需两侧同步"
- v1 无数据库（localStorage 缓存层），Supabase 列 P2；反馈 CSV 列映射与 GBK 自动转码列 P2

**遗留**（已并入上方「上线记录」章节，此处保留 M2 实施日的原始记录供追溯）：
- ~~验收②报告产出~~ 已完成（见上线记录遗留 1）；~~验收④域名~~ 已完成（同上）

## 可作战状态

❌ 未达成（作品集站点未开始；预计 2027-02 第一版上线后转 ✅）
