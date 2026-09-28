# STATUS.md —— 跨会话交接

> AI 连续工作协议核心文件（AGENTS.md 仓库特化规则 4）：每次会话开工先读本文件，收工必更新并 commit+push。

## 当前任务卡

- **M3 正式收工（2026-09-28）**：Task 1-13 + T15 全部完成；**验收①②③全达成**——① Lighthouse 移动端六页 performance 100 / 四类 ≥95；② 四篇案例过四段式+量化检查；③ 用户完成 Vercel 建站 + 域名解析 + 移动端验证（口头确认"验证过没有问题"）
- **全面检查完成**（2026-09-28 下午）：10 维度全过——方法论与结果两份报告见 docs/reviews/；3 项当场修复（RSS 尾斜杠 / Quarto CDN 本地化 / 死代码），postcss 漏洞挂 ISSUES #13 专项
- **M4 vault-tools 已开工**（2026-09-28）：计划 docs/plans/2026-09-28-pm-forge-m4-实施计划.md

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

**M4 vault-tools**：Python + obsidiantools 只读巡检三件套（孤立节点·全路径消歧 / _Index 双向 diff / 体检报告）+ pytest 夹具全绿 + 真实 vault 试跑（git status 零修改验证）+ 报告落 91-MOC（source: claude 标注）。
之后：每月迭代节奏（1 案例/月），2027-06 决策门，2027-08-31 定稿。

## 可作战状态

✅ 达成（site M3 上线收工；M4 进行中）
