# lessons-learned.md

> 项目专属经验（vault AGENTS.md 第十六节）：每次 commit 后自问"有没有值得记录的经验"；有则按 问题描述→根因→解决方案→如何避免 格式追加，并双写 vault `40-经验教训/`。

（暂无条目）

## 2026-09-26 pre-commit 拉取钩子仓库被墙

- **问题**：`pre-commit run` 卡在 `unable to access 'https://github.com/astral-sh/ruff-pre-commit/'`（GitHub HTTPS 443 超时）。
- **根因**：pre-commit 底层用 `git clone` 拉取钩子仓库，走 GitHub HTTPS，与 vault AGENTS.md 记录的"GitHub 不稳定"同源。
- **解决方案**：git URL 重写走镜像——`git config --local url."https://gh-proxy.com/https://github.com/".insteadOf "https://github.com/"`（仅本仓生效，SSH 推送不受影响）。会话级临时方案可用 `GIT_CONFIG_COUNT=1` 环境变量注入。
- **如何避免**：凡 `git clone`/工具内部克隆 GitHub HTTPS 的场景（pre-commit、uv 缓存、模板下载），一律配 insteadOf 镜像；配置写进新仓库的初始化清单。
