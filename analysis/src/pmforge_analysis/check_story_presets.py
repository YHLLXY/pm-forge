# analysis/src/pmforge_analysis/check_story_presets.py
# 用法: uv run python -m pmforge_analysis.check_story_presets
# 作用: 用 pandas（ingest.py 的规范语义）独立复算 q01/q03/q04/q10，与 site 侧预生成
#       preset JSON 逐值比对——把 B 线STATUS 里"pandas 交叉验证一致"的声称变成可重跑的
#       机械检查，同时钉死窗口清洗与 UTC+8 墙钟口径。任何一侧口径改动导致不一致即 exit 1。
import json
from datetime import timedelta, timezone
from pathlib import Path

import pandas as pd

from pmforge_analysis.ingest import to_datetime_cn

PRESET_DIR = Path(__file__).resolve().parents[3] / "site/public/assets/data-stories/userbehavior/presets"
PARQUET = Path(__file__).resolve().parents[3] / "site/public/assets/data-stories/userbehavior/userbehavior_100k.parquet"

TZ_CN = timezone(timedelta(hours=8))


def load(qid: str) -> dict:
    return json.loads((PRESET_DIR / f"{qid}.json").read_text(encoding="utf-8"))


def main() -> None:
    df = pd.read_parquet(PARQUET)
    dt = to_datetime_cn(df["ts"])
    # 官方窗口（同 precompute_story.py / ingest.clean_window）
    win = (dt >= pd.Timestamp("2017-11-25", tz=TZ_CN)) & (dt < pd.Timestamp("2017-12-04", tz=TZ_CN))
    df = df[win].reset_index(drop=True)
    d = to_datetime_cn(df["ts"])
    failures: list[str] = []

    # q01 总量
    q01 = load("q01")["rows"][0]
    if int(q01["events"]) != len(df):
        failures.append(f"q01 events {q01['events']} != pandas {len(df)}")
    if int(q01["users"]) != df["user_id"].nunique():
        failures.append("q01 users 不一致")

    # q03 日活
    p_q03 = d.dt.strftime("%Y-%m-%d").pipe(lambda s: pd.DataFrame({"d": s, "u": df["user_id"]})).groupby("d")["u"].nunique().sort_index()
    s_q03 = {r["dim"]: int(r["user_count"]) for r in load("q03")["rows"]}
    if {k: int(v) for k, v in p_q03.items()} != s_q03:
        failures.append("q03 日活逐值不一致")

    # q04 小时分布
    p_q04 = d.dt.strftime("%H").value_counts().sort_index()
    s_q04 = {r["dim"]: int(r["event_count"]) for r in load("q04")["rows"]}
    if {k: int(v) for k, v in p_q04.items()} != s_q04:
        failures.append("q04 小时分布逐值不一致")

    # q10 周末/工作日人均行为数（pandas 周末 = dayofweek ≥5）
    wd = d.dt.dayofweek >= 5
    grp = df.assign(wd=wd).groupby("wd")["user_id"]
    p_q10 = (grp.count() / grp.nunique()).round(2)
    s_q10 = {r["dim"]: float(r["events_per_user"]) for r in load("q10")["rows"]}
    for is_wd, dim in [(False, "工作日"), (True, "周末")]:
        if abs(float(p_q10[is_wd]) - s_q10[dim]) >= 0.01:
            failures.append(f"q10 {dim}: pandas {p_q10[is_wd]} vs preset {s_q10[dim]}")

    # q11 购买分层（buyers / pct_buyers / pct_once / repeat_buyers / pct_one_day_active）
    # days 必须先 dt.normalize() 归到当日零点再去重——d 是带时分的完整时间戳，
    # 直接 nunique() 数的是「去重时间戳数」而非「去重天数」，与 DuckDB 的 count(DISTINCT DAY) 分叉。
    per = pd.DataFrame({
        "buy_n": df[df["behavior_type"] == "buy"].groupby("user_id").size(),
        "days": d.dt.normalize().groupby(df["user_id"]).nunique(),
    }).fillna({"buy_n": 0})
    total = len(per)
    buyers = per[per["buy_n"] >= 1]
    q11 = load("q11")["rows"][0]
    checks_q11 = {
        "buyers": (int(q11["buyers"]), len(buyers)),
        "pct_buyers": (float(q11["pct_buyers"]), round(len(buyers) * 100 / total, 2)),
        "pct_once": (float(q11["pct_once"]), round((per["buy_n"] == 1).sum() * 100 / len(buyers), 2)),
        "repeat_buyers": (int(q11["repeat_buyers"]), int((per["buy_n"] >= 2).sum())),
        "pct_one_day_active": (float(q11["pct_one_day_active"]), round((per["days"] == 1).sum() * 100 / total, 2)),
    }
    for name, (preset_v, pandas_v) in checks_q11.items():
        if abs(float(preset_v) - float(pandas_v)) >= 0.01:
            failures.append(f"q11 {name}: pandas {pandas_v} vs preset {preset_v}")

    # q12 R 分布（距窗口末天数 → 购买用户数）。注意 max() 取到的是时间戳，必须 normalize()
    # 归到当日零点再算天数，否则 12-02 23:00 会被 floor 成 lag=0，与 DuckDB 日期级 datediff 分叉。
    bmask = df["behavior_type"] == "buy"
    last_buy = d[bmask].groupby(df["user_id"][bmask]).max().dt.normalize()
    lag = (pd.Timestamp("2017-12-03", tz=TZ_CN) - last_buy).dt.days
    p_q12 = lag.value_counts().to_dict()
    s_q12 = {int(str(r["dim"]).split(" ")[0]): int(r["user_count"]) for r in load("q12")["rows"]}
    if {int(k): int(v) for k, v in p_q12.items()} != s_q12:
        failures.append("q12 R 分布逐值不一致")

    # 总行数一致性自证：四类行为加总 = 清洗后行数
    if s_q04 and sum(s_q04.values()) != len(df):
        failures.append("q04 小时加总 != 清洗后总行数")

    if failures:
        for f in failures:
            print(f"✗ {f}")
        raise SystemExit(1)
    print(f"✓ 预置 JSON 与 pandas 规范语义逐值一致（q01 总量 / q03 日活 {len(s_q03)} 天 / q04 小时 {len(s_q04)} 项 / q10 周末判定 / q11 购买分层 / q12 R 分布），窗口 {len(df)} 行")


if __name__ == "__main__":
    main()
