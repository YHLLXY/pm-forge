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


# 官方文档窗口：2017-11-25 ~ 2017-12-03（上海时区）；端点左闭右开
DATASET_WINDOW = ("2017-11-25 00:00:00", "2017-12-04 00:00:00")


def clean_window(
    df: pd.DataFrame, start: str = DATASET_WINDOW[0], end: str = DATASET_WINDOW[1]
) -> tuple[pd.DataFrame, int]:
    """剔除时间窗外的脏数据行，返回 (清洗后 df, 剔除行数)。

    真实抽样中发现 ts 落在 2030 年等窗口外的脏数据（见 ISSUES #5）。
    """
    dt = to_datetime_cn(df["ts"])
    start_ts = pd.Timestamp(start, tz="Asia/Shanghai")
    end_ts = pd.Timestamp(end, tz="Asia/Shanghai")
    mask = (dt >= start_ts) & (dt < end_ts)
    return df.loc[mask].copy(), int((~mask).sum())


def sample_users(
    src: str, dst_parquet: str, n_users: int = 10_000, seed: int = 42
) -> tuple[int, int]:
    """用户级确定性抽样：抽 n_users 个用户，保留其全部行为行。

    为什么不用 sample_events（行级）：行级抽样会把每条行为摊到不同用户，
    稀释用户级指标（漏斗 UV、复购率）。用户级抽样保留完整行为序列。
    返回 (用户数, 行数)。
    """
    rel = _read_events(src)
    try:
        rel.create_view("t")
        df = duckdb.sql(
            f"""
            WITH sampled AS (
                SELECT user_id FROM (SELECT DISTINCT user_id FROM t)
                USING SAMPLE reservoir({n_users} ROWS) REPEATABLE ({seed})
            )
            SELECT t.* FROM t JOIN sampled USING (user_id)
            """
        ).df()
    except duckdb.Error:
        # 兜底：按 hash(user_id) 取模的系统抽样（确定性；步长由实际用户总数决定）
        total_users = duckdb.sql("SELECT count(DISTINCT user_id) FROM t").fetchone()[0]
        stride = max(1, total_users // n_users) if n_users else 1
        df = duckdb.sql(f"SELECT * FROM t WHERE hash(user_id) % {stride} = 0").df()
    Path(dst_parquet).parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(dst_parquet, index=False)
    return df["user_id"].nunique(), len(df)
