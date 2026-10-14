# ISSUES.md

> 问题登记（vault AGENTS.md 12.5）：现象/原因/影响/严重度/状态。已修复的移到「已修复」区并附 commit hash。

## 待处理

| # | 现象 | 原因 | 影响 | 严重度 | 状态 |
|---|---|---|---|---|---|
| 13 | toolkit 依赖链漏洞台账（2026-10-07 Next 16 专项后实测：**残余 7 条 5 高 2 中**，官方源 npm audit；GitHub Dependabot 面板报 10 条 6 高 4 中，口径差异以面板为准）。沿革：2026-10-02 首记 next 15.5.26 内嵌 postcss 链（2 条 1 高 1 中→4 advisory）→2026-10-06 面板 9 条 5 高 4 中→**Next 16.3.8 升级消除原 postcss 链**；2026-10-07 新披露 4 组：sharp（librsvg CVE）与 source-map-js（事件循环 DoS）已由非破坏 `npm audit fix` 修复；残余 = braces 链（GHSA-vfj7-8cjw-p6xm，advisory 打在 `*` 上游无修复版本，链路 eslint-config-next→@next/eslint-plugin-next→fast-glob→micromatch→braces）+ postcss-selector-parser<7.1.6（GHSA-rj75-hqrm-r3gf，经 @tailwindcss/typography，"修复"=荒谬降级 typography@0.5.4） | 残余 7 条全部是 dev/build 期传递依赖（eslint 与 tailwind 构建链），运行时零暴露；上游暂无修复版本，`npm audit fix --force` 的"修复"是降级 eslint-config-next@14 / typography@0.5.4，不可取 | 实际可利用性低——braces 仅在 lint/glob 时使用，selector-parser 仅构建期 CSS 解析；site/ 实测 0 漏洞 | 低 | 观察：上游发布修复版本后跟进升级；**严禁 npm audit fix --force**；`npm audit` 须加 `--registry=https://registry.npmjs.org`（npmmirror 无 audit 接口） |
| 10 | 若 Vercel 钉住的两个 IP（76.76.21.21 / 64.29.17.65）未来也被 GFW 封锁 | 国内直连 Vercel 天然受墙影响 | 网站国内不可达（toolkit 与 site 同方案） | 中 | 巡检脚本就绪（node scripts/check-vercel-ips.mjs，零依赖双栈判级：node/OpenSSL 探针红时用系统 curl/Schannel 交叉复核，双红=硬不可达走后手、单红=TLS 指纹级干扰记录观察），每次发布/求职季自跑；2026-10-07 首跑：64.29.17.65 出现指纹级干扰（OpenSSL 系握手被丢、Schannel 仍通，浏览器主路径未断），观察中；告警处置=后手 Cloudflare 代理（已实测国内可达） |
| 2 | vault 仓库 push 时 git 维护步骤失败：`could not write multi-pack-index: Permission denied` / `could not write commit-graph` / `renaming pack to ... failed: File exists`（**commit 与 push 本身成功**） | 疑似 Obsidian 文件锁或 .git 权限（Obsidian 常驻会周期性重写 `.obsidian/` 并可能占用单包维护窗口） | 仅维护步骤（geometric-repack / commit-graph）报错，仓库 `ahead/behind = 0/0`、远端已收到提交；后续 vault 提交会持续打印一段噪声 | 低 | 观察。**核实方法**（别把噪声当失败）：`git status -sb` 看有无 ahead、`git log --oneline -1 origin/main` 与本地比对、再 `git push` 应回 `Everything up-to-date`。2026-10-12 实测三项全绿（提交 `05c526ad8` / 9 文件） |
| 22 | 正文之外还有两处 ch 单位：max-w-headline（46ch）与 max-w-deck（52ch） | 与正文原来的 68ch 同源：ch 是西文数字 "0" 的前进宽度，随字体栈漂移（实测 10 种字体栈之间摆动 8.8%）；且 46 / 52 都不是整汉字数 | 标题与导语的换行位置随用户字体设置漂移（正文已在 v0.18 修掉，标题/导语未动） | 低 | **有意不改**：clreq 7.1.1.4 的「行长宜为字号整数倍」约束的是正文，标题/导语不适用；改法照抄正文（换成 em 并**实测计算宽度**，不能只看类名）即可，留作后续 |
| 23 | dissections/charter 的目录条目数不会自动等于正文 h2 数 | 该页 h2 是手写的；目录与 id 虽共用同一份 sections 常量，但「正文里加了小节却忘了加进常量」没有任何自动信号 —— check-toc.mjs 只校验「目录里的锚点在本页存在」，是单向的 | 新增小节可能不进目录（页面看着正常，只是漏了一条） | 低 | 常量上方已写注释提醒；若要机械化，需给手写页补一条「正文 h2 数 vs 目录条目数」断言 |
| 24 | 本机 npm run format:check 全红，报一堆文件格式不符 | .prettierrc 是 endOfLine: "lf"，而 core.autocrlf=true 把检出文件全变成 CRLF（实测未改过的 typography.css / index.astro / Footer.astro 同样报红） | 无法用 prettier 做提交前检查（**它不是构建链门禁，构建与发布不受影响**） | 低 | **不处理**：不要为了让 prettier 变绿去改行尾（会造出整文件级 diff，且下次检出又被 autocrlf 打回）。要修就统一改 .prettierrc 或关 autocrlf，另开一轮 |
| 25 | 本机两条 PowerShell **假信号**：①npm run 报 UnauthorizedAccess（禁止运行脚本）；②cmd 2>&1 \| Select-Object 让 pwsh 进程报 [exit 1]，而命令其实成功 | ①执行策略禁止运行 npm.ps1；②PS 把原生命令的 stderr 包成 NativeCommandError，经管道收尾后影响进程退出码 | 会把成功误判为失败、把绿门禁误判成红，然后去「修」根本没坏的东西 | 低 | ①一律写 npm.cmd；②不接管道，或 cmd *> 日志文件 再 Get-Content，并显式读 $LASTEXITCODE。已写入 v0.18 实施计划的「本机执行环境的三个坑」 |

