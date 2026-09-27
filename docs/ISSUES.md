# ISSUES.md

> 问题登记（vault AGENTS.md 12.5）：现象/原因/影响/严重度/状态。已修复的移到「已修复」区并附 commit hash。

## 待处理

| # | 现象 | 原因 | 影响 | 严重度 | 状态 |
|---|---|---|---|---|---|
| # | 现象 | 原因 | 影响 | 严重度 | 状态 |
|---|---|---|---|---|---|
| 2 | vault 仓库 push 时报 multi-pack-index 权限拒绝（commit/push 本身成功） | 疑似 Obsidian 文件锁或 .git 权限 | 后续 vault 提交可能间歇报错 | 低 | 观察 |
| 2 | 案例一真实数据未到位 | 等待用户从天池 dataset 649 下载 UserBehavior | Task 7/10 的真实数据步骤挂起 | 中 | 待用户操作 |

## 已修复

| # | 问题 | 解决方案 | commit |
|---|---|---|---|
| 6 | duckdb reservoir 采样在并行扫描下同 seed 两次结果漂移（100.9 万 vs 101.7 万行） | 并行 CSV 扫描的行序受线程竞争影响，REPEATABLE 不保证跨运行复现 | 报告数字不可复现 | 中 | 已修复：采样改独立单线程连接，实测两次完全一致（1,021,043 行） |
| 5 | 抽样数据出现 2030 年时间戳等窗外脏数据；行级抽样稀释用户级指标 | 原始数据自带脏行；行级抽样把行为摊到不同用户 | 时间范围穿帮、漏斗/复购率失真 | 中 | 已修复：clean_window 按官方窗口剔除 566 行；改用户级抽样 1 万用户全量行为（2d5b38d） |
| 4 | winget 装 Quarto 报 1603（InstallScript 无法在非交互会话运行） | 下载 MSI 后 `msiexec /a /qn TARGETDIR=E:	ools\quarto_ext` 免管理员提取，归位 `E:	ools\quarto\`，PATH 写入 ~/.bashrc，`QUARTO_PYTHON` 指向 venv（固化进 run_case1.sh） | Task 9 完成 commit |

