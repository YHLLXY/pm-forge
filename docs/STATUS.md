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
