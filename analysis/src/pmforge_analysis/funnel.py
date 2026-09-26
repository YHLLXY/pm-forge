"""转化漏斗计算（UV 口径）。

stages 为逐层行为集合，如 [["pv"], ["cart", "fav"], ["buy"]]：
同层内多个行为视为"或"关系（满足任一即算到达该层）。
"""

import pandas as pd


def compute_funnel(df: pd.DataFrame, stages: list[list[str]]) -> pd.DataFrame:
    """计算逐层漏斗。

    Args:
        df: 至少含 user_id、behavior_type 两列的事件级数据。
        stages: 漏斗层级，每层是 behavior_type 的"或"集合。

    Returns:
        DataFrame，列：stage（层号）、behaviors（行为并集展示）、
        users（该层 UV）、conv_rate（相对第 0 层的整体转化率）、
        step_rate（相对上一层的逐层转化率；第 0 层与上一层为空时为 NaN）。
    """
    rows: list[dict] = []
    first_users: int | None = None
    prev_users: int | None = None
    for i, behaviors in enumerate(stages):
        users = int(df.loc[df["behavior_type"].isin(behaviors), "user_id"].nunique())
        if i == 0:
            first_users = users
            step_rate = 1.0  # 基准层恒为 100%
        else:
            step_rate = float(users / prev_users) if prev_users else None
        conv_rate = (
            float(users / first_users) if first_users not in (None, 0) else None
        )
        rows.append(
            {
                "stage": i,
                "behaviors": "+".join(behaviors),
                "users": users,
                "conv_rate": conv_rate,
                "step_rate": step_rate,
            }
        )
        prev_users = users
    return pd.DataFrame(rows)