## P2 演进项（v1 明确不做，非缺陷）

> 原「作品集外链域名绑定」一条已于 2026-10-14 完成，移入「已修复」#27。

| 项 | 说明 |
|---|---|
| 反馈 CSV 列映射 | 上传已支持 UTF-8/GBK 自动解码（2026-10-07，见已修复 #17）；列映射仍不做——从表格粘贴多列时需用户先删掉与内容无关的列（表单 hint 已引导） |
| Supabase 持久化 | 运行历史目前仅 localStorage（每工具 10 条）；云端同步待用户量需求 |
| 反馈工具上传/导出图表 | 优先级矩阵为 CSS 网格，ECharts 可视化待 v2 |
| 演示模式样例可配置 | fixtures 目前写死在代码中 |
| site 标签列表页/分页 | 标签现为纯文本徽标；案例超 10 篇后再做分页 |
| AgriAgent 获奖【待补充】 | vault 有"小挑二等"证书，归属届次待用户核实后回填案例 |
| vault-tools（M4） | 独立里程碑，未开工 |

## 已修复

| # | 问题 | 解决方案 | commit |
|---|---|---|---|
| 27 | 案例页「产品在线运行」链接指向 `*.vercel.app`，国内点不开——2026-09-30 登记为 P2 留档，**13 天未收口**；且构建链里**本该拦住它的门禁根本没写**（`门禁体检.md` 却写成已加） | ①用户绑 `workbench.yuhailinlxy.com`：Vercel 加域名 + 阿里云两条 A 记录 `76.76.21.21`/`64.29.17.65`（**不用 CNAME**，同 #8）；实测 DNS 正确、HTTPS 10/10=200、深路由与 `/api/check-reminders` 401 均符合预期。②案例页 `links.live` + 正文两处换链，**删掉已不成立的「需代理」标注**。③补门禁：`check-links.mjs` 另开一趟**不套 `SKIP`** 的扫描禁止内容出现 `*.vercel.app` 链接（原 `SKIP` 正则把一切外链显式跳过，这正是它 13 天没被抓到的原因），并以真实旧 `dist` 证明**能红**（2 条命中、退出码 1） | 本 commit |
| 26 | 迁移承诺的"旧位置指针文件"从未创建：迁移 commit `47dc1b9` 的 `README.md` 写明「原位置 `E:\homework\开发\pm-forge` … 已整体迁移；**E 盘仅留本说明的指针文件**」，但该 commit 只改了仓库自己的 README，旧位置**没有留下任何文件**；`E:\homework` 深度 3 全盘扫描也找不到任何提到 pm-forge 或 `C:\dev` 的说明。**后果已被真实观测到**：外部读者照 `docs/research` 里的 `site/src/...` 相对路径去 E 盘找仓库 → 扑空 → 误判成"代码丢了、优先级最高是恢复" | 在旧位置建 `E:\homework\开发\pm-forge\README.md`：首行即声明"这里没有代码"，给出真实路径 `C:\dev\pm-forge`、迁移原因（exFAT `readlink`）、迁移 commit，并解释 `site/src/...` 是**仓库相对**路径（实测工作区 15 个 md / 151 处）。另在工作区根建 README 做同类指路 | 本 commit |
| 19 | `<ClientRouter />` 下「打包后的模块脚本只执行一次」，导致二次站内跳转进 `/search/` 与 `/data-stories/userbehavior/` 后初始化逻辑被跳过：搜索框能打字但零结果、故事页图表不渲染且查询按钮点不动，且控制台零报错（静默失效，线上实测二访 fragment 请求 0） | 两页初始化包成 `initSearch()`/`initStory()` 并挂 `astro:page-load`（故事页 `before-swap` 销毁 IO/scrollama、`engineReady` 提到模块级复用 WASM），顺补 reduced-motion 闸门；新增 `scripts/check-spa-revisit.mjs` 验收（修复前打线上复现红、修复后绿）。**上游 #17550 closed 未合并，升级不会自动修** | 本 commit |
| 20 | v0.14 的「表面分层」从未真正生效：`theme.css` 只在 `:root` 定义了 `--shadow-1/2`，没有注册进 Tailwind 的 `--shadow-*` 命名空间，于是 `Card.astro` 的 `shadow-1`/`hover:shadow-2` 与 `toolbox/index.astro` 的 `shadow-1` 全是空类（构建产物 `.shadow-1`/`.shadow-2` 命中 0） | 在 `@theme inline` 里注册 `--shadow-card: var(--shadow-1)` / `--shadow-lift: var(--shadow-2)`（不同名字映射，避免自我引用）并全站换用；C 轨的卡片 hover/focus 反馈因此才真的有阴影可动 | 本 commit |
| 21 | 三篇工具报告（competitor-analysis / feedback-insights / prd-draft）详情页存在**两个 `<h1>`**：markdown 正文第一行写了 `# 标题`，与版头 h1 重复（既有缺陷，Lighthouse 的 a11y 没有 h1 唯一性审计项所以 100 分没挡住） | 删除三行冗余正文标题（页标题由 EntryHeader 提供），六篇报告口径一致；新增 `scripts/check-headings.mjs` 门禁（每页恰好一个 h1、标题不跳级）把这套规则机械化 | 本 commit |
| 17 | 反馈上传 GBK 文件需手动另存 UTF-8（`file.text()` 恒按 UTF-8 宽松解码，乱码只能靠 U+FFFD 事后报错） | 新增 `decodeUpload` 纯函数：UTF-8 严格解码（fatal:true，杜绝静默 U+FFFD）+ BOM 剥离优先，GBK（WHATWG 标签 gbk=gb18030 超集，覆盖 Excel 中文导出）兜底，双失败才抛 DecodeError；feedback-form 接线（提示文案同步更新），解码单测 4 条 + 表单上传集成 2 条 | 本 commit |
| 18 | 工具箱三工具卡为纯文字卡，作品集页缺直观产品形貌 | 一次性脚本 toolbox-shots.mjs：本地 mock 模式（MOCK_LLM=1）跑三工具演示样例，Playwright 1400×900 截工作台产出区，产物入 `site/public/assets/toolbox/*.png`（隐私口径：固定样例 + 全新 context，逐张目检无账号痕迹）；卡片接 `<img>`（lazy + width/height 防 CLS），lh /toolbox/ 保持 ≥90 | 本 commit |
| 9 | `next build --turbopack` 在 Windows 报 EISDIR readlink（styled-jsx，Next 15 时代） | Next 16 升级专项实测：Turbopack 已成默认构建，Windows 本地裸 `next build` 直接通过，EISDIR 未复现——webpack 绕过随之退役（build 脚本本就是裸 next build，升级后自动切换） | 见 Next 16 升级 commit |
| 16 | 站点质量修缮（2026-09-30 用户验收反馈）：①「全部案例」/「数据分析」导航落地施工中占位页 ②全站正文中文引号被 smartypants 错转为双右引号（250 处） ③移动端抽屉主题切换按钮永远偏左（col-span-1 占半列） ④深色模式橙 accent/橙 border 用户反馈太扎眼 | ①两列表页建成（复用 Card，案例 5 篇/分析 2 篇）；②关 smartypants + scripts/fix-quotes.mjs 存量转换（跳过 frontmatter/代码块），18 页开闭配对全平；③改 col-span-2，实测按钮中心与抽屉中心偏移 0px；④深色 accent #58a6ff + border #334155 并入蓝色体系，浅色不动 | 958ec1b |
| 15 | evals 基线抓到反馈工具 4 例结构违例（fb-003 JSON 滑丝、fb-011 双计、fb-007/fb-015 主题数越界） | 逐例归因三分类：2 例真缺陷 + 1 例契约过严 + 1 例检查器级联误报。修复三件套：①prompt v1.1 输出前自查（85f2e62）②服务端机械契约校验 + 带具体违例重试一次（contracts.ts，两轮评测实测触发 6 次）③契约放松 1-12 三处同步（insights schema/prompt/evals 检查器）+ 检查器去级联（6446908）。另修 regress.compare 不兼容 mark_baseline 包装结构的端到端 bug。复测 66/66 ok、结构检查全 100%，基线重钉 20260930-005223 | 85f2e62 |
| 14 | toolkit 生产 API 无鉴权无限流，公网可直达计费链路（2026-09-29 安全审查 F1，报告见资料库 11 号） | 分层收敛：①代码层——同源白名单 403 / force 仅非生产 / 错误不回显测量值（58 vitest，bfb825f）；②平台层——Vercel Firewall 限流 10 次/分钟/IP **实测生效**（15 连发第 11 次起 429；教训：Firewall 规则是项目级的，须建在 toolbox 项目）；③限额层——DeepSeek 不开自动充值（用户确认，余额即上限）；④供应链——Dependabot alerts。生产验证（2026-09-30）：跨站 Origin→403、同站/无 Origin 超预算→400、生产 force 失效→400，四探针全过；浏览器真实生成回归通过（同源请求过白名单，"真实"模式完整六章报告 + 证据链标注 + 历史记录正常） | bfb825f |
| 7 | 验收②：本机无 LLM_API_KEY 无法产出真实报告 | 用户配置 DeepSeek key → `npm run smoke:real` 三份报告通过（约 6.6k tokens）；2026-09-28 三份报告已精选发布进 site/src/content/toolkit-reports/（含来源横幅与演示样例声明），M3 构建（581bd2c） | 581bd2c |
| 11 | AstroPaper 基座三个国内构建雷：Google Fonts（fontProviders.google 构建期拉取）、动态 OG（satori 依赖该字体且 CJK 缺字）、pagefind | T1 一次性拆除：系统 CJK 字体栈、静态 og-default.png（Playwright 截图生成）、search:false 并删依赖 | 5e8716e |
| 12 | Lighthouse 首轮 a11y 87（agriagent 页）：muted 小字对比度不足、dl 内结构不合规、文章标题锚链无可辨识名称 | 自定义组件文字改 text-foreground/75；MetricCards 改 ul/li；锚链加 aria-label；另过滤零权重 insight 审计避免误报 | 6422082 |
| 8 | 验收④：Vercel 默认域名国内被墙；且 CNAME 随机解析到被 GFW 封锁的 IP（216.198.79.65，443 TLS 被重置、换无关 SNI 同样失败=IP 级封锁） | 阿里云解析弃 CNAME 改两条 A 记录钉死可用 IP（76.76.21.21 + 64.29.17.65），实测 20/20 全通；域名 https://toolbox.yuhailinlxy.com 上线，API live 模式（Vercel 环境变量已配 key）；site 域名同方案（T14 用户操作项） | 本日部署 |
| 6 | duckdb reservoir 采样在并行扫描下同 seed 两次结果漂移（100.9 万 vs 101.7 万行） | 采样改独立单线程连接（`SET threads TO 1`），实测两次完全一致（1,021,043 行） | 5909509 |
| 5 | 抽样数据出现 2030 年时间戳等窗外脏数据；行级抽样稀释用户级指标 | clean_window 按官方窗口剔除 566 行；改用户级抽样 1 万用户全量行为 | 2d5b38d |
| 4 | winget 装 Quarto 报 1603（InstallScript 无法非交互运行） | MSI 下载后 `msiexec /a` 免管理员提取至 E:\tools\quarto，PATH 写入 ~/.bashrc | 56de970 |
| 3 | E 盘 exFAT 导致 Node 生态构建必然失败（fs.readlink 对普通文件返回 EISDIR -4068，NTFS 对照组为 EINVAL；Next/Astro 均受影响） | 仓库整体迁移至 C:\dev\pm-forge（NTFS），旧位置留指针 README；数据完整性验证后清理 | 47dc1b9 |
| 1 | pre-commit 首次安装被墙（GitHub HTTPS 不可达） | git config --local url.insteadOf 重写为 gh-proxy 镜像 | 0f8d9d7 |
