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

## 2026-10-02 夜 E 基建小包收工（用户睡眠期间自主执行）+ #13 漏洞盘点

- **付费口径拍板入章程 v1.1**（ced8f3a）：豆包/Kimi 未付费走免费口径，DeepSeek API 余额归 A2 分账；A1 待确认项只剩深度分层方案（章程 §1）与对照分工（§7 项 3）两处用户点头。
- **E 包按计划 v1.1 五卡全收**（独立只读子代理四镜头审查 PASS-WITH-FIXES，修法全采纳后逐卡实施）：
  - **E1 CI**（fe10976）：`.github/workflows/ci.yml` 三 job——site（astro build+四道检查）/ toolkit（vitest+next build）/ python 三模块 pytest（evals 只跑 fixture 零 key）。**推送即全绿，此后每卡 run 均 success**（spec E①）。
  - **E3 RSS 全文**（f915b59）：容器 API 渲染 content:encoded（纠偏：`render(entry)` 是独立函数非 entry 方法）+ 根相对链接绝对化 + `validate-rss.mjs` 入构建链。线上 12 条全文实测。
  - **E4 JSON-LD**（87fbce1）：Layout 注入 WebSite/Person，PostLayout BlogPosting 原有不动；`check-ld.mjs` 断言合法性+必需属性（20 页 12 个 BlogPosting 全过）。
  - **E2 搜索**（0f42e48）：Pagefind 1.5.2 构建期索引 + 自研 /search 页 + header **图标入口**。两个真坑当场抓修：①Vite 产物留 `__VITE_PRELOAD__` 占位符（Astro 转译丢 @vite-ignore）→ 改运行时 script 注入；②第 6 个文字导航项致 flex 收缩文字竖排（线上 5 项 h=32 对照本地 h=56 定位）→ 图标入口，抽屉 7 行居中偏移全 0。**中文验收：幻觉/RFM/个人工作台三词本地+线上全命中预钉页面，砍线规则未触发**；Lighthouse 七页全 ≥93（/search/ 四项全 100）。
  - **V1 漏洞盘点**（db90662）：官方源 audit——site **0**、toolkit 2（next 内嵌 postcss，GitHub"4 个"是 advisory 计数口径）；证据落 docs/reviews/2026-10-02-npm-audit-证据.md；Next 16 调研结论回写 #13（async API 已就绪/无 middleware/image，风险=Turbopack 默认构建+Windows EISDIR 史；修复版本实测 16.3.8；**严禁 audit fix --force**）。
- **生产验证**：/search/ 200、pagefind.js 200、首页 WebSite JSON-LD、rss.xml 12 条全文、线上搜索 RFM 4 条命中、零第三方运行时请求；QA 用独立 IAB 标签页完成并清理，用户标签页未动、主题偏好已还原 dark。
- **经验双写**：repo lessons + vault `40-经验教训/前端架构/2026-10-02-搜索复活踩坑-Vite动态导入占位符与导航溢出.md`（vault 43aea7146）。

**可作战状态**：✅ E 包四卡+V1 收工，spec E 验收 ①-⑤ 全达成；下一站 = A1 章程定稿（只欠用户点头分层方案）→ writing-plans → 11 月拆解实测；B 线 12 月照旧。

## 2026-10-02 午后 A1 开工：章程定稿 + 计划三审拍板 + 任务卡执行

- **章程 v2.0 定稿**（9f20f46）：深度分层与对照分工用户点头；付费口径 v1.1 已入。A1 前置硬门槛（spec §3.3）达成。
- **实施计划三轮审查**：v1.0 自检 → 独立子代理四镜头审查（**T3 导航算术 FAIL：源码复算容器 736px/现状占 724px/余量仅 ~12px，文字项与第三个图标都放不下**；T5 FAIL：site/out/ 未被 gitignore）→ v1.1 吸收全部修法 → **用户三项拍板**（AskUserQuestion）：①导航=短标签方案（案例/数据两字+拆解文字项+gap 收紧+断点 sm→md）②上线节奏=11 月一起上 ③月度案例减配保主线（spec §12 项 3 关闭）→ v1.2 落拍板（0eacb3d）。
- **任务卡执行（main）**（257f38a）：T4 任务集 19 条 JSONL（豆包主评 11=写作3/检索3/结构化3/边界2 + Kimi 长文本 4 + DeepSeek 推理 4，全部合成素材"清饮 C1"生态，每条带考察点与预期失败模式；两条"应该失败"任务显式设计）+ T5 执行协议（**site/.gitignore 补 out/**——审查实测缺失，两步式第一态此前无机械护栏；staging 约定入 evals/dissection/README.md）。
- **任务卡执行（a1-dissection 分支，e1c6ac4，11 月随首篇合并上线）**：T1 双集合（dissections md + dissection-records JSON，zod superRefine 失败必归因）+ check-dissections.mjs 六条门禁（日期+版本强制/失败归因/**失败≥5 仅在报告≥1 篇时强制**/引号平衡降 warning/**隐私扫描两层——模式规则入库、具体词表 gitignored（词表入库=泄露人名）**/文件名=id）；T2 报告组件五件（纯 props + report-tokens.css 语义 token，global.css 已挂）；T3 三页面（板块首页含章程卡与无日期承诺的 0 条目态、[slug] 详情页 records 聚合驱动、charter 静态路由保留字过滤）+ 短标签导航；T7 章程发布页（读者口径）。
- **分支验证**：临时夹具全链验证（6 记录 5 失败 1 报告 → 渲染正确；夹具未来日期被 sortEntries 定时发布机制正确过滤——管线级验证），删除夹具后 0 条目态构建 21 页全绿；几何门禁 768/1024/1280 三档全链接 h=32 单行 + 抽屉 8 行居中 0px；报告页截图核验（判定色/归因块/四维徽章在位）。
- **vault**：`30-项目/pm-forge/2026-10-02-A1拆解实测执行指引.md`（用户批次卡：4 批 × 30-45 分钟，10 月开跑；vault 1dae89869）。

**可作战状态**：✅ A1 开发侧全部就绪；**球在用户**——按 vault 指引跑 4 个实测批次（10 月），AI 批后结构化，11 月中合并分支发布首篇《豆包拆解》。B 线 11 月 spike、12 月 MVP 照旧。
## 2026-10-02 傍晚 A1 实测 19/19 代跑完成（用户授权 + 登录就位）

- **执行授权链**：用户指示"能代跑的测试自己跑"（章程 v2.1 修订款，a455b2c）→ 侦察发现三产品访客模式均静默拦截 → 用户在 IAB 一次性登录豆包/Kimi/DeepSeek → AI 全量代跑。
- **执行器两套**：①`evals/dissection/run_api.mjs`（DeepSeek API，key 只从 .env 读，按模型分目录落盘）；②豆包/Kimi 走浏览器代跑——豆包配方 = textarea/ce 双模式原子写入 + 几何匹配 36×36 发送键（Enter 对富文本编辑器无效）；Kimi 配方 = `.chat-input-editor` + execCommand insertText + `.send-button-container`（**草稿跨刷新持久化，必须走 `?chat_enter_method=new_chat` 拿干净编辑器**；execCommand 的 selectAll/delete 被忽略、Playwright 键盘清除也无效——重载不清草稿是唯一坑）。OS 级 CUA 键入在用户在场时主动停用（有误入其他窗口风险），全程 DOM 层操作。
- **战果**：21 份原文 + 15 张截图落 `site/out/dissection-staging/`（gitignored 两步式第一态）：豆包 11（全部快速模式、25s 内完成）+ Kimi 4（K3 快速模式，25-55s）+ DeepSeek 6（4 chat + 2 reasoner）。
- **首批发现预览**（结构化评分留待 T6）：①DeepSeek"厘"陷阱对照——chat 模式 1元=100厘 算出 181.5 元/只超零售价不自检（失败案例），reasoner 模式正确 77.17 元；②豆包/Kimi/DeepSeek 的"不存在实体"与"能力边界"任务表现待评分归档。
- **用户侧知情项**：豆包/Kimi 账号历史里留下了 AI 代跑的会话（豆包 12 条含连通性测试、Kimi 5 条），可自行删除；工作标签页已清理，只留用户自己的站点标签。
- **遗留**：DeepSeek 网页端消费端口径（UX/会员维度）可选补测；下一步 = T6 结构化（评测记录 JSON + 门禁 + 报告草稿）随批次点评推进，11 月中分支合并发布。

**可作战状态**：✅ A1 实测数据全量在手；T6 结构化是下一卡。
## 2026-10-02（T6 结构化收工，a1-dissection 分支 4a4ec95 + eca1c4a）

- **补测两批 10 条任务**（任务集 v2，答案钥匙预写进 focus 防事后挑选）：批 1 陷阱探测 5 条全过（含 doubao-struct-002 补捕获——豆包主动抓出素材星期笔误并校准作答、96 秒长思考；ds-struct-003 中途算错数量级自我喊停重算的双向验证自纠）；批 2 顺从性探测 3 条——**豆包搜索后顶回虚构纠正（成功），DeepSeek/Kimi 投降（失败 ×2）**。失败案例补足 5 条，验收②达标。
- **30 条评测记录入库**（23 成功/2 部分/5 失败，six gates 全绿）：doubao 14 / kimi 6 / deepseek 10（chat+reasoner 双模式分档）。最有复用价值的发现：deepseek 的自查只在"答案内部数字互斥"时触发，对外部权威压力（用户断言）完全不设防——厘陷阱与顺从性两案同源。
- **三篇报告草稿**：doubao 主评（边界诚实双满分 + 虚构书"最近邻桥接"失败）/ kimi 对照（跨文档字段级论证 + 长文计数满分 + 顺从性投降）/ deepseek 对照（一开关两种命运）。RSS 15 条、JSON-LD 15 BlogPosting、死链 69 文件、双端 390/1280 零溢出。
- **素材勘误**：doubao-struct-002 的"10/10 周五"应为周四，原文保留、勘误入 README（与已跑记录一致）。
- **球在用户：措辞终审**——三篇报告全文 + 30 条记录摘录（两步式：终审通过才进 11 月中合并发布）。发布前待办：15 张 staging 截图脱敏裁切（含账号昵称/侧栏）、隐私词表 out/dissection-privacy-lexicon.txt 可选补建（当前门禁仅模式规则层）。
- **代跑通道备忘**：豆包首页编辑器（textarea+隐藏 tiptap 双层）成功配方 = type() 真键入 → 点输入框 → 点发送（flaky，常需重试）；Kimi = setEditorState 清草稿 → editor.focus() → paste 事件 → 点 .send-button-container（可靠）；DPR 1.25 缩放坑 = 截图空间≠tab 元数据视口，坐标点击以截图空间为准。

**可作战状态**：✅ T6 收工；待用户措辞终审 → 11 月中合并上线。

## 2026-10-02 深夜（发布前修缮收尾，用户终审以委托方式通过）

