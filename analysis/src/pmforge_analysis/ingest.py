"""UserBehavior 数据的校验、抽样与时间处理。

数据纪律（仓库 AGENTS.md 规则 6）：原始数据只读，数据文件不入 git。
"""

from pathlib import Path

import duckdb
import pandas as pd

# UserBehavior 无表头，五列固定（天池 dataset 649 官方说明）
COLS = {
    "user_id": "BIGINT",
    "item_id": "BIGINT",
    "category_id": "BIGINT",
    "behavior_type": "VARCHAR",
    "ts": "BIGINT",
}
VALID_BEHAVIORS = ("pv", "cart", "fav", "buy")


def _read_events(path: str):
    return duckdb.read_csv(path, header=False, columns=COLS)


def validate_userbehavior(path: str) -> dict:
    """统计总行数与非法 behavior_type 行数，用于下载数据的完整性核验。"""
    rel = _read_events(path)
    rows = rel.count("*").fetchone()[0]
    placeholders = ", ".join(f"'{b}'" for b in VALID_BEHAVIORS)
    bad = rel.aggregate(
        f"count(*) FILTER (WHERE behavior_type NOT IN ({placeholders}))"
    ).fetchone()[0]
    return {"rows": rows, "bad_behavior_rows": bad, "columns_ok": True}


def sample_events(
    src: str, dst_parquet: str, n: int = 100_000, seed: int = 42
) -> int:
    """确定性抽样 n 行并写 parquet。返回写出行数。

    优先 duckdb reservoir 采样（REPEATABLE 保证同 seed 可复现）；
    语法不可用时兜底 pandas sample(random_state)（同样确定性）。
    """
    rel = _read_events(src)
    try:
        df = rel.project(
            f"* USING SAMPLE reservoir({n} ROWS) REPEATABLE ({seed})"
        ).df()
    except (duckdb.Error, pd.errors.EmptyDataError):
        df = rel.df().sample(n=n, random_state=seed)
    Path(dst_parquet).parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(dst_parquet, index=False)
    return len(df)


def to_datetime_cn(s: pd.Series) -> pd.Series:
    """unix 秒时间戳 → 上海时区 datetime。"""
    return pd.to_datetime(s, unit="s", utc=True).dt.tz_convert("Asia/Shanghai")
