# STATUS.md —— 跨会话交接

> AI 连续工作协议核心文件（AGENTS.md 仓库特化规则 4）：每次会话开工先读本文件，收工必更新并 commit+push。

## 当前任务卡

- **M4 vault-tools 正式收工（2026-09-29 复检通过）**：验收①②③全达成——① 37 pytest 全绿；② 用户经 Obsidian agent 两轮修复后复检 **真孤儿 0 / 悬空 0 / 漏收仅余声明覆盖 135**（复检报告 vault `91-MOC/2026-09-29-vault-体检报告-复检.md`，vault commit 7e9d1ac77）；③ 扫描零修改验证通过。**巡检三件套转入季度节奏（`report --crosscheck`），P2 存量：裸名链接 36 处全路径化**
- **M3 正式收工（2026-09-28）**：验收①②③全达成（Lighthouse 全绿 / 四段式案例 / 用户部署+移动端验证）；全面检查 10 维度全过（docs/reviews/）
- **pm-forge 四模块（analysis / toolkit / site / vault-tools）全部收工，维护态**

## M4 实施记录（2026-09-28 · 同日第三场）

**关键决策（obsidiantools spike 实测驱动）**：
- obsidiantools 0.11.0 按笔记名（basename）键控：501 篇塌缩 494 键（同名 `_Index.md` ×11、`README.md` ×22 互相顶包）、`nonexistent_notes` 报 435（大量路径式链接误判悬空）、connect+gather 约 62s → **主扫描器自研 stdlib（全路径消歧），obsidiantools 只作可选对照层**（`report --crosscheck`）
- 消歧按链接类别分层（顶包安全方向）：裸名 `[[X]]` 计入全部同名 X；路径式 wikilink 试根路径→源相对→Obsidian 式子路径；md 链接是显式路径，相对优先不扩散
- 报告两步式交付：扫描只写 `vault-tools/out/`（gitignore，公开仓库红线）→ 人工通读 → 显式拷贝进 91-MOC + vault 显式 add/commit

**执行中修复的 4 个口径 bug（各有回归测试）**：file: 协议外链跳过（D 盘课件指针）；folder 链接补根目录式与子路径式；排除目录（90-模板）的文件参与悬空判定；子路径匹配须对去 .md 后缀路径比较

**真实 vault 首跑结果（488 篇 / 1611 条链接，git status 零修改）**：
- 🔴 真孤儿 3（逐条 grep 复核为真）：`30-项目/pm-forge/docs/STATUS.md`、`30-项目/个人工作台/经验总结-审查核实与功能迭代执行.md`（同名双拷贝，所有链接指向 docs/ 那份）、`30-项目/自我画像/docs/lessons-learned.md`
- 🟠 索引漏收 194：30-项目 159 / 40-经验教训 27 / 20-开发 5 / 00-Inbox 2 / 80-竞赛 1——待用户按 AGENTS 方法归类「真漏 / 刻意不收」
- 🟡 悬空 15：5 个 MOC 页被引用但不存在（课程/开发/阅读/日常-MOC、个人发展-MOC）、数学建模 2025-CUMCM 五篇笔记、`40-经验教训/小挑/`、`[[数学建模]]` 裸名、`[[90-模板/_Index]]`
- ⚪ 消歧警示：同名组 README ×22、_Index ×36 等 8 组；裸名链接顶包 5 处

**commits**：计划 1462648 → 脚手架 9f07ba2 → 扫描核心 659fc77 → orphans a758146 → index_diff 157ca00 → report 590b27a → cli eeff19d → crosscheck 7e6968a → README 8258e70 → fix file: d79fa62 → fix folder 3e46060 → fix 排除目录悬空 29a3b5e；vault：报告落库 c009a9830