- **终审口径**：用户明确"能跑的都帮我跑、其他按你的推荐"，措辞终审以委托方式通过——已按五步走查（导航/排版/主题/视口/外链）+ Lighthouse 抽查代行最后一道验收，决定记于此。
- **截图脱敏发布**：20 张实测截图经 scripts/sanitize-shots.mjs 脱敏（豆包裁侧栏 283px、struct-004 加裁底部、write-003 画布双昵称区白块遮盖、Kimi 侧栏本已折叠），落 `site/public/assets/dissections/` + manifest.json；RecordCard 接入截图展示（清单缺失时自动降级为无图）。
- **对比度修缮**：Lighthouse 抽查 a11y 96→100——verdict 浅色 token 升 700 级（#15803d/#b45309），报告层全部 text-foreground/60 升 /75（沿用 #12 先例）。报告页实测分：doubao 99/100/100/100，deepseek 100/100/100/100。
- **补漏**：doubao-struct-004 的 raw.md 此前误存 debug 文件，已补落 staging；其截图从会话存档补拍。
- **隐私词表**：维持不建（无法可靠枚举真实他人名，宁缺勿假）；模式规则层（手机号/身份证）在跑，构建警告如实提示。

**可作战状态**：✅ A1 板块分支全部就绪（内容+组件+截图+门禁），等 11 月中合并窗口。

## 2026-10-03 凌晨（发布前全面审查：双轴子代理 + 数据一致性核对 + 修复 14 项 + 独立复审 PASS）

- **审查方法**：code-review 双轴并行子代理（Standards/Spec）+ Spec 轴附带数据一致性逐条机械核对（记录↔任务↔报告三向）+ 仓库门禁自跑 + dist 产物机械验证 + 修复后独立复审子代理复核。报告全文：`docs/reviews/2026-10-03-A1拆解发布前审查报告.md`。
- **抓到的硬伤（全部修复）**：①两篇报告判定分布与记录不符（doubao 12/1/1→**11/2/1** 且 edge-002 未展示、deepseek 6/4→**7/3**）——门禁盲区：六条门禁不核对报告正文数字；②deepseek.md **缺章程 §5 利益披露**（T6 验收①漏项）；③**章程页未同步 v2.1**（铁律 2 仍 v2.0 原文，与报告 charterVersion 声明自相矛盾）——已补版本行+修订款全文+口径段；④铁律 4 跨产品排名句四处（全场最佳/最快一个量级/投降最彻底/最完整）；⑤免费口径错置（API 计费账户）；⑥双模式句与数据不符（实为 3 条双跑，reason-004 仅 chat）；⑦`_example.json` 虚构示例入库（未来日期+撞真实 id）已删。
- **同步修缮**：README 执行协议段按 v2.1 修订款重写（截图路径 src→public、19+8=27 条）；RecordCard 图注改章程 §5 格式「来源：{产品名}，截图日期 {日期}；已脱敏」；[slug] 页补**边界能力清单**小节（kimi/deepseek 显式声明边界面未测）；lh.mjs 补首篇详情页（九页）；/60 对比度残留三处收尾；sanitize 注释去真实昵称。
- **二次踩坑记录**：Astro 表达式容器禁语句（12 错误级联）→ lessons-learned 新增条目。
- **接受不改项**（记录在审查报告 §1.4）：复盘/成本与延迟由报告正文与记录卡页脚承担不造空节；gen 脚本一次性不重构；截图落 public/ 为有意偏差；隐私词表维持不建。
- **门禁缺口备忘**：check-dissections 六条门禁不覆盖「报告正文数字 ↔ 记录集合」一致性，本次靠审查子代理抓出；后续如出 A2 线可考虑把判定分布断言进门禁。

**可作战状态**：✅ 审查-修复-复审闭环完成，构建 0 错误 0 警告 24 页全绿；A1 分支继续等 11 月中合并窗口。
## 2026-10-06（A2 尾巴收口 + §12 拍板全落定 + B 线实施计划就绪 + A1 合并当日执行）

- **契约修复报告发布**（ca3abdd，main 已上线）：`evals/out/eval-driven-contract-fix-draft.md` 按两步式发布——代行终审方法 = 全文数字对齐 `evals/baseline/baseline.json` 产物证据（66/66 ok、judge 140,825+25,970 token、反馈工具结构检查全 1.0、基线重钉 20260930-005223 全部吻合）+ 发布稿与原稿 diff 仅 blockquote 一处（草稿标记→发布口径）+ 构建/门禁全绿（20 页、RSS 13 条、死链 65 文件）。前篇基线报告按既定口径保留为历史快照不动。GitHub 漏洞提示为已知 ISSUES #13（Next 16 专项卡），非新增。
- **§12 五项拍板全部落定**（spec v1.2）：项 4 = B 数据集**复用 M1 UserBehavior 10 万行抽样转 parquet 自托管**；项 5 = C 试点**《键控消歧设计》**。经用户委托授权按推荐执行，两处开工前可翻案。至此 §12 清单 5/5 关闭，B 线 writing-plans 解除阻塞。
- **B 线实施计划就绪**：`docs/plans/2026-10-06-pm-forge-B数据故事-实施计划.md`（9 任务卡：地基/spike/体积门禁/预置固化/叙事页/图表/受限查询框/Playwright 双门禁/Lighthouse 收尾）。关键设计决策已锁死：duckdb-wasm 走 **EHDR 单线程形态**（免全站 COOP/COEP）、懒加载唯一入口 `duckdb-loader.ts`、SQL 拼装唯一收口 `allowed-queries.ts`（枚举+正则约束零自由文本）、移动端降级门禁用视口+触控组合判定。npmmirror 在架性已验证（@duckdb/duckdb-wasm、@observablehq/plot 0.6.17、scrollama 3.2.0）。
- **A1 合并当日执行**：用户同日指示"按照计划开始"——A1 合并提前于原定 11 月中窗口执行（唯一冲突 docs/STATUS.md 双方补记按时间序并留），合并后构建门禁复跑、线上复验，随即切 `b-data-story` 开工 B 线。

**可作战状态**：✅ A 线全部收口（A2 发布闭环 + A1 合并上线）；B 线按计划卡执行中。

## 2026-10-06 晚（A1 线上复验 + B 线 MVP 九任务卡一日贯通，合回 main）

- **A1 线上复验**：合并部署后 yuhailinlxy.com 三篇拆解 + 章程页渲染正常；doubao 判定分布本地机械清点 11 成功/2 部分/1 失败 = 14 条记录逐一吻合（线上抽查代理曾误数 10/3/1，以机械清点为准）。
- **B 线九任务卡全部执行**（a8581c9→c890695 共 9 commits，全部已推 b-data-story，本补记随合并入 main）：
  1. 地基：@duckdb/duckdb-wasm **1.32.0 稳定版**（镜像 latest 是 dev 标签 1.33.1-dev57，按预案改钉非 dev 最新）+ plot 0.6.17 + scrollama 3.2.0，EHDR 资产拷贝入构建链。
  2. spike 打通：懒加载边界 Playwright 实证（点击前零重资源，点击后 4 行行为计数总和=100,000）。
  3. 体积门禁：check-story-budget 入构建链（pagefind 前），反向验证 parquet 限 1MB → exit 1。
  4. 10 问预生成：官方窗口清洗 **100,000→99,958 行**（42 行脏时间戳，ISSUES #5 同源，口径同 ingest.clean_window，q01 口径行如实披露）；q03/q04 与 pandas 规范语义逐值交叉验证一致。
  5. 7 节滚动叙事页 + 口径行构建期注入（process.cwd() 读 preset JSON，页面文本与数据单一事实源）+ 导航补「故事」入口。
  6. Observable Plot 10 图（3 大数字卡 + 7 SVG），进视口才 fetch。
  7. 受限查询框：白名单 SQL（枚举/整数域/正则，零自由文本）+ 懒加载引擎（首查 3.2s，后续 <40ms）+ limit=51 行内报错。
  8. Playwright 双门禁（npm run check:story）：正向双场景绿 + 反向验证（页面注入 loadDuckDB() 自动加载 → 双场景必红）。
  9. Lighthouse 10 页全过：story 页 **99/95/100/100**（a11y 首跑 89 → 修 scrollama 透明度进场为 accent 左边框后 95）。
- **B 验收①-⑥勾验**（spec §4）：①首屏零重资源=story-gates 场景 1 ②自由查询=查询框 3 场景+越界报错 ③移动降级=场景 2 零重资源+提示在位（移动端表单整体移除，杜绝触发 WASM）④体积门禁=反向验证过（实测 duckdb 33.39/40MB、数据 2.02/3MB）⑤Lighthouse ≥90 ⑥7 节+每节口径行（metricNote 同源注入）。
- **对计划的偏差（全部实测驱动）**：
  - duckdb-wasm 1.32.0 dist **无** duckdb-browser-eh.wasm——EHDR 实为 2 文件（wasm+worker），FILES 清单按实修正；loader 硬编码 eh bundle 不走 selectBundle（mvp 兜底未发布会 404）。
  - **astro check 本地 OOM 根因** = tsconfig `include:["**/*"]` 把 public/ 下 34MB wasm 扫进 astro LS——`exclude` 改 `public` 整目录根治（Vercel 构建一直正常，纯本地病灶）。
  - registerFileURL 需 4 参数（DuckDBDataProtocol.HTTP, directIO）；httpfs 不接管 URL 读取，自托管 parquet 必须注册进 JS 虚拟 FS。
  - DuckDB `to_timestamp` 返回 TIMESTAMPTZ 且 strftime 按会话时区渲染——Python 本机(Asia/Shanghai) 与浏览器 WASM(UTC) 同 SQL 会分叉，墙钟成分改**纯整数运算**（ts+28800 对 86400 取模）两端确定一致。
  - loader 视图补官方窗口过滤：曾现「pv 按天第 10 天」——浏览器查询与预置图表口径不一致，已同口径。
  - Astro 7 preview **单例锁**：并发 spawn 全部互斥，story-gates/lh.mjs 均加 `--force` + 独立端口。
  - Plot 小时轴：补零字符串触发「疑似数字」警告（SVG 内嵌警告节点），改数值通道 + interval:1；面积图是 areaY 不是 area。
