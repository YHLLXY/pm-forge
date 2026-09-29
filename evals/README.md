# evals — toolkit 评测门禁（A2）

pm-forge 二期主线 A2：为 toolkit 三工具（竞品分析 / 用户反馈洞察 / PRD 草稿）建 evals 门禁。
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

## 目录

- `datasets/` 三工具评测集 JSONL（入 git，无隐私）
- `artifacts/` 运行产物（gitignore，永不入库）
- `baseline/` 基线指针与快照（入 git）
- `calibration/` 人工校准评分（入 git）

## 安全契约

- 评测集与校准数据均为自造真实任务，无隐私，可入公开仓。
- 真实评分必须 `--yes` 显式确认成本；`--dry-run` 先看计划（先估后跑）。
- toolkit 处于 mock 模式时拒绝真实评分（`--allow-mock` 显式豁免）。