**M4 后记（2026-09-28 晚 · 用户侧验收实跑出真价值）**：
- 用户把首跑报告交给 **Obsidian 内置 agent** 执行第一轮修复：新建 5 个 `_Index`（个人工作台/docs、superpowers plans/specs、前端架构、数据库开发）+ 11 处补挂 + 门户口改指最新版经验总结；该 agent 反向抓到 vault-tools 一个真 bug——**报告自我污染**（报告里反引号包裹的孤儿路径被解析器当真链接，报告会"自动治好"它报告的孤儿）→ 已修（scan.py 剥围栏块/行内码后再解析，37 测试全绿，commit 508192a）
- 修复后复扫：真孤儿 0 / 漏收 147（30-项目 135 系"门户口制 vs 逐篇制"判据差异）/ 悬空 15（MOC 页×5、CUMCM×5、零散×5——agent 刻意未擅动的存量）
- 第二轮修复任务书（剩余项全量，绝对路径）落 vault `91-MOC/2026-09-28-vault体检-修复任务书.md`（vault b594eae0e），交 Obsidian agent 执行；完成后 vault-tools 复扫验收（预期悬空 0）
- 经验：Agent 协作闭环成立——我的工具找问题、Obsidian agent 修问题、它又反过来抓到我工具的 bug；双向校验比单方正确更值钱

**遗留（用户侧）**：
1. **验收②**：Obsidian 图谱/搜索对照体检报告（抽 3-5 项核对观感一致即收）
2. 3 篇真孤儿处置：挂 _Index / 门户口，或删除重复拷贝（经验总结-审查核实 那篇是同名双拷贝）
3. 15 条悬空逐条拍板（补建 MOC 页 / 改链接 / 删条目）
4. 观察：vault git 后台 geometric-repack 偶发 Permission denied（Obsidian 占用所致，不影响提交推送）

## 全面检查记录（2026-09-28 · 接 M3 实施同日）

- 方法论：GitHub 四来源（Front-End-Checklist ~73k★ / mgreiler 评审清单 / OWASP CheatSheetSeries ~33k★ / Lighthouse）+ 两个适配维度（国内可访问性、内容隐私诚实性），落盘 docs/reviews/2026-09-28-工程检查方法论.md
- 结果：docs/reviews/2026-09-28-M3-工程检查结果.md。修复：F1 RSS 链接尾斜杠 404（getRelativeLocaleUrl 副作用）、F2 Quarto 报告 jsdelivr CDN ×2 → 本地化 + 持久化补丁脚本 analysis/scripts/patch_report_cdn.py、F3 死代码 ×2 删除
- 延后：postcss/Next 漏洞（#13）、npm audit 需官方源、上游 demo 图占 git 历史约 4MB（不改写历史）、check-links 相对路径局限
- 回归：site 构建链全绿 + Lighthouse 复验全绿；toolkit 52 / analysis 13 测试通过

## 上次会话（2026-09-28 · M3 实施日）

**做了什么**：
- 计划编写（15 卡，基于 AstroPaper v6.1.0 实测结构，上游 commit 35cfa7f）→ 0a96495
- **T1 基座**：AstroPaper 复制进 site/（非 fork，留 LICENSE），拆除三个国内构建雷：Google Fonts（fontProviders.google → 系统 CJK 栈）、动态 OG（satori+sharp 依赖该字体 → 删，静态 og-default.png）、pagefind 搜索 → 5e8716e
- **T2 架构**：posts 集合 → caseStudies/analysis/toolkitReports 三集合（zod schema 含 projectRole/stack/metrics/resultsNote）；路由五板块；i18n 加 zh.ts；Header 五导航；Card 泛化 → e179c6c
- **T3 模板**：三张详情页（案例带角色/技术栈卡+量化指标卡；分析带数据集卡+Quarto iframe；工具报告带来源横幅）+ 完整首页 → 3dacc39
- **T4 检查机制**：check-case-studies.mjs（四段式 H2 + 量化结果强制）与 check-links.mjs（dist 死链）串进 build → 7e64e4b（fileURLToPath 修 Windows 路径）
- **T5-T8 四篇案例**（事实全部来自 vault 素材，文书口径/实测数据分账）：①个人工作台（featured）②情侣心愿 App（featured；技术形态经阶段笔记核实为 Vue 3 Web 应用，非门户口所写"小程序"）③AgriAgent（获奖证书归属待用户核实，正文标【待补充】）④红岩群面复盘（featured，隐私匿名化）
- **T9-T11**：M1 报告迁 site/public/reports/ + 分析条目；工具箱页 + 三份精选报告（competitor 原文/feedback JSON→md+5×5矩阵/prd 原文）；关于页（隐私过滤：只用专业/项目/方法论素材，档案中家庭情感成绩一概不引用）
- **T12 品牌**：og-template.html + toolkit Playwright 截图生成 og-default.png；favicon 换"余"字标
- **T13 验收**：lighthouse + scripts/lh.mjs（自起 preview、每页两跑取高分）；首轮 a11y 87 → 修复三项真实问题（muted 文字对比度、dl 结构、标题锚链无可辨识名称）+ 过滤零权重 insight 项 → 六页全绿
- **目检修复**：Datetime 中文日期（YYYY年M月D日 按 locale 分支）；首页精选报告改列表
- 死链检查两次抓到真问题（tags 链接、构建管线），全部修复