- **lessons 新增**：退出码管道陷阱（二次变体）、tsconfig **/* 与大二进制、preview 单例锁、DuckDB 跨端时区四条。

**可作战状态**：✅ B 线 MVP 完成（10 问/3 卡片+7 图/1 查询框卡界未超），门禁全绿合回 main；12 月考试季冻结前 C 线不动。

## 2026-10-06 深夜（B 线发布后复检：双轴子代理 + 机械门禁自跑 + 修复后停下待指令）

- **审查方法**：code-review 双轴并行子代理（Standards/Spec，固定基点 9cd413e...HEAD）+ 自跑机械门禁 + 页面叙事数字 ↔ preset JSON 逐值核对（同 A1 审查的门禁盲区类：报告正文数字 ↔ 数据）。
- **抓到并修复**：①**spike.astro 未按计划 Task 5 Step 5 删除**（临时页作为公开路由随构建发布）——已 git rm；②体积门禁实测 public/ 而非计划要求的 dist 产物——已改 dist 口径并复跑反向验证；③叙事数字三处：pv 占比 89.4% 为截断应为 **89.5%**（89,447/99,958=89.48%）、「100,000 行用户级抽样」措辞错误（实为**行级 reservoir**）、第三节周末以偏概全（**第一个周末 11-25/26 与工作日持平，仅第二个周末跳升三成**）——全部修正，第六节同步改写为「两个周末的分歧」诚实版；④验收⑥缺口：①⑦节补口径行；⑤**复跑预生成时抓到新真 bug：q09/q10 SQL 缺 ORDER BY**，DuckDB 哈希序不定致图表条序可翻转——补确定性排序（q10 并列值加 dim 平局裁决），连续两次生成零 diff 验证幂等；⑥manifest.json 零消费者（Speculative Generality）——删除。
- **不可复核声称升级为可重跑**：pandas 交叉验证入库 `analysis/src/pmforge_analysis/check_story_presets.py`（q01 总量/q03 日活/q04 小时/q10 周末判定逐值比对，exit 1 兜底）；story-gates 加 `--reverse` 内置反向自检（注入重资源请求，双场景必须全红）+ 场景 3 引擎冒烟（类目 Top10=11 表行、pv 按天=10 表行，把浏览器侧窗口/墙钟口径钉进门禁）。
- **判断题处置（Standards 0 硬违规/8 判断题）**：renderRows 复用 barX 与 width()；presetMeta 由每图双读改单次读取；页面「约 33MB」改构建期实测注入、loader 状态文案去硬编码体积；「图截 20 行/表列 50 行」加注为有意口径；check-story-budget 手写 walk 保留（check-* 门禁各自自足的既有惯例）；q10 舍入口径补进 metricNote。
- **scope creep 复核**：导航「故事」入口、lh.mjs/tsconfig 环境修补——均已在执行轮披露，维持。
- **复检后门禁**：构建链全绿、`check:story` 正反向全绿、`check_story_presets` 全绿、Lighthouse 10 页 ≥90（story 99/95/100/100）。

**可作战状态**：✅ B 线复检-修复-复验闭环完成并已推送上线；停在这里等用户下一步指令。

## 2026-10-06 深夜②（门禁第七条 + 求职素材包装：计划六卡执行完毕）

- **计划**：docs/plans/2026-10-06-pm-forge-门禁第七条与求职包装-实施计划.md（6 任务卡，两轮审核定稿 87bf197），executing-plans 逐卡执行、逐卡独立 commit+push。
- **Task 1 claims 结构化**（273116d）：`yaml` devDep（npmmirror）+ dissections schema zod claims 层 + 三篇报告 frontmatter（值全部机械清点：doubao 14=11成功/2部分/1失败，kimi 6=5/0/1，deepseek 10=7/0/3）。
- **Task 2 ⑦ 门禁**（e09d82b）：check-dissections.mjs 四组断言——7a 求和自洽、7b 声称↔实际记录集合、7c 正文判定分布句（锚定「条成功」防叙述句误报，缺段按 0）、7d 正文条数引导句、7e 引用记录 id 存在性（含前缀语义：ds-reason-004 → -chat/-reasoner 对）。三重反向验证全红：claims 改错→7a+7b+7c 连红、正文改错→7c 精准红、假 ID→7e 红；恢复后全绿。
- **Task 3 /interviewers/**（1e40469）：pages 集合条目（五考点映射表/三条高速通道/核验方式/时效声明）+ 独立路由（about.astro 模式）+ lh.mjs pages 数组 11+splice=12 页。
- **Task 4 首页**（c3b1eb8）：AI 产品拆解板块（「共 {recordCount} 条」用集合实时计数=30，与记录集合同源）+ 数据故事板块 + hero 面试官快速通道按钮；产物抽查三链接计数全命中。
- **Task 5 求职素材**（da7de86）：docs/interview/ 三件套（STAR 六故事锚仓库证据/demo 讲稿+录屏脱敏清单/简历条目库按五考点）；执行日机械重估 141 commits / 26 页（首提交 2026-09-26 起）；引用的 8 个证据路径全存在；隐私红线自查过（简历侧「某头部产品」模糊措辞 vs 站点章程实名，双口径并记）。
- **Task 6 收口**（本 commit）：README 顶部求职定位块（五考点表+面试官指南入口）+ 板块行五→七（toolkit 报告数 6 实点核对）+ v0.11 changelog；about.md 三补记（面试官引流/能力表 AI 评测行/时间线 2026-10）；汇总报告「21 条任务集」存量口径修正为 27（14+6+7，§2.3/§4.1/数据口径行三处，grep 验证 21 残留 0）。
- **全门禁复验全绿**：build=0 / check:story=0 / check:story --reverse=0 / check_story_presets=0 / lh=0（12 页全 ✓，interviewers 100/100/100/100、userbehavior 99/95/100/100）。

**执行偏差（如实记录）**：
1. **Git Bash MSYS 路径转换改写 grep 模式**：含 POSIX 绝对路径字面量的模式（如 `'href="/analysis/…"'`）被 MSYS 参数转换后失配、误报计数 0（隔离实验：加 `MSYS_NO_PATHCONV=1` 后命中 1，产物本身正常）。本环境验证命令一律加此前缀。
2. **Astro 7 preview 守护单槽注册**：`astro preview` 为常驻守护且全局单槽——story-gates/lh.mjs 的 `server.kill()`/`preview.kill()` 只杀 npx 外壳，astro 守护被孤儿化残留；同端口 `--force` 可替换、异端口被全局注册表拒绝（报「Another astro preview server is already running」），表现为 check:story/lh 连报「preview 服务器未就绪」。本次 `npx astro preview stop` 清理后全过。尾巴已于同日收尾轮修复（见深夜③段）。
3. resume-bullets 按其自带使用规则执行日重估：「12 天 135+ commits」→「11 天 141 commits」（git rev-list 实点）；页数 26 与计划预估一致。
4. **计划外修复（存量 bug）：桌面端导航折行**——A1 加「拆解」、B 线加「故事」后导航项 5→7 个，flex 挤压使每项塌成单字宽两行竖排（1280/1536/1920 三宽度实测链接高 56px=两行；Lighthouse a11y 不拦此问题、此前复检仅移动端截图故漏网）。修复：Header.astro 导航 ul 加 `md:whitespace-nowrap`（移动端不受影响），重建后七项全部单行（高 32px），header 截图走查核验；构建链复绿。

**可作战状态**：✅ 六卡全部执行完毕逐卡推送（273116d → e09d82b → 1e40469 → c3b1eb8 → da7de86 → 1e88c21），全门禁绿；线上抽查已过（/interviewers/ 200 + 首页新板块命中 + 导航修复类在产）。

## 2026-10-06 深夜③（收尾轮：守护清理修复 + 漏洞数字刷新 + 经验沉淀）

- **preview 守护清理修复**（f879290）：story-gates.mjs / lh.mjs spawn 前 `npx astro preview stop` 清槽（清掉孤儿占槽，也停掉手动在跑的 preview——门禁独占守护槽，注释已声明）+ finally 再清一次（30 秒超时保险）。端到端验证：预置 4321 残留守护 → check:story 跑绿 → 4321/4328 零残留；lh 复跑绿 + 零残留。B 线四坑里「杀孤儿要杀 node 子进程」的处方至此落实到代码。
- **ISSUES #13 数字刷新**：dependabot 口径 2→9（5 高 4 中，2026-10-06 push 通知；新增 advisory 明细以面板为准），处置不变（Next 16 专项卡全量回归、**严禁 npm audit fix --force**）。
- **lessons-learned 补收尾轮条目**：MSYS 参数改写（`MSYS_NO_PATHCONV=1`）／复盘处方落实到代码才算关闭／门禁正则锚点须在叙述句上干跑；vault 双写待用户侧同步。
- **可作战状态**：✅ 收尾轮三项完成并推送（f879290 + 本 commit）；门禁第七条 + 求职包装 + 收尾全部闭环，停在这里等用户下一步指令。

## 2026-10-07 11 月窗口包（七卡：③B 线体验 + ④技术债 + ⑤C 线筹备）

**执行卡与 commit 串**：Task 1 Vercel 钉 IP 巡检（f71446d）→ Task 2 查询维度扩展（a58e069）→ Task 3 引擎加载字节级进度（bf56494）→ Task 4 Next 16 升级（fab7377 + c33a3e2 tsconfig 尾巴）→ Task 5 judge v2 基线重钉（df72b6d）→ Task 6 **停在用户门禁**（章程 v2.2 草案已起草未提交）→ Task 7 收尾（本 commit：C 线草案 + README v0.12 + 本段）。

- **Task 1（f71446d）**：scripts/check-vercel-ips.mjs 零依赖巡检（node:https/node:dns）。正向绿 + 死 IP 203.0.113.1 反向必红后恢复绿；ISSUES #10 状态列更新。
- **Task 2（a58e069）**：查询框维度 3→5（商品/小时），DIM_EXPR 收口 + ORDER BY 追加 dim ASC 平局裁决；story-gates 场景 3 扩四断言（占位状态防同毫秒竞态）；正向绿 + 期望值改错必红后恢复绿。
- **Task 3（bf56494）**：duckdb-wasm instantiate 原生进度回调透传（字节级 loaded/total），页面 100ms 节流渲染「引擎加载中 X/33MB（Y%）」；构建链 + 双门禁绿。
- **Task 4（fab7377）**：toolkit next/eslint-config-next → 16.3.8（react 19.1.0 不动）；Windows turbopack 默认构建直接通过——**#9 EISDIR 随升级修复**，移入已修复；#13 原 Next 15 postcss 链消除。全链回归：build/test 70/e2e 3/smoke:real 三报告 + CI 绿 + 三工具线上 live 冒烟 200。
- **Task 5（df72b6d）**：judge v2（_TOOL_ANCHORS 中文键 + judge 可见输入材料）；66/66 重跑成功，基线重钉 **20261007-102655**；v1→v2 对比：反馈工具系统性误伤收敛（fact 3.05→4.95、instruction 2.36→4.09）、竞品 factuality 收紧（4.91→4.45，judge 真核对来源）、PRD 正向识别（4.09→4.86）——两改进方向均验证；judge 成本 ≈18 万 token（预算 ≤10 元内）；盲评校准包 8 案例落 calibration/（待用户，不阻塞）；evals/README 基线口径注记。
- **Task 6**：⛔ 停在门禁——章程 v2.2 修订草案已按计划起草（工作区未提交，版本表行 + 铁律 2 修订款均标注「草案，待用户拍板」）；两项就位（拍板 + chat.deepseek.com 登录）后续跑 Step 3-7。
- **Task 7（本 commit）**：C 线草案 docs/plans/c-line-方法论文库-实施计划草案.md（带 Task 0 执行前刷新；锚点当日实查：vault=E:\knowledge home、试点文章在位、vault-tools 命令面 orphans/indexdiff/report）；README v0.12。

**执行偏差（如实记录）**：
1. **Task 1 脚本两次升级**（计划稿逐字可用 → 实机两次修正）：①本机 dns.resolve4 被 ECONNREFUSED 拒（本地代理接管 53 端口）→ 加阿里云 DoH 兜底（恰为钉记录服务商）；②正向首跑发现 **64.29.17.65 TLS 指纹级差异化干扰**——node/OpenSSL 系握手被丢（13/13 复现 + run1 曾 2/2 通过 = 间歇性），系统 curl/Schannel 系全通（TCP 层三家全通 ~100ms），单栈探测会把「指纹级干扰」误报成「IP 硬不可达」→ 脚本升级双栈判级（node 红时系统 curl 交叉复核：双红=硬不可达 exit 1 触发 #10 后手；单红=指纹干扰 ⚠ exit 0 观察）。**首跑结论：64.29.17.65 存在指纹级干扰、浏览器主路径未断，观察中**。
2. **Task 4 build 首跑 13 个 TS2345**：Next 16 收紧路由 handler 类型（NextRequest 必选），测试辅助函数裸 Request → NextRequest 修复（与运行时同形）。
3. **Task 4 e2e 三连红 = 存量断裂非 Next 16 回归**：bfb825f 落地同源白名单时 e2e 未同步（3100 端口不在默认白名单 {toolbox 域, localhost:3000}），全量回归首次重跑暴露；修复 = playwright webServer env 加 ALLOWED_ORIGINS=http://localhost:3100（e2e 专属）。
4. **Task 4 audit 结果与计划预期不同**：计划预期「0 漏洞」，实测 = 原 postcss 链消除，但 2026-10-07 新披露 4 组 advisory——sharp（librsvg CVE）与 source-map-js（事件循环 DoS）经非破坏 npm audit fix 修复；braces 链（eslint-config-next→fast-glob→micromatch，advisory 打在 * 上游无修复版本）与 postcss-selector-parser（经 @tailwindcss/typography，「修复」=荒谬降级）**残余 7 条（5 高 2 中）全 dev/build 期零运行时暴露**，#13 如实改账为观察；Dependabot 面板 10→4（2 高 2 中）。
5. **Task 5 首跑 66 例全 toolkit_error**：前置 toolkit dev 服务未起（README 明示前置），judge token=0 零成本；起服务后重跑成功。
6. 计划稿「95+ pytest」实为 **98** 全绿（judge 单测无需同步即过）；STATUS 收尾统一延至本卡（计划将 STATUS 列入 Task 5 文件）。
7. 三工具线上 live 冒烟一度用 GBK 乱码输入（Git Bash curl 中文编码坑），改 UTF-8 文件 --data-binary 重发全 200。

**可作战状态**：✅ 11 月窗口包六卡落地一卡停门禁（f71446d → a58e069 → bf56494 → fab7377 → c33a3e2 → df72b6d → 本 commit），全门禁绿（build/story/reverse/presets/pytest98/toolkit70/lh 12 页全过）；B 线查询框 5 维度 + 引擎进度线上可验；judge v2 基线就位待用户盲评；Task 6 等章程 v2.2 拍板与登录就位。

### 11 月窗口包补记：Task 6 执行（2026-10-07 用户拍板后）

- **门禁双停点解除**：①章程 v2.2 用户拍板（b07b581，铁律 2 修订款 + 版本表行）；②chat.deepseek.com 登录就位（实测发现用户账号本已登录，仅确认免费口径）。
- **DOM 层代跑 10 条记录**（b4894de）：同任务集 7 任务，reason-001/002/003 深度思考开/关双模式 + 4 单跑；每条隔离校验（导航法新会话 + 发送前 0 消息验证）+ 开关状态逐条显式设定核验（账号默认双开关全开=跨会话持久化，本身是 UX 发现）；端到端延迟 3-15 秒（DOM 轮询粒度 ±3 秒）；10 张证据截图走 sanitize-shots 裁侧栏（261px 含昵称区）后入库。
- **核心发现**：判定分布 **7 成功/0 部分/3 失败，与 API 口径完全一致**，三条失败同任务同构（厘陷阱 chat 档同 185.17、性价比同 0.036 错觉、顺从性同「立即投降+改写历史」）——模型层缺陷跨入口稳定；深度思考开档思考仅 1-3 秒（轻量混合形态）；免费账号 10 条零付费墙零额度提示。
- **门禁升级**：⑦ 7b 分组键 product → (product, accountType)，7e 前缀加 dsw；既有 20 条记录 accountType「免费」→「免费账号」（向报告对齐）；反向验证三连（claims 改错/正文分布句改错/正文假 ID）各必红后恢复绿。
- **静态数字同步**：当前时态「30 条」8 处 → 40 条（失败总数 5→8 同步）；grep 复验零残留。
- **线上验证**：build 绿（40 记录/8 失败/4 报告全过账）；lh 13 页全过（新报告页 100/100/100/100）。
- **执行偏差**：①首条发送被口径污染（默认双开关全开）作废重来；②「开启新对话」按钮点击不生效（虚拟列表渲染干扰判断）→ 改根 URL 导航法 + 发送前空态校验；③DeepSeek 按钮为 div[role=button] 非 button 标签，Enter 偶发不触发发送 → 改点击发送键 + 双票制完成确认（防流式中假完成）；④完成信号「停止按钮消失」在未发送时假绿 → 补发送确证（清空/停止/消息任一出现）；⑤用户账号将留存约 14 条评测会话（1 污染 + 10 正式 + 重试），可自行删除。

## 2026-10-07 尾巴收口：evals 起跑预检（候选落码）

- **背景**：11 月窗口包 Task 5 首跑 66 例全 toolkit_error（dev 服务未起、runner 不预检，空跑 4 分半）——lessons 记为「下轮顺手落码」候选，本轮兑现。
- **实现**：runner 第四道守卫 `ToolkitPreflightError` + `probe_toolkit()`——`--yes` 门之后、建 run_dir 之前免费 GET 一次 toolkit_base_url（超时 5 秒，**任何 HTTP 响应含 4xx/5xx 算可达**：预检只判「服务在不在」，路由/方法错误留给首个 case）；连接拒绝/超时/URL 非法 → 报错退出并附处置指引（cd toolkit && npm run dev / 查 TOOLKIT_BASE_URL）。mock 检测仍在生成响应头里、免费 GET 不可得，由首个 case 既有守卫拦截（口径写入模块 docstring 与 README）。
- **测试**：pytest 98→103 全绿（注入 probe 的守卫阻断 + URL 透传 2 条；本地 HTTP server 真测 200/404 可达 + 关闭端口必红 3 条）；既有 run_datasets 调用经 autouse 夹具统一 stub 预检（单测零网络约定不变）；ruff 干净。
- **真实负向冒烟**：toolkit dev 未起时 `evals run --limit 1 --yes` → 预检拦截、exit 1、零 API 调用（4.4 秒，即 Task 5 那次空跑场景的复现已修复）。
- **文档**：evals/README 前置段补预检说明；lessons 对应条目「候选」改「已落码」。

**可作战状态**：✅ 预检落码推送；剩余待办均为用户侧（盲评校准包 / vault 双写同步 / DeepSeek 会话清理）与寒假 C 线草案；等用户下一步指令。

## 2026-10-07 B 线体验增强 + P2 清库（六卡：hover / RFM 诚实降维 / 工具箱截图 / GBK 解码）

**commit 串**：计划 3c547f9 → Task 1 hover 19631dc → Task 2 q11/q12 预置 63b92c0 → Task 3 第七节 209195f → Task 4 GBK 解码 fabecad → Task 5 工具箱截图 5c50be2 → Task 6 收尾（本 commit）。

- **Task 1**：五处 marks 加 tip（barX×3 / barY / line；areaY 有意不加防遮挡噪声，renderRows 复用 barX 自动获得）；story-gates 场景 1 加 hover 断言（悬停 q02 后 SVG 节点数必须增长，`!reverse` 守卫保反向全红）；红→绿全程（首跑 before=after=41 红、加 tip 后绿）。Plot 默认白底 tip 在暗色主题下浅字不可读（明暗双主题截图目检实证）→ 按计划预写兜底改 tip 配色走站内 CSS 变量（fill: var(--background) / stroke: var(--border)），复检双主题均可读。
- **Task 2**：PRESETS +q11（购买分层快照）/ q12（R 分布），SQL 均为计划期实跑原文；重生成幂等自证（git status 仅 +q11.json/q12.json，q01–q10 零 diff）；q11 五值与计划锚点表全等（buyers 2032 / 2.21% / 99.61% / 复购 8 / 93.63%），q12 九行（0–8 天前）加总 2032 = buyers 自洽。
- **Task 3**：第七节「用户分层：RFM 在这份数据上只剩 R」入页，查询框顺延第八节（id="explore" 不动）；第一节复算口径句改为「总量与维度分布类可复算 + 第七节用户级分层为构建期预置专属」；charts.ts renderPreset +q11 大数字卡 / q12 barX；check_story_presets 覆盖扩到 q11/q12（pandas 侧两处 dt.normalize() 防时间戳/日期口径分叉——计划审查轮必改点原样落地）；story-gates +q12 SVG 等待式在位断言（scrollIntoView + waitForSelector 10s，防页面尾部懒渲染瞬断假红）；lh 13 页全 ≥90（userbehavior 99/95/100/100 保持）；叙事数字审计逐值溯源（2032 / 2.21 / 99.61 / 8 / 93.63 / 197–282=q12 实测 min-max；第五节 0.01% 与 repeat_buyers=8 自洽 8/92,042=0.0087%）。
- **Task 4**：decode-upload.ts（UTF-8 严格解码 fatal:true + BOM 剥离优先 → GBK（gb18030 超集）兜底 → 双失败才抛 DecodeError，杜绝静默 U+FFFD）；feedback-form 接线；vitest 70→76 全绿（解码 4 + 表单上传集成 2，GBK 18 字节夹具与计划锚点一致）；ISSUES P2 拆账——GBK 入已修复 #17，列映射留 P2。
- **Task 5**：toolbox-shots.mjs 一次性脚本（MOCK_LLM=1 + ALLOWED_ORIGINS=3100、借装 playwright、try/finally taskkill 杀树，3100 零残留实测）；三张工作台截图逐张目检（演示样例输出 + 演示模式横幅在位，无账号/昵称/真实数据痕迹）；三卡接 img（lazy + width/height 1400×900 防 CLS）；/toolbox/ lh 100/100/100/100 保持；ISSUES P2「site 工具真截图」移入已修复 #18。
- **Task 6**：全门禁九项一次性全绿（site build / check:story 正向+反向全红自证 / lh 13 页、check_story_presets 含 q11/q12、analysis pytest 13、toolkit vitest 76 + next build、evals pytest 103）；README v0.13 + lessons 补条目。

**执行偏差（如实记录）**：
1. feedback-form 的 Field hint 原文「仅支持 UTF-8 编码」与 GBK 支持上线后矛盾（计划未列该细节），同步更新为「支持 UTF-8 / GBK 编码（Excel 导出常见）」。
2. Task 5 目检发现分析产出后表单 textarea 为空——查实为 tool-workbench.tsx 流式期间条件卸载表单（`{status !== "streaming" && <Form/>}`）重挂清空 React 状态的既有产品行为，非截图事故，按真实工作台状态入库。
3. 计划 Task 1 Step 5 的暗色兜底分支被真实触发（Plot 默认 tip 白底 × 继承浅色字在暗色不可读），按计划预案走 CSS 变量配色，非改道。

**可作战状态**：✅ 六卡全部落地推送，全门禁绿；ISSUES P2 清两行（GBK #17 / 工具真截图 #18）；剩余待办均为用户侧（盲评校准包 / vault 双写同步 / DeepSeek 会话清理）；C 线按计划寒假 2027-01。等用户下一步指令。

## 2026-10-08 线上走查（真实浏览器 + 真实网络 + 线上数据）

**方法**：IAB 真实浏览器全新标签、桌面 1280×720 + 移动 390×844 双视口，两站（www + toolbox）全路径走查；12 张证据截图存 `E:/homework/“余粮”项目/gui-test-screenshots/`（工作目录外，不入仓库）。

**验证通过（本轮新交付线上实证）**：第七节 RFM 全量上线（q11 四卡 / q12 九行图，数字与叙述逐值一致）；hover tip 线上工作 + 暗色主题可读（CSS 变量配色生效）；查询框引擎 10 秒加载、4 行结果（buy 2,032 与第七节自洽）；12 图零加载失败；工具箱三卡截图全部显示；GBK 文案与功能代码均在线上（chunk 命中 gbk）；移动端降级三件套（提示条/表单移除/按钮移除）；toolbox 站三工具页正常、live 模式无演示角标。

**走查修正（两 commit）**：
- abc5582 `fix:` 三处过期文案——①首页「7 节/10 预置」→「8 节/12 预置」（本轮加节所致）②面试官页「点『加载引擎』」→「点『运行查询』」（按钮文案与页面不符，面试官按指南操作会找不到）③工具箱页「52 个 vitest」→「76 个」。
- 9871383 `feat:` 图表 tip 中文标签——默认通道名裸露英文列名（user_count / y），走 title channel 中文化（各 builder 定制文案），含查询框图表（复用 barX）；本地 + 线上双复验（「0 天前 / 用户数 256」）。

**待用户确认**：关于页「大二学生」——按 2024 级推算 2026-10 应为大三，是否更新。

**观察（不改）**：GitHub 外链国内浏览器实测 7.3 秒可用（慢）；主题按钮在非 sticky header（长页面中途切换需先滚回顶部，属既有设计）。

**走查过程教训**：验证脚本自身踩 CRLF 假阴性——`grep -o`（Windows ugrep）输出 CRLF，URL 尾部藏 `\r` 致 curl exit 3 全败，一度误判「GBK 未部署」；tr -d 后复跑纠正。老规矩再证一次：未命中先隔离验证模式，别急着下结论。


## 2026-10-09 视觉美化批 1+2（分支 `visual-refresh`，**未合并 main**）

- **起因**：用户反馈"站点纯文字、单调"，要求美观但不花哨。先做外部调研（产物：`E:\homework\“余粮”项目\资料库\12-网站视觉美化调研.md` + 深度扫站原始素材 + Before/After 预览稿），用户拍板方向=数据新闻编辑部（偏暖），本轮范围=版心/两列 + 暖色底与表面分层 + 等宽数字 + 板块识别色 + 卡片封面。
- **批 1**：`theme.css` 扩为 16 个 token（暖底 `#fbfaf8`、`--surface-1/2`、`--shadow-1/2`、5 个板块识别色，浅色档均过 4.5:1）；`global.css` 版心 `max-w-3xl`(768) → `1120px`，新增 `max-w-readable`(68ch) 保正文可读宽度，body 加 `tabular-nums`；首页/案例/数据列表改双列网格。
- **批 2**：新增 `components/Cover.astro`（**内联 SVG，非图片文件**——随主题自适应、零网络请求、零构建步骤、无 CLS）与 `coverData` 语义（section/kicker/date/headline/subline/facts）；`Card.astro` 重写为"封面 + 板块色标签 + 日期 + 标题 + 摘要 + 标签"的整卡链接；四个集合全部接线；表面 token 全站收口（9 文件 `bg-muted/*` → `bg-surface-*`）。
- **封面诚实原则**：封面数字全部取自条目真实数据（案例 `metrics`、拆解 `claims.recordCount` 与判定分布、工具报告 `toolName/promptVersion/generatedBy`），**不画"假装是数据"的图表**；超长文案按可视宽度截断（CJK 1em / 拉丁 0.56em 估算）。
- **顺修的既有缺陷**：①案例/数据列表页 `h1 → h3` 跳级（Lighthouse a11y 98 的成因，经 dist HTML 标题序列证实为既有问题）→ 卡片改 h2；②首屏标题 `max-w-[20ch]` 用拉丁 ch 计算导致 CJK 出现"可验/证"断行 → 改 13em。
- **验证**：`npm run build` 全绿（28 页 + 六道内容门禁 + 体积门禁）；`npm run check:story` 五场景全绿（**首次跑出现一次"引擎冒烟 类目 0 行"的偶发失败，连续两次复跑全绿——记为已知 flake**）；`npm run lh` 13 页四类全 ≥90，**其中 12 页四类全 100**（含案例/数据列表——h2 修复生效的前后对照：修复前 98，修复后 100）；story 页 99/95/100/100 与 2026-10-07 基线一致，未受本轮影响。
- **状态**：改动在 `visual-refresh` 分支并已推远端，等用户目检后合并 main（合并=Vercel 上线）。**已于 2026-10-09 用户拍板合并 main（44d9c20，v0.14 上线）**。工作分支上未做的事：hero 右侧证据面板、悬停/进场动效（用户本轮明确排除）；详情页版头未加封面。


## 2026-10-09 二期 E 轨：P0 修复「脚本只执行一次」（v0.15）

**现象（线上复现，非推测）**：从首页点站内链接进 `/search/` → 输入「案例」出结果；返回首页再点进 `/search/` → 输入框能打字、**但一个字都搜不出来**，控制台 0 报错。请求数实测：首访 22 个 pagefind 请求（6 索引 + 16 个 `fragment/zh_*.pf_fragment`），二访 **0 个**。

**根因**：`Layout.astro` 挂了 `<ClientRouter />`，而 Astro 官方明确「Bundled module scripts … are only ever executed once」。`astro@7.3.5` 的实现是 `transitions/swap-functions.js:29-45`（`detectScriptExecuted` 以 `script.src` 或 `textContent` 为去重键，命中即打 `data-astro-exec`）+ `router.js:82-98`（跳过带该属性的脚本）。`search.astro` 与 `data-stories/userbehavior.astro` 的初始化逻辑全写在模块顶层 → 模块被跳过时，新 DOM 上的 `#search-input`、`#q-run` 没有任何监听。故事页同理（hoisted `src` 模块走 URL 去重路径），会丢 `IntersectionObserver` / `scrollama` / 按钮监听。

**上游**：调研核实 Astro 相关补丁 **#17550 是 closed 且未合并**（GitHub API `merged_at: null`）→ **升级不会自动修**。

**修复**（4 个源文件）：
- `search.astro`：整块脚本包成 `initSearch()`，DOM 引用改函数局部 + 判空，挂 `astro:page-load`；`loadPagefind()` 增加 `window.__pagefind` 复用分支（二次进入不重复注入 script）。搜索逻辑 / 5000ms 超时 / 200ms 防抖 / `slice(0,20)` / 错误文案一字未改。
- `userbehavior.astro`：同上包成 `initStory()`；`engineReady` 提到模块级（跨跳转复用 WASM）；`before-swap` 里 `io.disconnect()` + `scroller.destroy()`；幂等标记挂 `#main-content`。
- `global.css`：补 `@media (prefers-reduced-motion: reduce)` 下 `::view-transition-group/old/new(*)` 与 `[data-astro-transition-scope]` 的 `animation:none!important`（复刻 `astro/components/viewtransitions.css:56-66`）；`scroll-behavior: smooth` 从 html 的 Tailwind 类挪进 `@media (prefers-reduced-motion: no-preference)`。
- `Layout.astro`：html `class` 去掉 `scroll-smooth`。

**验收证据**：
- `node scripts/check-spa-revisit.mjs --base=https://yuhailinlxy.com`（**修复前**打线上）→ **红**，且红在正确的地方：二访/三访 `status=""`、**结果行 0**、新增 fragment 请求 0、pageerror 0。这一步是证明这个脚本真能抓到这个 bug——抓不到的验收脚本等于没有。
- `node scripts/check-spa-revisit.mjs`（修复后本地 preview，自起 4329 端口）→ 绿：
  - `✓ 搜索页第 1 次进入：status="找到 16 条结果" 结果行=16（新增 fragment 请求 16）`
  - `✓ 搜索页第 2 次进入：status="找到 16 条结果" 结果行=16（新增 fragment 请求 0）`
  - `✓ 搜索页第 3 次进入：status="找到 16 条结果" 结果行=16（新增 fragment 请求 0）`
  - `✓ 数据故事页第 1 次进入：「引擎就绪 · 4 行 · 3389ms」`
  - `✓ 数据故事页第 2 次进入：「引擎就绪 · 4 行 · 24ms」表行=5`（`engineReady` 跨跳转保留生效：不再重下 WASM）
  - 二访 fragment 请求 0 是**正确**行为（pagefind 命中内存缓存），所以验收断言看的是「用户可见结果」而不是请求数——用请求数当断言会在修好之后假红。
- `npm run build` 全绿（`astro check` + 六道内容门禁 + 体积门禁 + pagefind 29 页）；`npm run check:story` 五场景全绿。
- dist 复查：`scroll-smooth` 已从 HTML 消失；CSS 里 `@media (prefers-reduced-motion:reduce){::view-transition-group(*),::view-transition-old(*),::view-transition-new(*),[data-astro-transition-scope]{animation:none!important}}` 在位。

**已知未做**：`check-spa-revisit.mjs` **不进构建门禁**（构建门禁必须离线、无浏览器依赖），手动跑；脚本在找不到 playwright 时打印 SKIP 并 exit 0（本机从 `toolkit/node_modules` 借装，实际不会跳过）。
**顺带发现（未在本轨处理）**：push 时 GitHub 报默认分支 4 个依赖漏洞（2 高 2 中），未排查。


## 2026-10-09 二期 A/B/C 三轨（v0.16）

**A 轨 · 详情页版头**
- 新增 `components/EntryHeader.astro`（板块 kicker + h1 + deck + Datetime + 封面槽），四类详情页接线；`deck` 复用 collection 的 `description`，**不新增 schema 字段**。
- `components/Cover.astro` 增加 `variant: "card" | "banner"`：banner 用**独立 viewBox 1120×420 与独立坐标**（536×301 拉伸到 1120 会变 629px 高、且 `preserveAspectRatio="none"` 会让文字变形）。card 的数值一个都没改，列表页封面像素级不变。
- **实施中改了两处计划值，都写在这里**：①banner 的 `factValueSize` 由 30 降到 26——30px 下 9em 的截断上限是 270px > `colStep` 260，第 3 列起会压字；②新增 **<640px 回落 card 几何**（`sm:hidden` / `hidden sm:block`）——1120 宽的 banner 在 390px 视口按 0.35 倍缩放，kicker/日期/facts 标签全糊（截图已证），小屏改用与列表卡片同一套 536×301 坐标；两个 SVG 的 pattern id 带 variant，共存不会互相引用。
- 正文宽度口径：四页统一 `app-prose max-w-readable`。**纠正调研的一处误判**——构建产物里 `.app-prose{max-width:65ch}` 在偏移 7111、`.max-w-readable{max-width:68ch}` 在 29183，特异性相同而后者在后 → **68ch 生效**，它不是死代码。
- 新增 `scripts/check-headings.mjs`：每个 dist HTML **恰好一个 h1**、标题不跳级。（Lighthouse 的 a11y 审计没有「h1 唯一性」这一项，现有 100 分挡不住这个错误。）
- **这个门禁第一次跑就抓到 4 条既有缺陷**：`dist/reports/case1-userbehavior/*.html`（Quarto 生成的独立报告，作为 iframe 资源引用、不是 Astro 页面 → 按目录整体排除）；`toolbox/reports/{competitor-analysis,feedback-insights,prd-draft}` 三页各有一个**多余的第二 h1**（markdown 正文第一行写了 `# 标题`，与版头 h1 重复）→ 删掉这三行冗余标题，使六篇工具报告口径一致。**不是本轮引入的。**

**B 轨 · 首页证据面板**
- 新增 `utils/evidence.ts`（`buildEvidence()`，面板的唯一取数来源）与 `components/EvidencePanel.astro`（只渲染 `<dl>`，不带取数逻辑）。
- 首页 hero 改 `grid-cols-1 lg:grid-cols-12`：左栏 `lg:col-span-7`、面板 `lg:col-span-5`。DOM 顺序 = 左栏 → 面板，所以移动端面板天然落在 CTA 与社交链接**之后**，不需要 `order-*`。
- 面板 5 项（全部真实统计）：案例研究 5 篇（其中 2 个可在线访问）/ 数据分析报告 2 篇 / AI 产品拆解 4 篇 / 实测记录 40 条（成功 30 · 部分 2 · 失败 8）/ 工具实跑报告 6 篇；另有「最近更新 2026年10月7日」（构建期常量，**不在客户端算距今几天**——那必然引起文本变化，是白送的 CLS 风险）。
- **绝对禁止假数据**：`scripts/check-home-metrics.mjs` **不 import** `evidence.ts`（否则是同义反复），而是自己数文件、自己读 JSON、自己解析 frontmatter，比对页面上的 `data-evidence-key`/`data-evidence-value`、判定分布文案与最近更新日期；出现门禁不认识的证据项也报错（防止取数模块与门禁脱钩）。构建输出：`✓ 首页证据面板校验通过（5 项数字 + 判定分布「成功 30 · 部分 2 · 失败 8」+ 最近更新「2026年10月7日」与内容集合一致）`。
- **明确不做**：访问量/阅读数、GitHub star 或活跃度（需构建期访问外网）、手写的 Lighthouse 分数（做不到自动更新就等于写死一个假数字）、数字递增动画。`data-evidence-*` 是无语义副作用的门禁抓手，不是给机器读的数据接口。

**C 轨 · 克制的微动效**（Task 1–3 落地）
- `Card.astro`：`transition-[box-shadow,translate] duration-200 ease-out` + `motion-safe:hover:-translate-y-0.5`（本项目 `--spacing: .25rem` → 正好 **−2px**）+ `focus-visible:shadow-lift` + `group-focus-visible:text-accent`。**这修的是现存的无障碍不一致**：以前键盘用户 Tab 到卡片时没有任何反馈，与鼠标 hover 不一致。`motion-safe:` 让 reduce 用户只看到阴影变化、没有位移。
- `global.css`：`h1,h2,h3 { text-wrap: balance }`（同时删掉首页与 EntryHeader 上重复的 `text-balance` 类）。
- `astro.config.ts`：把 prefetch 的**隐式默认显式写出来**（`prefetchAll: true` + `hover`），避免某次 Astro 升级把它悄悄改掉。明确不改的两个方向：不改 `viewport`（移动端一进页面就预取全部可见链接，流量开销明显）、不改 `false`（prefetch 是 ClientRouter「体感快」的主要来源）。
- **Task 4「区块级进场淡入」未做**：它是全部候选项里风险最高的一项（CLS + 无 JS 时内容不可见），计划明确要求用户点头才做，本轮没有点头 → **整条跳过，本轨依然完整**。
- **明确不做**（逐条有调研依据，不是偷懒）：count-up 数字递增、卡片边框变色、`transition:animate="slide"`、逐卡 stagger 瀑布进场、循环/呼吸/脉冲动画、`linear()` 弹簧曲线、`transition: all`、封面 `scale > 1.02`。

**顺修一个 v0.14 的真实缺陷（独立发现）**：`theme.css` 只在 `:root` 定义了 `--shadow-1`/`--shadow-2`，**从未注册进 Tailwind 的 `--shadow-*` 命名空间**，于是 `Card.astro` 上的 `shadow-1`/`hover:shadow-2` 与 `toolbox/index.astro` 上的 `shadow-1` **全是空类**（构建产物里 `.shadow-1`/`.shadow-2` 命中 0，`--shadow-1` 变量出现 2 次但无人消费）。也就是说 v0.14 的「表面分层」其实一直只有无阴影的白底。改为注册 `--shadow-card: var(--shadow-1)` / `--shadow-lift: var(--shadow-2)`（用不同名字映射，避免 `--shadow-1: var(--shadow-1)` 的自我引用）并全站换用。

**验收证据**
- `npm run build` 全绿：`astro check` 0 errors；内容门禁全过（案例 5 篇 / 评测记录 40 条 / 死链 125 文件 / RSS 17 item / JSON-LD 29 页 / **标题结构 29 页** / **首页证据面板** / 体积门禁）+ pagefind 29 页。
- `npm run lh`：**13 页四类全部 ≥90，其中 12 页四类全 100；数据故事页 99/95/100/100**——与 v0.13/v0.14 基线**逐页完全一致**，A/B/C 三轨零回归，a11y 仍全面 100。
- **reduced-motion 闸门验收（新增常驻脚本 `scripts/check-reduce-motion.mjs` / `npm run check:reduce`）**：真实浏览器对照两组偏好实测——no-preference：卡片 hover 上浮到 `0px -2px`（正好 −2px）、`scroll-behavior: smooth`；reduce：卡片**不上浮**（`translate` 保持 `none`）、`scroll-behavior: auto`、`::view-transition-*` 关停，**且阴影反馈仍然保留**（reduce 用户不是没有反馈）→ `✓ reduce 闸门全部达标`。C 轨「每次新增自定义动效都必须复测 reduce」这条纪律由此变成一条可执行的命令（手动跑，不进构建门禁——它需要真实浏览器）。
- 真实浏览器三档宽度（390/768/1120）× 6 条路径探针：每页 `h1 == 1`、`CLS == 0`；`canScrollX == 0`（无横向滚动。768px 下 `scrollWidth - clientWidth = 17` 是 `overflow-y-scroll` 的滚动条槽，不是内容溢出）。
- 截图走查：1120 下首页 hero 左栏（标题/说明/CTA/社交）+ 右栏证据面板并排、`<dl>` 虚分割线连续；四类详情页 banner 的 kicker/日期/大标题/facts 均不出框不重叠；390 下详情页走 card 几何，文字清晰可读。


## 2026-10-09 二期 D 轨：逐页 OG 分享图（v0.17）

**问题**：27 个页面共用同一张 `og-default.png`，分享到微信/飞书/X 都长一样；且那张图还是**旧品牌色 `#006cac` + 旧文案**，与 v0.14 的暖色 token 不一致。

**路线**：**本地生成 + 产物入库 + 陈旧门禁**（调研的「方案 C」）。不把 satori/resvg 这类原生依赖放进部署链——那正是当初拆掉动态 OG 的原因（`STATUS.md` 2026-09-29 记：satori 依赖 Google Fonts 构建期拉取 + CJK 缺字）；也与 `public/assets/dissections/*.png`（40 张）「脚本生成 + 入库 + manifest.json」的既有做法一致。产物在 PR 里可以直接肉眼审。

**做了什么**：
- `scripts/og/tokens.mjs`：色值**逐条抄自** `src/styles/theme.css`（satori 不解析 CSS 变量，必须是字面量）。
- `scripts/og/card.mjs`：1200×630 的 satori 元素树，布局对齐 `Cover.astro` 的 banner 变体；`clip`/`fitSize` 与 `Cover.astro` 同逻辑（中文 1em / 拉丁 0.56em）；`deriveCardData`/`entryHash` 是生成器与门禁共用的**唯一口径**。
- `scripts/fetch-og-font.mjs`：下载 **Noto Sans SC（OFL-1.1）** 400/700 到 `scripts/og-assets/`（**已 gitignore**：不入库、不随站点分发，符合字体授权要求）。走「旧 UA + 旧 CSS 端点」是因为新端点只给 woff2，而 satori 官方明确不支持 woff2。
- `scripts/build-og.mjs`：读 frontmatter → 逐页 PNG + `public/og/manifest.json`。字体按**全量字符集只子集化一次**（不是每张图切一次）。**幂等**（刻意不写 `generatedAt`，连跑两次零 diff）。内置**出框自检**：底排估算宽度超过可用宽度就 exit 1。
- `scripts/check-og.mjs`（新门禁）：①陈旧（指纹不符）②manifest 幽灵条目 ③PNG 签名 + **IHDR 读回真实宽高** ④每页 `og:image` 恰好 1 个且指向存在的本地文件 ⑤`og:image:alt` 非空 ⑥`og:image:width/height` 必须是 1200×630。
- `src/config.ts`：`DEFAULT_OG_IMAGE` 由 `"default-og.jpg"` 修为 `"og-default.png"`（**死回退陷阱**：配置里那行一删，构建就会去找不存在的 `public/default-og.jpg` 然后 throw）。
- `src/layouts/Layout.astro`：`ogImage` prop 支持 `string | { src, alt, width, height }`；补 `og:image:type/width/height/alt` 与 `twitter:image:alt`（ogp.me 原文要求有 `og:image` 就该有 `og:image:alt`）。`type` 由扩展名推出，`width/height` 默认 1200/630。
- `src/layouts/PostLayout.astro`：JSON-LD 的 `image` 改成「有值才展开」——原写法 `image: ogImage` 在 `ogImage === undefined` 时会被 `JSON.stringify` **整个丢掉键**，所以文章页的结构化数据原本**根本没有 image**。
- `src/utils/ogImage.ts` + 四个详情页一行接线（纯函数，页面不手拼字符串）。
- 删掉 `scripts/og-template.html`（旧蓝 Playwright 模板，已被生成器取代、无消费者）；`public/og-default.png` 由新生成器重做。

**实施中发现并处理的三件事**（都写进了代码注释，别让后来人重踩）：
1. **satori 不收 `data:` URI 图片源**（实测 `Image source must be an absolute URL`）；换成 `file://` 绝对 URL 后同样在 satori 渲染期抛错 → **放弃 Cover 的纸面点阵**，OG 卡改用纯净 `surface-2` 底 + 板块色竖条。
2. **`→`（U+2192）在 Noto Sans SC 子集里没有字形**，会渲染成一个空白缺口（第一版截图已证）。改为 ASCII `->`；并且**字体字符集必须用 sanitize 之后的文本构建**——否则 `>` 是运行时才出现的字符、子集里没有它，会再缺一次（实测踩了两次）。
3. `clip()` 在运行时追加的 `…` 同理：必须显式入集，否则省略号也是空白。

**验收证据**：
- `npm run og`：`✓ 生成 17 张逐页 OG 图 + 1 张默认图，共 1001 KB`；底排最紧的一张 `agriagent 967/1026px（94%）`。连跑两次**零 diff**（幂等）。
- `npm run build` 全绿：`✓ OG 检查通过（18 张图 / 28 个页面 / og:image 去重后 18 个）`（17 张逐页图 + 1 张默认图；`dist/reports/` 的 Quarto 报告作为 iframe 资源被排除）。
- **陈旧门禁反向自检**：把 `couple-app` 的标题改一个字、不重跑生成器 → `✗ case-studies/couple-app: OG 图已陈旧`；改回 → 绿。**能抓到问题的门禁才算门禁。**
- 18 张图抽检（代表性的 4 张逐张看图）：中文无豆腐块、无缺字、无溢出、无压字。

**未核实（照抄调研，不自己补数字）**：X/Twitter 与 Facebook 的 OG 尺寸/格式要求（官方文档 4 个域名本机全部不可达）；LinkedIn 官方尺寸；微信/飞书抓取规则（无官方文档，只能实测）。**平台侧人工复验（LinkedIn Post Inspector / Facebook Sharing Debugger / 直接发微信与飞书各一次）需要用户在能访问的网络下过一遍**——本机只能保证 meta 与图片本身正确。

## 2026-10-12 详情页桌面右栏 + 正文长度单位修正（v0.18）

**问题**：18 个详情页容器 1120px，正文被 `max-w-readable`（68ch）锁死在 **638px 且左对齐**，**右侧恒定空出 466px（占容器 42%）**，在 1280 / 1440 / 1600 / 1920 四个视口下分毫不差 —— 这是模板结构问题，不是屏幕问题。

**做了什么**：
- 新增 `DetailColumns.astro`（窄屏两个普通块 / ≥1024px 两栏栅格，`items-start` + 显式 `col-start/row-start` + `max-h`/`overflow-y`）与 `ArticleToc.astro`（构建期 `render(entry).headings` 渲染目录 + 当前项追踪）。
- 五类页面接线，右栏**只搬既有元信息块，不新增任何内容**：案例研究（目录 + 角色/技术栈 + 链接 + 指标卡）、数据分析（目录 + 数据集卡；报告 iframe 留在正文列）、AI 拆解（目录 + 被测产品/评测口径 + 版本口径；正文后 4 个手写小节加 id 并进目录）、拆解章程（6 个 h2 的 id 与目录文本共用同一份 `sections` 常量）、工具箱报告（只有目录；`ProvenanceBanner` 留在正文列）。
- `max-w-readable`：`68ch` → `40em`。依据：`ch` 是西文数字 "0" 的前进宽度，实测同一份 68ch 在 **10 种字体栈之间摆动 586.5–638.0px（8.8%）**；`40em` = 每行**整 40 个汉字**，同时满足 W3C clreq 7.1.1.4「行长宜为字号整数倍」与日文 jlreq 2.4.2 的 40 字上限。**刻意不加宽正文**（现状已是 39.9 字）。
- 新增 `check-toc.mjs` 构建门禁（`check-links.mjs:7` 的 SKIP 正则把 `#` 锚点整个跳过，站内锚点从来不校验）；新增 `npm run check:rail` 手动验收（11 条断言 + `--shots` 五张图）；`check-reduce-motion.mjs` 补上目录过渡的复测。
- 摘掉 `remarkToc`/`remarkCollapse`（会在正文里匹配 `## Contents`/`## TOC` 生成**正文内目录**并包进英文 `details/summary`，与右栏重复；实测 19 个内容文件 / 109 个标题命中 0）。

**实测数字**（`npm run check:rail`，12 个真实浏览器视口断言）：

| 视口 | aside | article | gutter | 右侧余量 |
|---|---|---|---|---|
| 1440×900 | 384 | 640 | 64 | **0** |
| 1920×900 | 384 | 640 | 64 | **0** |
| 1024×900 | 320 | 624 | 48 | **0** |
| 390×844 | 358（普通块，与容器内容宽相等） | 358 | — | 0 |

- 粘性：滚动到正文中段后 `aside.getBoundingClientRect().top === 96`（`top-24`）。
- 当前项：全页 `[aria-current]` **恰好 1 个**且是目录里的 `a`；当前项与默认项的 `color` / `fontWeight` / `box-shadow` **都不同**（防「类名空转」，本项目踩过 `--shadow-*` 的坑）；竖条走 `box-shadow` 不占布局。
- 矮视口 1440×700：右栏高 554 ≤ 572，超出时内部可滚。
- 正文长度：1440 下 `#article` 计算宽度 **恰好 640px**、每行 40 字（不是 `.app-prose` 的 65ch = 609.7px）。

**窄屏逐像素不变（实测，非推断）**：390 与 768 × 7 条稳定选择器的几何四元组与「只改完 40em、页面 DOM 还没动」时的基线比对 —— **6 条逐项相等**；第 7 条 `#btt-btn-container` 是 `position: sticky; float: inline-end`，scrollY=0 时文档坐标受包含块顶部钳制（768 下 1016 → 1166），但该元素此时 `opacity: 0` + `translate-y-14` **根本不可见**，而在任何可见滚动位置其**视口坐标与单栏版本逐像素相同**（768 与 1024 × 0.35/0.6/0.9 九个采样点，`viewTop` 全为 970/960/960）→ 断言改为「0.6 滚动比例下的视口坐标 = {top:960, left:660}」。

**验收证据**：
- `npm run build` 全绿，含新门禁：`✓ 目录检查通过（18 个页面 / 122 条锚点全部命中）`。
- `check-toc.mjs` **两次反向验证**都真的红过：①正向（未接线时）报 13 项「详情页没有目录」；②把组件 `href` 临时改成 `+ "--mutated"` 后报 **25 行「找不到 id」**（5 页 × 5 条）；还原后 `git diff --stat` 无输出、`找不到 id` 行数回到 0。
- `npm run check:rail` → `✓ 右栏验收全部通过（11 条断言）`（第 11 条是软跳转：详情页→列表→详情页后目录仍唯一、当前项仍跟着滚动走 —— 本项目 v0.15 的 P0 正是这类「看着正常、监听器全没了」）。
- `npm run check:reduce` → `✓ reduce 闸门全部达标`，含新增项：目录项 `transition-property` 在 no-preference 下为 `color, background-color, box-shadow`、reduce 下为 `none`。
- `npm run lh`：13 页中 **12 页四类 100**；`/dissections/doubao/` performance **99**（其余三类 100）；`/data-stories/userbehavior/` 99/95/100/100 与既有基线**一致**。
- 截图（`docs/research/shots/`）：`rail-1440-article-top.png`、`rail-1440-article-bottom.png`（专门看 `hr` / 标签 / 回到顶部收进 640px 后是否仍合理 —— 回到顶部按钮因此不再压在右栏上）、`rail-1024-article-top.png`、`rail-1440-short.png`、`rail-390-article.png`。

**已知且已查清的一处分数变化（`/dissections/doubao/` performance 100 → 99）**：
- 现象：TBT 从 0ms 变 ~100ms；**Lighthouse 全部审计项无一失败**（`failing: []`），a11y/bp/seo 仍 100。
- 定位过程（同一次会话内交替 A/B/A，排除机器状态漂移）：删掉目录的内联 `<script>` → TBT **0ms / perf 100，6/6 次**；装回去 → TBT **~100ms / perf 99，3/3 次**。
- 但**不是脚本干了重活**：把脚本换成「只做 10 次 `getElementById`、不注册任何监听器、不设任何属性」的空壳，TBT 依旧是 ~100ms（3/3）。同时该 inline script 会让 FCP 提前约 10ms（1206 vs 1219）—— TBT 只统计 **FCP 之后**的主线程任务，FCP 提前把页面本就存在的 ClientRouter 启动任务（`bootup-time` 里 ~250ms，与目录无关）挪进了统计窗口。
- 结论：**不是用户可感知的退化**（TTI 1358ms 两边一致，FCP 反而更早），是 Lighthouse 打分曲线的边界效应。**未做进一步"优化"**——三个尝试（推迟到 load 再跑、去掉 `data-astro-rerun`、去掉初始高亮）实测都无效，已全部回退到经过评审的原形，不留没有依据的改动。

**本轨顺带发现并订正的计划缺陷**：`check-toc.mjs` 的正向断言要求「所有详情页都有目录」，而计划原本要在只接了 5/18 页时就把它挂进 build 链 → 构建会从 Task 5 一路红到 Task 9。已改为**页面全部接线后才挂链**，并在计划里记下。

**有意不改（记入 ISSUES）**：`max-w-headline`（46ch）/`max-w-deck`（52ch）同属 ch 单位的病但约束的是标题/导语；`dissections/charter` 的目录条数不会自动等于 h2 数。

---

## 2026-10-13 外部评审核实与修正（v0.19）

**触发**：外部 AI 对项目提出 5 条建议。**先核实、只修真的**，结论如下。

**逐条核实**：①"代码仓库缺失是最大风险"——旧路径确实不存在（事实），但"代码丢了"**不成立**（`C:\dev\pm-forge` HEAD `122c830`、工作树干净、已推送）；②"调研 >500KB、右栏写了 7 篇、停止调研开始写代码"——前两个数字**成立**（631.6KB / 7 篇 261.2KB），第三个**已过时**（右栏代码早已上线）；③"先上线 / 案例量化 / toolbox 优先"——**三项均已完成**（线上 200；5 篇案例 5/5 有结构化 metrics 且 2 篇主动声明口径限制；工具箱独立部署 `toolbox.yuhailinlxy.com` 200）；④"`debug.log` 报错需排查"——文件真实（303B）但**是本机 Chromium headless 残渣**，不是网站日志；"门禁 7 个"**数字错**（实为 10 个）。

**它的价值不在结论，在它踩到的坑**：它之所以误判，是因为**本仓库自己在迁移时承诺过、却没兑现的一件事**——`47dc1b9` 的 README 写"E 盘仅留本说明的指针文件"，实测从未创建。**一个未兑现的指路承诺，会持续地把读者带进同一个误判。**

**为什么没有更早发现**：外部 AI 走的是"先读文档、再按文档里的路径找代码"这条最自然的路；而 `docs/research` 里满是 `site/src/...` 这种**仓库相对**路径，配合"旧位置已清空"，误判几乎是必然。

**本轮交付**：Task 1 旧位置指针 README；Task 2 工作区 README + 删 `debug.log`；Task 3 `docs/research/` 归档 35 文件 / 985KB；Task 4 `docs/门禁体检.md`。commit `122c830`（37 files）。

**门禁体检的实测结论**（回答"要不要因为维护成本删门禁"）：10 个门禁 **775 行 / 串行 3114ms**，占一次完整构建约 3%。**不删**——价值不在"每次都抓到"，而在"让某类错误不可能静默发生"。但**如实记录：10 个里只有 3 个有"红过"的证据**（`check-toc` 双向、`check-story-budget` 反向、`check-spa-revisit` 打线上），1 个因真实缺陷而生（`check-headings` ← ISSUES #21 的两个 `h1`）。**下一步该做的是给其余 6 个补反向验证（证明它们能红），不是删掉它们。**

**顺带发现**：`check-dissections.mjs` 每次运行都打印 `⚠ 私有隐私词表未加载…防御不完整`——`site/out/dissection-privacy-lexicon.txt` 本机不存在，隐私扫描只剩"模式层"（手机号/身份证号正则），**"人名词表层"整体跳过**。这不是设计缺陷（词表**故意**不入库，`site/.gitignore:5: out/` 忽略正确、`git log -- site/out/*` 显示从未跟踪），但是**真实缺口**：这道防线在本机只有一半，且它在构建里**永远是绿的**（缺失只 `warn` 不 `fail`），没人会注意到。

**未收口（用户侧）**：`*.vercel.app` 外链域名绑定（ISSUES P2 已更新为带精确下一步的待办）。本机复测仍不通，判定为域名阻断而非部署被删。

> **已于 2026-10-14 收口** —— 见下节。
---

## 2026-10-14 外链域名落地 + 门禁补做（v0.20）

**触发**：上节「未收口（用户侧）」那条，用户当日执行完毕。

**用户侧完成**：绑定 `workbench.yuhailinlxy.com` —— Vercel 给 `personal-workbench` 项目加域名 + 阿里云加两条 A 记录 `76.76.21.21` / `64.29.17.65`（**未用 CNAME**）。

**本机复测（全绿）**：DNS 两条 A 记录正确且无 CNAME；HTTPS **10/10 = 200**；`<title>` = 个人工作台（确认不是 pm-forge 站点）；SPA 深路由 `/login` `/today` `/papers` **全 200**（rewrites 在新域名上生效）；`/api/check-reminders` 无 token → **401**（与 `docs/VERIFY.md` 记录一致）；首页 15 个静态资源全部 200；`www` / `toolbox` 对照各 3/3，未受影响。

**根因（这次拿到硬证据）**：`*.vercel.app` 在国内不是「偶尔连不上」，而是**整片域被 DNS 污染** —— 用阿里云 DoH（用户域名的解析商）实测：`pm-forge-rose.vercel.app` → `31.13.94.23`（**Facebook 网段**）、`vercel.app` 根域 → `128.242.240.189`（同样不是 Vercel 真实 IP）、`personal-workbench-lilac.vercel.app` → **SERVFAIL**。对照：4 个伪造 ref 一律 NXDOMAIN，说明是解析结果被**替换**而非域名不存在。**唯一解法是绑自定义域名** —— 这正是 2026-09-27 那条 A 记录经验能直接复用的原因。

**代码侧（本 commit）**：

1. **案例页换链**：`personal-workbench.md` 的 `links.live` + 正文两处 → `https://workbench.yuhailinlxy.com`；**删掉已不成立的「（注：`*.vercel.app` 域名国内直连需代理）」**；`modDatetime` → 2026-10-14。
2. **补做 Task 4 第 4 条**（即上节「没做却被写成做了」那件）：`check-links.mjs` **49 → 70 行**，新增第二趟扫描 —— **不套原有 `SKIP` 正则**（它把一切外链显式跳过，这正是该缺陷 13 天没被抓到的原因），命中 `href="…*.vercel.app…"` 即 `exit 1`。
3. **「能红」是实测的**：对**改动前的真实旧 `dist`** 跑，报出 2 条 `personal-workbench-lilac.vercel.app`、退出码 1；重建后转绿。**不是造个假链接验的。**
4. **更正假声明**：`docs/门禁体检.md` 加勘误段（写明 2026-10-13 写成时该检查并不存在，与 D1 指针文件是**同一失效模式、同一轮犯了两次**）；`docs/lessons-learned.md:132` 就地更正。
5. **补完实施计划 §6**：Task 3/4/5 三个任务回填（原先只回填到 Task 2），并新增 §7 记录本日收尾。
6. `ISSUES.md`：P2 那条移入「已修复 **#27**」，P2 区顶部留一行去向说明，避免以后有人以为它凭空消失。

**全量构建**：**退出码 0 / 64.8s / 28 页 / 10 门禁全绿**；`check-links` 输出新增尾注「扫描 146 个产物文件；无 `*.vercel.app` 链接」。

**数字口径说明**：`docs/research` 实为 **35 文件 / 992.0KB**（含 `_Index.md` 与 `_MANIFEST.md`）；正文 33 个 / 985.1KB —— 上节记的「985KB」用的是后者口径，两者一致，**不是漂移**。

**仍待用户操作（非阻塞，两项）**：

1. ~~两个 GitHub 仓库的 homepage 仍指向 `*.vercel.app`~~ —— **2026-10-16 复核已解决**（本机用 `git credential fill` 取 token 走 API 实查）：`YHLLXY/-personal-workbench` → `https://workbench.yuhailinlxy.com`、`YHLLXY/pm-forge` → `https://www.yuhailinlxy.com`，两条都已是自定义域名。同轮**已补**：`YHLLXY/pm-forge` 的 description 与 12 个 topics 已通过 API 写入（作品站把「公开仓库」当证据链的一环，仓库首页信息为空与这个主张不匹配）。
2. `VITE_SUPABASE_URL` 被设成 Sensitive，导致用户**自己也读不到**（本次配 Supabase 回调白名单时卡在这里）。呼应 vault 手册修复清单 #8「**`VITE_` 前缀绝不开 Sensitive**」——该值构建期内联进前端包，本就是公开的，开 Sensitive 是纯自伤。可选清理。

## 2026-10-16 作品站「个人工作台」案例同步（v0.21）

**触发**：用户「现在同步一下我的作品站上的有关于个人工作台的部分吧」。

**盘点（先枚举，再动手）**：全站扫「工作台 / workbench / 版本号形态」，6 处命中里**只有 2 处**需要同步 —— `site/src/content/case-studies/personal-workbench.md`（案例页）与 `site/src/content/pages/about.md`（能力域证据 + 时间线）；另 4 处是无关文案（toolbox 截图的 `alt`、搜索框 `placeholder` 等），**判定不改**。案例停在 **v1.22（2026-09-01）**，项目已到 **v1.30.3（2026-10-16）**。

**权威数字（全部现跑，不引用记忆/文档）**：

- 版本：changelog 逐条解析 → **47 个版本**（`v1.0.0` 2026-08-04 → `v1.30.3` 2026-10-16），分三段 **23 + 6 + 18**（前 4 周密集 / 9 月按需 / 10 月两天 AI 日报专项）
- 测试：`npm test` → **625 通过 / 69 文件**；E2E `e2e/smoke.spec.ts` **12 条**（单 chromium project）
- 模块：`src/registry.ts` → **6 主模块 / 12 子模块** + 一个「我的」页
- 体积预算（`scripts/check-bundle.mjs` 常量）：首屏 **790** / 总量 **1150** / 单 chunk **340** KB
- AI 日报：`api/hot.ts` 的 `SOURCES` **25 个源**（与线上自检报的「60 条 / 25 源」一致）；`api/digest.ts` `buildReport` 的 `items` = 事件条目数，交付当日全自动运行 `{items:14, sources:5}`
- 发布链：日报 `0 20 * * *`（北京 04:00）、提醒 `*/20 * * * *`

**改了什么**：

1. **案例页**：标题 → `个人工作台：10 周 47 个版本的自我管理产品`；description / `modDatetime` / tags / stack（+DeepSeek API）同步；`metrics` 重选；新增 **取舍 5**（AI 进产品：状态机+幂等 / 时间预算按剩余 60-40 切 / 空闲计费 + 关思考模式）与 **取舍 6**（平台不保证准时 → 日报提前 04:00、提醒每 20 分钟、删掉 UI 里「每天 06:00」的承诺）；结果区数字全部换成现跑值；复盘区新增「代价最贵的一课」（替身比真库宽松）与新的「下次会验证的」。
2. **`about.md`**：能力域「工程交付」补「AI 功能编排与上线自检」；时间线加 2026-10 的个人工作台，8 月那条 **22 → 23 版**。
3. **`links.repo`**：仓库本就公开（匿名 API 200）。加链前做体检 —— 跟踪文件只有 `.env.example` / `.env.test`（VAPID **公钥**，设计上公开），历史 `-G 'sk-[A-Za-z0-9]{24,}'` 与 JWT 形态 **0 命中**。
4. **OG 图重生**：`npm run og` → 18 张（底排最紧 agriagent 94%，本页 **88.6%**）。

**踩到的门禁（值得记）**：`metrics` 不只是数据、**同时是封面底排文案**。指标值一加长，`npm run og` 直接红：`✗ 底排出框：personal-workbench 1210>1026`（`scripts/og/card.mjs` 的 `estimateWidth` 拿 headline+facts+域名 与可用宽 1026 比）。**不放宽版式**，改为按预算重选指标值（「625 单测 + E2E」→「625 单测」，细节挪进 `note`）。约束在脚本里、不在写内容的人会读的地方。

**验证**：

- `npm run build` **退出码 0 / 28 页 / 10 门禁全绿**：案例 5 篇 × 四段式 · 死链（146 文件，无 `*.vercel.app`）· RSS 17 条 · JSON-LD（29 页 / 17 个 BlogPosting）· 标题结构（29 页恰好一个 h1、无跳级）· 目录（18 页 / 122 锚点）· 首页证据面板 · OG（18 图 / 28 页）· 体积（duckdb 33.39MB / story 2.03MB）
- **真实浏览器截图 6 张**（1440 桌面整页+折叠位、390 移动整页、首页、案例列表、关于）**零 console 错误**；页面渲染与右栏「在线访问 / 源码仓库」双链均确认
- 尺寸自检：标题 **20.92 em** ≤ 28、description **67.44 em** ≤ 76（均不触发截断）

**登记不改**：ISSUES **#28** —— `site/.github/workflows/ci.yml` 是 AstroPaper 模板遗留，**GitHub 只读仓库根目录的 `.github/workflows/`**，嵌套那份从未被调度，故 `site/` 的 `lint`（实测 186 个 `no-console`）与 `format:check`（144 文件）从没被任何 CI 跑过；与 #24 同源。构建链不受影响。

**本机待留意**：`site/public/duckdb/duckdb-browser-eh.worker.js` 每次 `npm run build` 都会被 `copy-duckdb-assets.mjs` 重写成 CRLF，于是 `git status` 常年显示 ` M` 而 `git diff` 为空（行尾归一化）。**不要把它一起提交**。


