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
