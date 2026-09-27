# ISSUES.md

> 问题登记（vault AGENTS.md 12.5）：现象/原因/影响/严重度/状态。已修复的移到「已修复」区并附 commit hash。

## 待处理

| # | 现象 | 原因 | 影响 | 严重度 | 状态 |
|---|---|---|---|---|---|
| 7 | toolkit 验收②挂起：本机无 LLM_API_KEY | 用户尚未注册 DeepSeek/GLM key | 每工具 1 份真实报告无法产出（smoke:real 就绪） | 中 | 待用户操作 |
| 8 | toolkit 验收④挂起：未注册自定义域名 | Vercel 分配的 *.vercel.app 国内被墙 | 工具箱与作品集无法国内直连访问 | 中 | 待用户操作 |
| 9 | `next build --turbopack` 在 Windows 报 EISDIR readlink（styled-jsx） | turbopack 构建在 Windows 的解析问题；webpack 构建正常 | 无（构建脚本已固定用 webpack；dev 用 turbopack 不受影响） | 低 | 已绕过（README 注明） |
| 2 | vault 仓库 push 时报 multi-pack-index 权限拒绝（commit/push 本身成功） | 疑似 Obsidian 文件锁或 .git 权限 | 后续 vault 提交可能间歇报错 | 低 | 观察 |

## P2 演进项（v1 明确不做，非缺陷）

| 项 | 说明 |
|---|---|
| 反馈 CSV 列映射与 GBK 自动转码 | 目前仅支持 UTF-8 按行导入；Excel 导出的 GBK 文件需另存为 UTF-8 |
| Supabase 持久化 | 运行历史目前仅 localStorage（每工具 10 条）；云端同步待用户量需求 |
| 反馈工具上传/导出图表 | 优先级矩阵为 CSS 网格，ECharts 可视化待 v2 |
| 演示模式样例可配置 | fixtures 目前写死在代码中 |
| vault-tools（M4） | 独立里程碑，未开工 |

## 已修复

| # | 问题 | 解决方案 | commit |
|---|---|---|---|
| 6 | duckdb reservoir 采样在并行扫描下同 seed 两次结果漂移（100.9 万 vs 101.7 万行） | 采样改独立单线程连接（`SET threads TO 1`），实测两次完全一致（1,021,043 行） | 5909509 |
| 5 | 抽样数据出现 2030 年时间戳等窗外脏数据；行级抽样稀释用户级指标 | clean_window 按官方窗口剔除 566 行；改用户级抽样 1 万用户全量行为 | 2d5b38d |
| 4 | winget 装 Quarto 报 1603（InstallScript 无法非交互运行） | MSI 下载后 `msiexec /a` 免管理员提取至 E:\tools\quarto，PATH 写入 ~/.bashrc | 56de970 |
| 3 | E 盘 exFAT 导致 Node 生态构建必然失败（fs.readlink 对普通文件返回 EISDIR -4068，NTFS 对照组为 EINVAL；Next/Astro 均受影响） | 仓库整体迁移至 C:\dev\pm-forge（NTFS），旧位置留指针 README；数据完整性验证后清理 | 47dc1b9 |
| 1 | pre-commit 首次安装被墙（GitHub HTTPS 不可达） | git config --local url.insteadOf 重写为 gh-proxy 镜像 | 0f8d9d7 |
