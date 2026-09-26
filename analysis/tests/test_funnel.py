import pandas as pd
import pytest
from pmforge_analysis.funnel import compute_funnel


def make_df():
    # 用户1: pv→cart→buy；用户2: pv→buy；用户3: 仅 pv
    return pd.DataFrame(
        {
            "user_id": [1, 1, 1, 2, 2, 3],
            "behavior_type": ["pv", "cart", "buy", "pv", "buy", "pv"],
        }
    )


def test_funnel_uv_counts_and_rate():
    out = compute_funnel(make_df(), [["pv"], ["cart", "fav"], ["buy"]])
    assert list(out["users"]) == [3, 1, 2]
    # conv_rate 口径：相对第 0 层的整体转化率
    assert out["conv_rate"].iloc[1] == pytest.approx(1 / 3)
    assert out["conv_rate"].iloc[2] == pytest.approx(2 / 3)


def test_funnel_step_rate_against_previous_stage():
    out = compute_funnel(make_df(), [["pv"], ["cart", "fav"], ["buy"]])
    # step_rate 口径：相对上一层（cart 用户里最终购买的占比）
    assert out["step_rate"].iloc[0] == pytest.approx(1.0)
    assert out["step_rate"].iloc[1] == pytest.approx(1 / 3)
    assert out["step_rate"].iloc[2] == pytest.approx(2.0)


def test_funnel_empty_stage_users_zero():
    out = compute_funnel(make_df(), [["pv"], ["fav"]])
    # 空层：0 人到达，相对上一层转化率为 0.0（上一层非空时除法有意义）
    assert out["users"].iloc[1] == 0
    assert out["step_rate"].iloc[1] == pytest.approx(0.0)
