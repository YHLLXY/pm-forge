# analysis · 数据分析模块（M1）

pm-forge 的数据分析模块：UserBehavior 抽样 → 指标体系 → 漏斗/RFM → Quarto 报告。

## 常用命令（在 analysis/ 目录下）

```bash
uv sync          # 按锁文件恢复环境
uv run pytest -q # 跑测试
uv run ruff check .
```

## 结构
- src/pmforge_analysis/ 库代码（ingest/metrics/funnel/rfm）
- tests/ 测试（fixtures/ 含小样夹具）
- data/raw 原始数据（只读，不入库）、data/processed 加工产物（不入库）
- reports/ Quarto 报告源与产物