**关键决策**：
- AstroPaper **复制改造**而非 fork（spec 未决 #3 落定）：保留上游 LICENSE，改造清单写进 site/README.md
- 案例质量纪律：只写 vault 素材可支撑的事实；BP 文书数据标注"文书口径"；工作台诚实标注 N=1 与 *.vercel.app 需代理
- 标签 v1 不做列表页（Card 内标签为纯文本徽标）；无分页（条目少，YAGNI）
- 日期等 UI 层中文直出；集合内容中文（站点即中文站，i18n 仅单 locale）

**遗留（用户侧）（2026-09-28 复核）**：
1. ~~Vercel 建站~~ ✅ 完成（pm-forge-site 项目，Root Directory=site）
2. ~~域名解析~~ ✅ 完成（阿里云 4 条 A 记录钉 Vercel IP；Vercel 面板角标为装饰性警告，实测 www/apex 均可达）
3. 内容终审：用户已整体验证；关于页/红岩复盘/工具报告的逐字复核随时可回看（隐私门持续有效）
4. AgriAgent【待补充：小挑二等证书归属】→ 挂 P2，用户核实后回填

## 下一步

**维护态节奏**：每月 1 案例/迭代进 site；季度跑一次 `report --crosscheck` 体检（报告落 91-MOC）；M4 体检报告的漏收/悬空清单由用户拍板后逐项消化。
之后：2027-06 决策门（考研/就业），2027-08-31 作品集定稿。

## 可作战状态

✅ 达成（M1-M4 四模块全部建成：analysis / toolkit / site / vault-tools；转入维护态）

## 2026-09-29 二期启动：spec 落盘待审

- 用户拍板"调研五案全要"并下达开工指令；按既定流程（spec → 用户审 → writing-plans → 实施）起步。
- **新 spec**：`docs/specs/2026-09-29-pm-forge二期评测线与交互报告设计.md`（v1.0 待审）——主线 A 评测线（A2 toolkit evals 门禁 10 月 → A1 拆解板块 11 月，评测章程为 A1 前置硬门槛）、辅线 B DuckDB-WASM 交互数据故事（体积+移动端双门禁、MVP 卡界）、插空 E 基建小包、二梯队 C 方法论文库（寒假，试点先行+脱敏扫描器+链接重写）。
- 10 号调研"审查修订 8 补充点"逐条落进 spec（硬伤×2：评测章程、C 链接重写；A2 钉版本、B 双门禁、报告组件层、日历缓冲、串行节奏、待拍板清单）。
- **Pagefind 技术验证完成**：npmmirror 有 pagefind 1.5.2 主包 + windows-x64/linux-x64 平台二进制（2026-09-29 实测）→ 站内搜索复活纳入 E 包，并预置"中文分词不达预期则砍"的决策规则。
- **待用户**：spec 书面审阅 + 待拍板清单 5 项（A1 产品选择豆包+Kimi/付费账号/月度案例节奏/B 数据集/C 试点确认）；A2 evals 不被拍板项阻塞，审完即可出 A 线任务卡。

