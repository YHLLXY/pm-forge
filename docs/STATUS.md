# STATUS.md —— 跨会话交接

> AI 连续工作协议核心文件（AGENTS.md 仓库特化规则 4）：每次会话开工先读本文件，收工必更新并 commit+push。

## 当前任务卡

- 计划：docs/plans/2026-09-26-pm-forge-m0-m1-实施计划.md
- 进度：Task 1-9 ✅（Task 1 远端推送、Task 7/10 真实数据步骤挂起待用户）· Task 10 脚本就绪、真实跑通待数据

## 上次会话（2026-09-26 · 第一次实施会话）

**做了什么**：
- Task 1-4（M0 全部本地部分）：仓库骨架、AGENTS.md、8 份模板（6 自建 + 2 克隆自 tianma-if/awesome_product_design）、STATUS/ISSUES/lessons 交接协议；vault 侧门户口 + 索引 + 操作日志已推送（ca6d8ceab）
- Task 5：analysis uv 包（pmforge-analysis 0.1.0）冒烟测试绿
- Task 6：pre-commit + ruff v0.16.9（tag 经 ls-remote 镜像查证）；GitHub HTTPS 被墙 → **仓库级 insteadOf 镜像重写**（gh-proxy），经验双写 vault `40-经验教训/开发环境/`
- Task 7：ingest TDD（validate/sample/to_datetime_cn）——夹具 6 行红灯→实现→`FILTER (WHERE …)`、`.aggregate()` 两处修正→绿灯；**Step 4b 验证结论：duckdb `reservoir(n ROWS) REPEATABLE(seed)` 语法可用且同 seed 确定性成立**
- Task 8：metrics 口径注册表（12 条）+ funnel（conv_rate 整体/step_rate 逐层）+ rfm（中位数二分、8 群、M 代理口径）——9 测试全绿
- Task 9：qmd 报告骨架 + run_case1.sh 管线脚本 + jupyterlab dev 依赖

**关键决策**：
1. funnel 的 step_rate 语义定为：基准层=1.0、空层=0.0、上层 0 人=NaN（测试驱动澄清）
2. RFM 打分用中位数二分（rank 百分位）而非五分位——小样本与真实数据都确定可用；分群只用 R/F
3. Quarto 安装：winget 包 ID 实际为 **Posit.Quarto**（计划中 Quarto.Quarto 不存在），安装中（网络慢）

**遗留**（全部为用户侧或等待项）：
1. 🔴 **用户建 GitHub 私有仓 `YHLLXY/pm-forge`** → 然后 `git remote add origin git@github.com:YHLLXY/pm-forge.git && git push -u origin main`
2. 🔴 **用户从天池 dataset 649 下载 UserBehavior.csv.zip** 解压至 `analysis/data/raw/UserBehavior.csv`
3. ✅ Quarto 已解决：`msiexec /a` 免管理员提取至 `E:	ools\quarto\`（v1.10.18 实测可运行）；PATH 已写入 ~/.bashrc；渲染验证通过——**case1-userbehavior.html 产出（30KB，内容关键词齐全）**；关键配置：`QUARTO_PYTHON` 指向 analysis/.venv/Scripts/python.exe（已固化进 run_case1.sh）
4. vault 仓库 push 时偶发 multi-pack-index 权限警告（commit/push 本身成功，疑似 Obsidian 文件锁，持续观察）

## 下一步（按序）

1. Quarto 装好 → 用夹具 parquet 验证 `quarto render`（Task 9 收尾）
2. 远端 push（Task 1 收尾）
3. 真实数据到位 → Task 10 全链路真实跑通 + 报告结论撰写
4. 写 M2 计划（Next.js 工具箱，选型依据见 资料库/08 调研）

## 可作战状态

❌ 未达成（作品集站点未开始；预计 2027-02 第一版上线后转 ✅）
