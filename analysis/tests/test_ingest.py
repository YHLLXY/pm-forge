from pathlib import Path

import pandas as pd

from pmforge_analysis.ingest import (
    clean_window,
    sample_events,
    sample_users,
    to_datetime_cn,
    validate_userbehavior,
)

FIXTURE = Path(__file__).parent / "fixtures" / "tiny_events.csv"


def test_validate_flags_bad_behavior():
    # 夹具 6 行：5 行合法 + 1 行 behavior_type=click（非法）
    report = validate_userbehavior(str(FIXTURE))
    assert report["columns_ok"] is True
    assert report["rows"] == 6
    assert report["bad_behavior_rows"] == 1


def test_to_datetime_cn_shifts_utc8():
    s = pd.Series([0])  # 1970-01-01 00:00:00 UTC
    out = to_datetime_cn(s)
    assert out.iloc[0].isoformat().startswith("1970-01-01T08:00:00+08:00")


def test_sample_events_creates_parent_dirs(tmp_path):
    dst = tmp_path / "a" / "b" / "out.parquet"  # 父目录均不存在
    n = sample_events(str(FIXTURE), str(dst), n=4, seed=42)
    assert n == 4
    assert dst.exists()


def test_clean_window_drops_out_of_range_rows():
    # 官方时间窗 2017-11-25 ~ 2017-12-03（上海时区）；时刻经 to_datetime_cn 机算核实
    ts = [
        1511548800,  # 2017-11-25 02:40 +08 → 保留
        1511769600,  # 2017-11-27 16:00 +08 → 保留
        1512384000,  # 2017-12-04 18:40 +08 → 超窗（≥12-04 00:00）剔除
        1511472000,  # 2017-11-24 05:20 +08 → 早于窗口剔除
    ]
    df = pd.DataFrame({"user_id": [1, 2, 3, 4], "behavior_type": "buy", "ts": ts})
    cleaned, dropped = clean_window(df)
    assert dropped == 2
    assert len(cleaned) == 2
    assert set(cleaned["user_id"]) == {1, 2}


def test_sample_users_keeps_full_user_histories(tmp_path):
    # 夹具：用户1 有 3 行（pv/cart/buy）、用户2 有 3 行；抽 1 个用户必须保留其全部行为
    users, rows = sample_users(str(FIXTURE), str(tmp_path / "u.parquet"), n_users=1, seed=42)
    assert users == 1
    assert rows == 3  # 该用户的完整行为序列，而非切出来的 1 行

    users_all, rows_all = sample_users(str(FIXTURE), str(tmp_path / "all.parquet"), n_users=2, seed=42)
    assert users_all == 2 and rows_all == 6


def test_clean_window_counts_future_dirty_rows():
    # 真实数据里发现 ts 打到 2030 年的脏数据
    df = pd.DataFrame(
        {"user_id": [1, 2], "behavior_type": "buy", "ts": [1511548800, 1893456000]}
    )  # 1893456000 = 2030-01-01
    cleaned, dropped = clean_window(df)
    assert dropped == 1
    assert list(cleaned["user_id"]) == [1]
