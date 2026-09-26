from pathlib import Path

import pandas as pd
from pmforge_analysis.ingest import sample_events, to_datetime_cn, validate_userbehavior

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
