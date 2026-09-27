import pandas as pd

from pmforge_analysis.rfm import compute_rfm


def make_buy_df():
    # snapshot=2026-01-01；三个用户的最近购买时间依次变远
    return pd.DataFrame(
        {
            "user_id": [1, 1, 2, 3],
            "behavior_type": ["buy", "buy", "buy", "buy"],
            "ts": [1767129600, 1767043200, 1765401600, 1763482800],
        }
    )


def test_rfm_frequency_and_proxy():
    out = compute_rfm(make_buy_df(), snapshot="2026-01-01")
    row1 = out[out.user_id == 1].iloc[0]
    assert row1["frequency"] == 2
    assert out["monetary_proxy"].sum() == 4  # 代理口径 = 购买行数


def test_rfm_recency_ordering():
    out = compute_rfm(make_buy_df(), snapshot="2026-01-01").set_index("user_id")
    # 越近的用户 recency 越小（相对关系断言，不硬编码日期差）
    assert (
        out.loc[1, "recency_days"] < out.loc[2, "recency_days"] < out.loc[3, "recency_days"]
    )
    assert (out["recency_days"] > 0).all()


def test_rfm_segment_of_most_recent_frequent_user():
    out = compute_rfm(make_buy_df(), snapshot="2026-01-01")
    row1 = out[out.user_id == 1].iloc[0]
    assert row1["segment"] in {
        "重要价值客户",
        "重要保持客户",
        "重要发展客户",
        "重要挽留客户",
    }
    assert set(out["segment"]).issubset(
        {
            "重要价值客户",
            "重要保持客户",
            "重要发展客户",
            "重要挽留客户",
            "一般价值客户",
            "一般保持客户",
            "一般发展客户",
            "一般挽留客户",
        }
    )
