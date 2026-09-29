# lessons-learned.md

> 项目专属经验（vault AGENTS.md 第十六节）：每次 commit 后自问"有没有值得记录的经验"；有则按 问题描述→根因→解决方案→如何避免 格式追加，并双写 vault `40-经验教训/`。

（暂无条目）

## 2026-09-26 pre-commit 拉取钩子仓库被墙

- **问题**：`pre-commit run` 卡在 `unable to access 'https://github.com/astral-sh/ruff-pre-commit/'`（GitHub HTTPS 443 超时）。
- **根因**：pre-commit 底层用 `git clone` 拉取钩子仓库，走 GitHub HTTPS，与 vault AGENTS.md 记录的"GitHub 不稳定"同源。
- **解决方案**：git URL 重写走镜像——`git config --local url."https://gh-proxy.com/https://github.com/".insteadOf "https://github.com/"`（仅本仓生效，SSH 推送不受影响）。会话级临时方案可用 `GIT_CONFIG_COUNT=1` 环境变量注入。
- **如何避免**：凡 `git clone`/工具内部克隆 GitHub HTTPS 的场景（pre-commit、uv 缓存、模板下载），一律配 insteadOf 镜像；配置写进新仓库的初始化清单。

## 2026-09-29 evals 门禁：通过率分母口径与 judge 盲区

- **问题**：①基线报告里 must_include 通过率显示 18%，人工复核四条案例明明全部命中；②judge 把反馈工具的"忠实汇总 6 条重复反馈"判成幻觉（6 条数量无来源），竞品报告一处真正的凭空断言反而是 judge 抓到的。
- **根因**：①不同案例的检查项集合不同（must_include 只在 4 个案例上存在），聚合却除以了全部 ok 案例数——分母口径错误稀释了真实通过率；②judge 提示词的 rubric 锚点按 Markdown 证据链报告写，且只看输出不看输入——对 JSON 契约工具系统性误伤（锚点错位），对"忠实去重合并"类行为无法归因（无输入上下文）。
- **解决方案**：①聚合改为按检查项存在口径（分母=该检查出现的案例数），并抽出 `_summarize`/`rebuild_summary`——原始 results.jsonl 是唯一事实源，修口径后从原始行重建 summary，不用重跑真实评测；②rubric 按工具定制锚点 + judge 输入一并送上（v2 已立项记录）；judge 偶发畸形 JSON（evidence 内英文双引号破坏 JSON）用"提示词禁止 + JudgeError 带更正提示重试一次"双保险兜住。
- **如何避免**：任何"通过率/均分"聚合动手前先问"这个统计项在每个被统计对象上都存在吗"；LLM 评分必须做盲评校准——**分歧的模式比一致率数字更重要**，它定位的是评分器的错位而非被评者的问题；评分链路里 LLM 的输出永远是"可能畸形的"，解析层必须有重试与显式失败路径。
