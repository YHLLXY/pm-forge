"""RFM 用户分层。

口径与局限（引用 metrics.METRICS）：
- R = 快照与最近一次购买的自然日差（上海时区日期归一化，越小越近）。
- F = 时间窗内购买行为行数。
- M = UserBehavior 无金额字段，以 F 代理（monetary_proxy），结论引用时须注明。
- 打分为中位数二分（rank 百分位 ≥0.5 记 1 并列取高），分 8 群；
  分群只用 R/F 两维，M 代理口径不参与命名。
"""

import pandas as pd

from pmforge_analysis.ingest import to_datetime_cn


def _median_high_score(series: pd.Series, better: str) -> pd.Series:
    """按 rank 百分位与中位数二分：1=优于中位，0=不优于中位。

    better="low" 表示数值越小越好（如 R），"high" 表示越大越好（如 F）。
    """
    pct = series.rank(pct=True)
    if better == "low":
        return (pct <= 0.5).astype(int)
    return (pct >= 0.5).astype(int)


def compute_rfm(df: pd.DataFrame, snapshot: str) -> pd.DataFrame:
    """计算 RFM 并分 8 群。

    Args:
        df: 至少含 user_id、behavior_type、ts 的事件级数据（ts 为 unix 秒）。
        snapshot: 快照日期字符串（如 "2026-01-01"），按上海时区解释。

    Returns:
        DataFrame（每用户一行），列：user_id / recency_days / frequency /
        monetary_proxy / r_score / f_score / m_score（0 或 1，1=优于中位）/ segment。
    """
    snapshot_ts = pd.Timestamp(snapshot, tz="Asia/Shanghai")
    buys = df.loc[df["behavior_type"] == "buy", ["user_id", "ts"]].copy()
    if buys.empty:
        return pd.DataFrame(
            columns=[
                "user_id",
                "recency_days",
                "frequency",
                "monetary_proxy",
                "r_score",
                "f_score",
                "m_score",
                "segment",
            ]
        )
    buys["buy_date"] = to_datetime_cn(buys["ts"]).dt.normalize()

    last_buy = buys.groupby("user_id")["buy_date"].max()
    freq = buys.groupby("user_id")["ts"].count()

    out = pd.DataFrame({"frequency": freq})
    out["monetary_proxy"] = freq  # M 代理口径 = 购买行数
    out["recency_days"] = (snapshot_ts.normalize() - last_buy).dt.days
    out = out.reset_index()

    out["r_score"] = _median_high_score(out["recency_days"], better="low")
    out["f_score"] = _median_high_score(out["frequency"], better="high")
    out["m_score"] = out["f_score"]  # M 为 F 的代理，分布相同

    segment_map = {
        (1, 1): "重要价值客户",
        (0, 1): "重要保持客户",
        (1, 0): "重要发展客户",
        (0, 0): "一般挽留客户",
    }
    out["segment"] = [
        segment_map[(r, f)] for r, f in zip(out["r_score"], out["f_score"], strict=True)
    ]
    return out
