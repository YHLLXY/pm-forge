# pm-forge · 代码地基工程

数据驱动 PM 的个人工程底座：数据分析 → AI 工具 → 作品集站点。

> 2026-09-27 起本仓库位于 `C:\dev\pm-forge`（NTFS）。原位置 `E:\homework\开发\pm-forge` 为 exFAT，
> 其 readlink 语义异常会导致 Next/Astro 构建失败，已整体迁移；E 盘仅留本说明的指针文件。

## 文件结构
- site/ 作品集站点（M3，Astro）
- toolkit/ AI PM 工具箱（M2，Next.js）
- analysis/ 数据分析（M1，uv + DuckDB + Quarto）
- vault-tools/ Obsidian 自动化（M4，只读巡检）
- shared/templates/ 共享模板
- docs/ 设计（specs）、任务卡（plans）、状态（STATUS.md）

## 更新日志
- 2026-09-27 v0.5: M2 启动——仓库迁移 exFAT→NTFS（C:\dev\pm-forge）；toolkit 脚手架（Next 15.5.26 + React 19 + vitest 5），字体改 geist 本地包规避 Google Fonts 被墙
- 2026-09-27 v0.4: 案例一真实数据跑通定稿——脏数据清洗+用户级采样+采样可复现修复（13 测试），报告含 4 条数据支撑结论
- 2026-09-27 v0.3: Quarto 1.10.18 免管理员安装（msiexec /a 提取）；案例一渲染验证通过（HTML 30KB）；sample_events 自动建父目录，10 测试全绿
- 2026-09-26 v0.2: M0 完成（准则/模板/交接协议/vault 门户口）；M1 analysis 模块 ingest/metrics/funnel/rfm 9 测试全绿；案例一报告骨架与复现脚本就绪
- 2026-09-26 v0.1: 仓库初始化，spec 与 M0+M1 计划入库
