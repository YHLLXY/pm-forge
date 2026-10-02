# evals — 评测体系（A2 toolkit 门禁 + A1 拆解任务集）

pm-forge 二期主线 A：评测体系两条子线。
- **A2 toolkit 评测门禁**：为 toolkit 三工具（竞品分析 / 用户反馈洞察 / PRD 草稿）建 evals 门禁。
设计文档：`docs/specs/2026-09-29-pm-forge-二期评测线与交互报告设计.md` §3；实施计划：`docs/plans/2026-09-29-pm-forge-a2-evals-实施计划.md`。

## 架构一句话

HTTP 黑盒调用 toolkit 的 `POST /api/tools/{id}` 合同 → **确定性结构检查**（代码判定输出契约遵守）→ **LLM-as-judge 四维评分**（DeepSeek、温度 0、model 字符串留痕）→ **人工校准**一致率 → 基线回归对比。

## 快速开始

```bash
cd evals
uv sync
cp .env.example .env   # 填入 LLM_API_KEY（永不入库）
uv run pytest -q
```

## 用法

```bash
uv run evals validate                 # 校验评测集（零调用）
uv run evals run --dry-run            # 查看评测计划与成本上界
uv run evals run --limit 2 --yes      # 每工具冒烟 2 条（真实调用）
uv run evals run --yes                # 全量真实运行（66 case）
uv run evals run --tool prd-draft --yes   # 只跑指定工具
```

前置：toolkit 本地可访问（`cd toolkit && npm run dev`，且其 `.env` 配置真实 LLM key——
`X-PMForge-Mode: mock` 时 run 会拒绝执行）。

## 目录

- `datasets/` 三工具评测集 JSONL（入 git，无隐私）
- `artifacts/` 运行产物（gitignore，永不入库）
- `baseline/` 基线指针与快照（入 git）
- `calibration/` 人工校准评分（入 git）

## 安全契约

- 评测集与校准数据均为自造真实任务，无隐私，可入公开仓。
- 真实评分必须 `--yes` 显式确认成本；`--dry-run` 先看计划（先估后跑）。
- toolkit 处于 mock 模式时拒绝真实评分（`--allow-mock` 显式豁免）。

## A1 子线（AI 产品拆解任务集）

`dissection/`：豆包主评 + Kimi/DeepSeek 对照的实测任务集与执行协议（19 条，全部合成素材）。见 `dissection/README.md`；章程与实施计划见 `docs/specs/2026-10-02-pm-forge-A1拆解评测章程.md` 与 `docs/plans/2026-10-02-pm-forge-A1拆解板块-实施计划.md`。
