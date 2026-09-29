# calibration — 人工校准评分

`human-scores.csv` 存放**盲评**的人工分数，与同 run 的模型分对比算一致率（spec 验收 ④）。

## CSV 格式

```csv
case_id,dimension,score,rater,note
comp-001,factuality,4,ai-blind,按锚点盲评
comp-001,structure,3,ai-blind,结构完整
```

- `case_id`：results.jsonl 里的案例 id，且该案例必须是 ok 状态
- `dimension`：factuality / structure / actionability / instruction 四选一
- `score`：1-5 整数
- `rater`：评分者标识（如 ai-blind / user），可空
- `note`：一句话理由，可空

## 盲评流程（先盲评、后对比）

1. 从 results.jsonl 抽样（三工具覆盖、含边界案例），**只读 output 原文**；
2. 对照 rubric 锚点独立打分填入 CSV（此时不看 judge 分数）；
3. `uv run evals calibrate --run <run_id>` 生成一致率与分歧清单；
4. 分歧（差 >1 分）逐条复核，必要时用户以 `rater=user` 追加行。