## 2026-09-29 二期 A2 正式收工：evals 门禁建成并跑通基线

- **执行方式**：writing-plans 出 11 张任务卡（`docs/plans/2026-09-29-pm-forge-a2-evals-实施计划.md`），本会话逐卡 TDD 执行，每卡独立 commit+push。
- **模块**：新顶层 `evals/`（零依赖 Python 3.12 + uv，src 布局，setuptools 打包，console script `evals`）；依赖方向 evals ──HTTP 黑盒──→ toolkit（AGENTS.md 依赖图已更新）。
- **全链**：66 条评测集（三工具 × 22，基础/复杂/边界三档，黑盒合同下限自检入测试）→ 确定性结构检查（feedback 的 count 守恒/quotes 逐字、competitor/prd 六章与证据链标注）→ LLM-as-judge 四维评分（温度 0、model 字符串留痕、JudgeError 带更正提示重试一次）→ runner 三道守卫（key/`--yes` 成本门/mock 模式拒绝）→ 增量落盘 + 可重建 summary → regress/calibrate/report/mark-baseline 五命令。95 pytest 全绿。
- **基线（run 20260929-133346）**：66/66 ok、13 分 20 秒；judge（deepseek-flash，配置 deepseek-chat）138,201+26,105 token ≈ 2-3 元。分数表：竞品 4.91/5.00/4.18/4.95，反馈 2.55/4.09/3.36/2.14，PRD 4.09/5.00/3.82/4.95。结构检查抓到反馈工具真实契约违约（count 守恒 85.7%、quotes 逐字 90.5%，v2 修）。
- **人工盲评校准**：8 案例 × 4 维 = 32 对（先盲评后对比），完全一致 62.5% / ±1 84.4% / MAD 0.594；**5 条差 >1 分歧全是 judge 打低分、4 条集中反馈工具** → 实锤 rubric 锚点工具错位（跨工具 judge 分数不可比）。此发现 + "judge 看不到输入"（fb-015 误伤实证）+ "judge 真捕获"（comp-006 凭空断言）构成《evals 计划》第六节的 v2 改进依据。
- **执行中抓修 3 个真 bug**（各有测试）：①judge 畸形 JSON 重试；②结构通过率分母稀释（must_include 18%→100%）+ summary 可重建（rebuild_summary）；③zoneinfo Windows 无 tz 库回退固定 UTC+8（clock 模块统一）。
- **发布**：site toolkitReports 枚举扩 "evals"，《AI 工具箱 evals 计划》+《基线报告》两篇入库，astro build 全绿（14 页、案例检查/死链检查通过）。经验双写：repo lessons + vault `40-经验教训/AI-API经验/2026-09-29-自建evals门禁的三层判定设计.md`。
- **遗留（v2/P2）**：rubric 工具感知锚点；judge 输入可见；反馈工具 JSON 契约违约修复（count 守恒/quotes 逐字）；用户侧抽查校准分歧项（calibration/README 有流程，rater=user 追加即可）；E 基建小包（CI/Pagefind 1.5.2 已验证/RSS/JSON-LD）随时插空；下一线 B 交互数据故事 11 月启动。

**可作战状态**：✅ A 线 A2 收工；A1 拆解板块待 §12 拍板（产品选择+付费账号）后 11 月开工。

## 2026-09-29 安全审查 + 代码侧加固（用户授权远程执行）

