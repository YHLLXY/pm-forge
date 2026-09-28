# STATUS.md —— 跨会话交接

> AI 连续工作协议核心文件（AGENTS.md 仓库特化规则 4）：每次会话开工先读本文件，收工必更新并 commit+push。

## 当前任务卡

- M3 计划（docs/plans/2026-09-28-pm-forge-m3-实施计划.md）Task 1-13 + T15 **全部完成**（2026-09-28）
- **验收①达成**：Lighthouse 移动端六页全部 performance 100 / 四类 ≥95（npm run lh 可复验）
- **验收②达成**：四篇案例全过四段式+量化检查（构建期强制）；三份工具精选报告已发布
- **验收③待收尾**：代码就绪，等用户完成 Vercel 建站 + 域名解析（步骤见本文件「下一步」）

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

**遗留（用户侧）**：
1. **Vercel 建站**：Import pm-forge 仓库 → Root Directory = `site` → Deploy
2. **域名**：Vercel 加 yuhailinlxy.com + www；阿里云加 4 条 A 记录（@ 与 www × 76.76.21.21 / 64.29.17.65，同 M2 方案）
3. **内容终审**：关于页、红岩复盘、三份工具报告通读确认（隐私门）
4. 小挑"二等"证书归属核实后回填 AgriAgent 案例的【待补充】

## 下一步

用户完成部署三步 → 我做连通性验证（20×2 循环 + 三页 curl）→ 手机流量终验（验收③）→ M3 全收口。
之后：每月迭代节奏（1 案例/月），2027-06 决策门，2027-08-31 定稿。

## 可作战状态

🟡 半达成（站点代码与验收①②就绪；域名解析完成后转 ✅）
