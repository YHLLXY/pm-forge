# vault-tools

pm-forge M4：Obsidian vault 只读巡检三件套（孤立节点 / 索引双向 diff / 体检报告）。

> 骨架版——完整用法、安全契约与设计决策在 Task 8 收口；
> 实施计划见 `docs/plans/2026-09-28-pm-forge-m4-实施计划.md`。

**安全契约（先读）**：本工具对 vault **永远只读**；所有输出只写到 `out/`（已 gitignore），
绝不写入 vault，绝不把真实 vault 数据提交进本公开仓库。
