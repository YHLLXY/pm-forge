# ISSUES.md

> 问题登记（vault AGENTS.md 12.5）：现象/原因/影响/严重度/状态。已修复的移到「已修复」区并附 commit hash。

## 待处理

| # | 现象 | 原因 | 影响 | 严重度 | 状态 |
|---|---|---|---|---|---|
| # | 现象 | 原因 | 影响 | 严重度 | 状态 |
|---|---|---|---|---|---|
| 1 | 远端未配置 | 等待用户在 GitHub 建仓 YHLLXY/pm-forge | 本地 commit 无法 push | 中 | 待用户操作 |
| 3 | vault 仓库 push 时报 multi-pack-index 权限拒绝（commit/push 本身成功） | 疑似 Obsidian 文件锁或 .git 权限 | 后续 vault 提交可能间歇报错 | 低 | 观察 |
| 2 | 案例一真实数据未到位 | 等待用户从天池 dataset 649 下载 UserBehavior | Task 7/10 的真实数据步骤挂起 | 中 | 待用户操作 |

## 已修复

| # | 问题 | 解决方案 | commit |
|---|---|---|---|
| 4 | winget 装 Quarto 报 1603（InstallScript 无法在非交互会话运行） | 下载 MSI 后 `msiexec /a /qn TARGETDIR=E:	ools\quarto_ext` 免管理员提取，归位 `E:	ools\quarto\`，PATH 写入 ~/.bashrc，`QUARTO_PYTHON` 指向 venv（固化进 run_case1.sh） | Task 9 完成 commit |