- **审查**：vault 无现成方法论 → 采用 OWASP API Security Top 10 (2023) 裁剪（十项只命中三类：资源消耗/业务流滥用/安全配置），东方适配三条（npm audit 镜像缺口 → 直连官方源审计+Dependabot 补偿；人机验证用平台自带；WAF 只用已验证国内可达）。报告：`资料库/11-pm-forge安全审查报告.md`；方法论沉淀 vault `40-经验教训/安全审查/`。
- **通过项（有证据）**：git 全历史无 .env/无 key 形态、两 .env 正确忽略、无 NEXT_PUBLIC、Python 无危险调用、站点零第三方资源、隐私词扫描仅合成内容命中、site 依赖 0 漏洞、HSTS 启用。
- **发现 F1（中高）**：toolkit 生产 API 无鉴权无限流 = 公网计费代理（TOKEN_BUDGET 零成本探针实证 + force 旁路 + 错误响应泄露测量值）。**代码侧三道防线已实施（bfb825f，58 vitest 全绿）**：①Origin 白名单外 403（无 Origin 脚本请求放行——evals 依赖，滥用由平台层兜底）②force 仅非生产生效 ③错误响应不回显 estimated/max（服务端 console.warn 留痕）。**F4 安全响应头已实施（vercel.json × 2，双构建通过）**。登记 ISSUES #14。
- **推送即自动部署**：部署后需人工目检 toolbox 页面正常 + 真实生成一次（生产 Origin 校验生效后浏览器同源请求应放行）；`ALLOWED_ORIGINS` 环境变量可加 Vercel 预览域名。
- **用户侧三项（需本人登录）**：①DeepSeek 平台确认不开启自动充值 ②Vercel Dashboard → toolbox → Firewall 加 /api/* 限流规则（Hobby 免费 1 条）③GitHub 仓库开 Dependabot alerts（gh CLI 未安装，无法代开）。

**F1 收口补记（2026-09-29 晚）**：平台侧三项全部落地并实测——Vercel 限流规则建在 toolbox 项目后，15 连发探针第 11 次起返回 429（10 次/分钟/IP 精确生效）；用户确认所有 API 平台永不开启自动充值（余额即限额）；Dependabot alerts 已开。教训入库：Firewall 规则是**项目级**的，建在 site 项目的规则对 toolbox 域名零作用（探针两轮全 400 定位）。ISSUES #14 关闭在即，仅剩用户浏览器目检一次真实生成。

## 2026-09-30 评测驱动第一次产品迭代：反馈工具契约修复（用户睡眠期间自主执行）

- **浏览器回归补完 F1 最后一脚**：IAB 真实浏览器全链路生成通过——同源请求过 Origin 白名单、"真实"模式完整六章报告（证据链标注/待验证纪律正常）、历史记录落盘。四探针复测：跨站 Origin→403、同站/无 Origin 超预算→400、生产 force 失效→400。ISSUES #14 关闭。自动化点击超时的原因是按钮位于 720px 视口底缘（elementFromPoint 证实无遮挡），非产品缺陷。
- **基线 4 例结构违例逐例归因三分类**：fb-003（JSON 键名滑丝）/fb-011（同条反馈双计，count 和 9≠8）为**真缺陷**；fb-015（6 条相同反馈聚 1 类）/fb-007（30 条多元输入聚 9 类）为**契约 3-8 过严**——退化输入 1 类才是诚实答案、大批量 9 类本是好分析；fb-007 另三项"违例"是**检查器级联误报**（越界分支清空 themes，下游检查全在空列表上判 False）。
- **修复三件套**（85f2e62 toolkit / 6446908 evals）：①prompt v1.1 输出前自查清单 + 反双计 + 引用禁编号前缀；②服务端机械契约校验 + 带具体违例重试一次（contracts.ts，mock 不参与；两轮评测实测触发 6 次）；③主题契约 3-8→1-12 三处同步（prompt/insights schema/evals 检查器）+ 检查器去级联。
- **顺带抓修第 4 个系统级 bug**：regress.compare 从顶层读 per_tool/cost，而 mark_baseline 落盘的是包装结构——98 测试全绿但端到端 regress 对真实 baseline.json 永远显示"基线缺失"（夹具形状从未复刻真实落盘）。教训入 vault：`40-经验教训/AI-API经验/2026-09-30-评测失败样本要先归因分类再决定修什么.md`。
- **复测达标重钉基线**：22 例试点（违例 4→1）→ 全量 66/66 ok（约 15 分钟，judge ≈2-3 元）→ 三工具结构检查全部 100% → 基线重钉 20260930-005223，regress 自比对全 0.00 自洽。ISSUES #15 关闭。
- **待用户**：site 报告草稿 `evals/out/eval-driven-contract-fix-draft.md` 审阅后决定是否发布（两步式纪律）；前篇基线报告建议保留为历史快照不动。

**可作战状态**：✅ evals 门禁完成第一次"评测→修复→复测"完整闭环；下一站不变——A1 拆解板块待 §12 拍板后 11 月开工，B 线 12 月。

## 2026-09-30 站点质量修缮 + 内容补齐（用户验收反馈当轮完成）

- **用户抓出的四个问题全部修复**（ISSUES #16，958ec1b）：①两处"施工中"占位页建成真实列表页（案例研究 5 篇/数据分析 2 篇，复用首页 Card）；②全站中文引号被 smartypants 错转为双右引号——关闭 smartypants + `scripts/fix-quotes.mjs` 存量转换 250 处（首版脚本把 frontmatter 也转了，git checkout 回滚后修好 off-by-one 重跑），18 个构建页开闭引号计数全平衡；③抽屉主题按钮 col-span-1→2，实测中心偏移 0px；④深色模式弃上游默认橙 accent/橙 border，改 #58a6ff 蓝 accent + #334155 中性 border（用户反馈"换成之前那个颜色"=浅色模式的蓝色体系），浅色模式不动。
- **内容补齐两篇**（用户指令"把该上的内容都上了"）：案例研究新篇《学生会交流平台》（13 模块、双视角审视→17 篇改进文档闭环、v1→v4.6.1，live+repo 双链接且 github.io 国内可达）；数据分析新篇《蔬菜定价优化》（CUMCM C 题三轮建模迭代、负利润暴露、真实批发价交叉校准）。工行杯（赛期保密）、Horizon（上游开源项目归属）、视频文案提取器（材料薄）本轮不上，理由留档。
- **用户反馈沉淀**：作品集外链域名（vercel.app 被墙）用户自行解决，P2 留档；"不要让用户当 QA 排查小问题"固化为发布前自检走查纪律（vault AI协作主题新篇）。
- **验收**：构建 18 页全绿、案例检查 5 篇通过、死链检查通过；浏览器实测深色新配色与按钮居中（几何偏移 0px）；引号渲染正确。

**可作战状态**：✅ 站点内容面补齐；A1 拆解板块拍板仍是下一站（11 月）。

## 2026-10-02 A1 拍板落定：拆解对象三选齐，章程草案待审

- **用户拍板**：拆解对象 = **豆包 + Kimi + DeepSeek**（超出 spec 推荐的 1-2 个，DeepSeek 为用户点名新增，spec 已升 v1.1）。付费账号情况（§12 项 2）未答——不阻塞，章程按免费口径先行、付费后补深测。
- **章程草案 v1.0**：`docs/specs/2026-10-02-pm-forge-A1拆解评测章程.md`——六条铁律沿用 spec §3.3 并 operable 化（版本口径、措辞纪律细化到可检查）；新增**利益披露条款**（DeepSeek 双重身份：既是拆解对象又是本站工具箱底层模型，报告须开头披露）；深度分层草案 = 豆包全量主评 + Kimi（长文本）/ DeepSeek（推理与结构化产出）对照子集，总量守 spec 验收硬线（≥10 任务 + ≥5 失败案例按板块计）。
- **待用户**：①章程草案审阅定稿（定稿 = A1 开工前置硬门槛，全文随板块首发）；②付费账号情况（三产品各自）；③开工窗口确认（计划 11 月不变或提前）。
- **节奏不变**：A1 仍按计划 11 月开工；10 月剩余窗口 E 基建小包（CI / Pagefind 1.5.2 已验证 / RSS / JSON-LD）随时可插空。

**可作战状态**：✅ A1 拍板落定、章程草案就绪；A1 开工只欠章程定稿 + writing-plans 任务卡，E 包可插空。
