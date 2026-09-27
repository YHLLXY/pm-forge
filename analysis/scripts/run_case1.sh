#!/usr/bin/env bash
# 案例一一条命令复现：用户级抽样 → 清洗 → 指标 → 漏斗 → RFM → Quarto 渲染 → 拷贝到 site/content
# 用法：bash analysis/scripts/run_case1.sh
# 前置：raw 数据已就位（analysis/data/raw/UserBehavior.csv，见 Task 7）
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT/analysis"

RAW="data/raw/UserBehavior.csv"
PROCESSED="data/processed/userbehavior_10k_users.parquet"

echo "[1/4] 校验并做用户级抽样（1 万用户全量行为）→ $PROCESSED"
uv run python - "$RAW" "$PROCESSED" <<'PY'
import sys

from pmforge_analysis.ingest import sample_users, validate_userbehavior

src, dst = sys.argv[1], sys.argv[2]
report = validate_userbehavior(src)
print(f"全量校验：{report}")
assert report["columns_ok"], "列结构不符合 UserBehavior 规范"
users, rows = sample_users(src, dst, n_users=10_000, seed=42)
print(f"用户级抽样完成：{users:,} 用户 / {rows:,} 行 → {dst}")
PY

echo "[2/4] 清洗脏数据 + 核心指标与漏斗"
uv run python - "$PROCESSED" <<'PY'
import sys

import pandas as pd

from pmforge_analysis.funnel import compute_funnel
from pmforge_analysis.ingest import clean_window, to_datetime_cn
from pmforge_analysis.rfm import compute_rfm

df = pd.read_parquet(sys.argv[1])
df, dropped = clean_window(df)
print(f"清洗：剔除时间窗外脏数据 {dropped:,} 行（占 {dropped/len(df):.2%}），保留 {len(df):,} 行")
funnel = compute_funnel(df, [["pv"], ["cart", "fav"], ["buy"]])
print(funnel.to_string(index=False))
snapshot = str(to_datetime_cn(df["ts"]).max().date() + pd.Timedelta(days=1))
rfm = compute_rfm(df, snapshot=snapshot)
print(rfm["segment"].value_counts().to_string())
PY

echo "[3/4] Quarto 渲染报告"
# QUARTO_PYTHON 指向 venv 解释器（内含 jupyter）；quarto.exe 由 ~/.bashrc 或系统 PATH 提供
export QUARTO_PYTHON="$REPO_ROOT/analysis/.venv/Scripts/python.exe"
export PATH="$(dirname "$(command -v quarto)" 2>/dev/null || echo /e/tools/quarto/bin):$PATH"
quarto render reports/case1-userbehavior.qmd --to html

echo "[4/4] 产物拷贝到 site/content/analysis/"
mkdir -p ../site/content/analysis/2026-userbehavior-case1
cp reports/case1-userbehavior.html ../site/content/analysis/2026-userbehavior-case1/
cp reports/case1-userbehavior.qmd ../site/content/analysis/2026-userbehavior-case1/
cp -r reports/case1-userbehavior_files ../site/content/analysis/2026-userbehavior-case1/ 2>/dev/null || true

echo "✅ 案例一全链路完成"
