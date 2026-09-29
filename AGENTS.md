# pm-forge AGENTS.md

> 本文件继承用户知识库准则（E:\knowledge home\AGENTS.md v2.4）的全部红线，冲突时以用户 vault 版本为准。
> 每次会话开工顺序：读本文件 → docs/STATUS.md → docs/plans/ 下一张任务卡。

## 继承的红线（摘要，全文见 vault AGENTS.md）

1. 关键变更先报告方案，用户确认后才动代码（分析→展示→确认→执行）。
2. 禁止撒谎、禁止猜测：可查证事实必须查证（跑命令/读源码/查文档），禁止用二次猜测修正第一次猜测。
3. git 显式 add，禁 add -A；SSH 推送；`feat:/fix:/docs:/style:/refactor:` 前缀；commit 必 push；README 与代码同步更新。
4. 功能验证：build 通过 ≠ 功能正确，必须实际运行验证，禁止"应该可以"。
5. 经验沉淀：lessons-learned.md + vault `40-经验教训/` 双写，缺一不可。

## 仓库特化规则

1. **模块边界**：analysis/toolkit/site/vault-tools/evals 五目录职责见 README；site 与 toolkit 各自独立 Vercel 项目（monorepo 内指定根目录）；跨模块只走文件产物与公开接口。
2. **依赖方向**：analysis/toolkit 产出 → site/content；evals ──HTTP 黑盒调用──→ toolkit（API 合同，禁 import 其内部实现）；evals ──评测计划/基线报告──→ site/content；shared/templates → 被引用。禁止反向依赖与循环依赖。
3. **单文件 >500 行必须拆分**。
4. **任务卡协议**：所有开发工作以 docs/plans/ 任务卡为单元，每卡 ≤1 天；开工勾 checkbox，收工更新 docs/STATUS.md（做了什么/关键决策/遗留/下一步）并 commit+push。
5. **Token 守卫**：LLM 调用前先估算 token 并设上限；调试用最小输入；API key 只存 .env（已 gitignore），永不入库、永不明文入档。
6. **数据纪律**：原始数据只读（data/raw/），加工产物进 data/processed/；数据文件永不入 git。
7. **国内网络**：GitHub 走 SSH；npm 用 npmmirror；模型 API 用国产直连（DeepSeek/GLM）。
