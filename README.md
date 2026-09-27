# pm-forge · 代码地基工程

数据驱动 PM 的个人工程底座：数据分析 → AI 工具 → 作品集站点。

## 文件结构
- site/ 作品集站点（M3，Astro）
- toolkit/ AI PM 工具箱（M2，Next.js）
- analysis/ 数据分析（M1，uv + DuckDB + Quarto）
- vault-tools/ Obsidian 自动化（M4，只读巡检）
- shared/templates/ 共享模板
- docs/ 设计（specs）、任务卡（plans）、状态（STATUS.md）

## 更新日志
- 2026-09-26 v0.1: 仓库初始化，spec 与 M0+M1 计划入库
- 2026-09-27 v0.4: 案例一真实数据跑通定稿——脏数据清洗+用户级采样+采样可复现修复（13 测试），报告含 4 条数据支撑结论
- 2026-09-27 v0.3: Quarto 1.10.18 免管理员安装（msiexec /a 提取）；案例一渲染验证通过（HTML 30KB）；sample_events 自动建父目录，10 测试全绿
- 2026-09-26 v0.2: M0 完成（准则/模板/交接协议/vault 门户口）；M1 analysis 模块 ingest/metrics/funnel/rfm 9 测试全绿；案例一报告骨架与复现脚本就绪
