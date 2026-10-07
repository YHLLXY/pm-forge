# ISSUES.md

> 问题登记（vault AGENTS.md 12.5）：现象/原因/影响/严重度/状态。已修复的移到「已修复」区并附 commit hash。

## 待处理

| # | 现象 | 原因 | 影响 | 严重度 | 状态 |
|---|---|---|---|---|---|
| 13 | toolkit 依赖链漏洞台账（2026-10-07 Next 16 专项后实测：**残余 7 条 5 高 2 中**，官方源 npm audit；GitHub Dependabot 面板报 10 条 6 高 4 中，口径差异以面板为准）。沿革：2026-10-02 首记 next 15.5.26 内嵌 postcss 链（2 条 1 高 1 中→4 advisory）→2026-10-06 面板 9 条 5 高 4 中→**Next 16.3.8 升级消除原 postcss 链**；2026-10-07 新披露 4 组：sharp（librsvg CVE）与 source-map-js（事件循环 DoS）已由非破坏 `npm audit fix` 修复；残余 = braces 链（GHSA-vfj7-8cjw-p6xm，advisory 打在 `*` 上游无修复版本，链路 eslint-config-next→@next/eslint-plugin-next→fast-glob→micromatch→braces）+ postcss-selector-parser<7.1.6（GHSA-rj75-hqrm-r3gf，经 @tailwindcss/typography，"修复"=荒谬降级 typography@0.5.4） | 残余 7 条全部是 dev/build 期传递依赖（eslint 与 tailwind 构建链），运行时零暴露；上游暂无修复版本，`npm audit fix --force` 的"修复"是降级 eslint-config-next@14 / typography@0.5.4，不可取 | 实际可利用性低——braces 仅在 lint/glob 时使用，selector-parser 仅构建期 CSS 解析；site/ 实测 0 漏洞 | 低 | 观察：上游发布修复版本后跟进升级；**严禁 npm audit fix --force**；`npm audit` 须加 `--registry=https://registry.npmjs.org`（npmmirror 无 audit 接口） |
| 10 | 若 Vercel 钉住的两个 IP（76.76.21.21 / 64.29.17.65）未来也被 GFW 封锁 | 国内直连 Vercel 天然受墙影响 | 网站国内不可达（toolkit 与 site 同方案） | 中 | 巡检脚本就绪（node scripts/check-vercel-ips.mjs，零依赖双栈判级：node/OpenSSL 探针红时用系统 curl/Schannel 交叉复核，双红=硬不可达走后手、单红=TLS 指纹级干扰记录观察），每次发布/求职季自跑；2026-10-07 首跑：64.29.17.65 出现指纹级干扰（OpenSSL 系握手被丢、Schannel 仍通，浏览器主路径未断），观察中；告警处置=后手 Cloudflare 代理（已实测国内可达） |
| 2 | vault 仓库 push 时报 multi-pack-index 权限拒绝（commit/push 本身成功） | 疑似 Obsidian 文件锁或 .git 权限 | 后续 vault 提交可能间歇报错 | 低 | 观察 |

## P2 演进项（v1 明确不做，非缺陷）

| 项 | 说明 |
|---|---|
| 作品集外链域名绑定（用户自行操作） | personal-workbench 的"在线访问"指向 *.vercel.app 被墙，国内点击无响应（2026-09-30 用户确认自己解决）；方案与 toolbox 同：Vercel 项目绑子域名 + 阿里云 A 记录钉 IP，绑定后把站上链接一并更新 |
| 反馈 CSV 列映射 | 上传已支持 UTF-8/GBK 自动解码（2026-10-07，见已修复 #17）；列映射仍不做——从表格粘贴多列时需用户先删掉与内容无关的列（表单 hint 已引导） |
| Supabase 持久化 | 运行历史目前仅 localStorage（每工具 10 条）；云端同步待用户量需求 |
| 反馈工具上传/导出图表 | 优先级矩阵为 CSS 网格，ECharts 可视化待 v2 |
| 演示模式样例可配置 | fixtures 目前写死在代码中 |
| site 标签列表页/分页 | 标签现为纯文本徽标；案例超 10 篇后再做分页 |
| site 工具真截图 | 工具箱三工具卡暂为文字卡，可用 Playwright 截工具工作台配图 |
| AgriAgent 获奖【待补充】 | vault 有"小挑二等"证书，归属届次待用户核实后回填案例 |
| vault-tools（M4） | 独立里程碑，未开工 |

## 已修复

| # | 问题 | 解决方案 | commit |
|---|---|---|---|
| 17 | 反馈上传 GBK 文件需手动另存 UTF-8（`file.text()` 恒按 UTF-8 宽松解码，乱码只能靠 U+FFFD 事后报错） | 新增 `decodeUpload` 纯函数：UTF-8 严格解码（fatal:true，杜绝静默 U+FFFD）+ BOM 剥离优先，GBK（WHATWG 标签 gbk=gb18030 超集，覆盖 Excel 中文导出）兜底，双失败才抛 DecodeError；feedback-form 接线（提示文案同步更新），解码单测 4 条 + 表单上传集成 2 条 | 本 commit |
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
