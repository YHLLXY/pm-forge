# analysis/src/pmforge_analysis/precompute_story.py
# 用法: uv run python -m pmforge_analysis.precompute_story
# 输出: site/public/assets/data-stories/userbehavior/presets/{qid}.json
# 时间口径: ingest.py 存的是 unix 秒（真 UTC epoch）；展示语义按 Asia/Shanghai 墙钟。
# dayofweek 口径: DuckDB 0=周日（脚本自证打印）。
import json
from pathlib import Path

import duckdb

OUT = Path(__file__).resolve().parents[3] / "site/public/assets/data-stories/userbehavior/presets"
PARQUET = Path(__file__).resolve().parents[3] / "site/public/assets/data-stories/userbehavior/userbehavior_100k.parquet"

# 墙钟成分用纯整数运算（ts+28800 秒对 86400 取模），不经 TIMESTAMP 类型渲染：
# to_timestamp() 返回 TIMESTAMPTZ，strftime 按会话时区出数——Python 端随本机时区、
# 浏览器 WASM 端默认 UTC，同一 SQL 两端结果会分叉；整数运算无此依赖。
# DATE '1970-01-01' + 天数 = 日期（DATE 类型无时区）；`//` 为 DuckDB 整除。
DAY = "strftime(DATE '1970-01-01' + CAST((ts + 28800) // 86400 AS INTEGER), '%Y-%m-%d')"
HOUR = "lpad(CAST(((ts + 28800) % 86400) // 3600 AS VARCHAR), 2, '0')"
# 每题 = (qid, title, metricNote 指标口径, sql)。口径行将原样进页面（B 验收⑥）
PRESETS = [
    ("q01", "样本总览", "100k 行 reservoir 抽样（seed=42），剔除官方窗口外的脏时间戳行（口径同 ingest.clean_window）后进行分析",
     "SELECT count(*) AS events, count(DISTINCT user_id) AS users, count(DISTINCT item_id) AS items, count(DISTINCT category_id) AS categories FROM events"),
    ("q02", "四类行为占比", "行为计数 = events 表按 behavior_type 的行数",
     "SELECT behavior_type AS dim, count(*) AS event_count, count(DISTINCT user_id) AS user_count FROM events GROUP BY 1 ORDER BY event_count DESC"),
    ("q03", "日活跃用户曲线", "日活 = 当日去重 user_id 数；日/小时按 UTC+8 墙钟（Unix 秒 + 8h，中国无夏令时）",
     f"SELECT {DAY} AS dim, count(DISTINCT user_id) AS user_count FROM events GROUP BY 1 ORDER BY 1"),
    ("q04", "小时分布", "按 UTC+8 墙钟小时计数",
     f"SELECT {HOUR} AS dim, count(*) AS event_count FROM events GROUP BY 1 ORDER BY 1"),
    ("q05", "类目 PV Top10", "pv 行数最多的 category_id；类目 ID 为平台原始编号",
     "SELECT category_id AS dim, count(*) AS event_count FROM events WHERE behavior_type='pv' GROUP BY 1 ORDER BY event_count DESC LIMIT 10"),
    ("q06", "类目转化率 Top10", "转化率 = buy 行为数 / pv 行数，仅统计 pv≥50 的类目（小样本类目不入选）",
     "SELECT category_id AS dim, sum(CASE WHEN behavior_type='pv' THEN 1 ELSE 0 END) AS pv, sum(CASE WHEN behavior_type='buy' THEN 1 ELSE 0 END) AS buy, round(sum(CASE WHEN behavior_type='buy' THEN 1 ELSE 0 END)::DOUBLE / nullif(sum(CASE WHEN behavior_type='pv' THEN 1 ELSE 0 END),0), 4) AS rate FROM events GROUP BY 1 HAVING pv >= 50 ORDER BY rate DESC LIMIT 10"),
    ("q07", "加购未买用户占比", "分母=全量用户；加购未买 = 有 cart 且无 buy 行为的用户",
     "SELECT round(sum(CASE WHEN has_cart AND NOT has_buy THEN 1 ELSE 0 END)::DOUBLE*100 / count(*), 2) AS pct_cart_no_buy, count(*) AS users FROM (SELECT user_id, bool_or(behavior_type='cart') AS has_cart, bool_or(behavior_type='buy') AS has_buy FROM events GROUP BY user_id)"),
    ("q08", "复购用户占比", "复购 = buy 行为 ≥2 次（不区分是否同商品）",
     "SELECT round(sum(CASE WHEN buy_n>=2 THEN 1 ELSE 0 END)::DOUBLE*100 / count(*), 2) AS pct_repurchase FROM (SELECT user_id, count(*) FILTER (WHERE behavior_type='buy') AS buy_n FROM events GROUP BY user_id)"),
    ("q09", "行为漏斗", "漏斗为平行计数非严格漏斗：各行为的去重用户数（fav 不进主漏斗）",
     "SELECT behavior_type AS dim, count(DISTINCT user_id) AS user_count FROM events WHERE behavior_type IN ('pv','cart','fav','buy') GROUP BY 1 ORDER BY user_count DESC"),
    ("q10", "周末 vs 工作日", "周末 = UTC+8 墙钟的周六/周日；对比人均行为数（结果保留两位小数）",
     "SELECT CASE WHEN dayofweek(DATE '1970-01-01' + CAST((ts + 28800) // 86400 AS INTEGER)) IN (0,6) THEN '周末' ELSE '工作日' END AS dim, round(count(*)::DOUBLE / count(DISTINCT user_id), 2) AS events_per_user FROM events GROUP BY 1 ORDER BY events_per_user DESC, dim"),
    ("q11", "购买用户分层快照", "RFM 诚实降维口径：数据集无金额字段（M 不可算）；九日窗口购买行为稀薄，绝大多数购买用户仅购买 1 次（F 无区分度，具体占比见快照行）；分母=全体去重用户，购买指标分母=购买用户",
     f"WITH per_user AS (SELECT user_id, count(*) FILTER (WHERE behavior_type = 'buy') AS buy_n, count(DISTINCT {DAY}) AS days FROM events GROUP BY user_id), agg AS (SELECT count(*) AS total, count(*) FILTER (WHERE buy_n >= 1) AS buyers, count(*) FILTER (WHERE buy_n = 1) AS once_buyers, count(*) FILTER (WHERE buy_n >= 2) AS repeat_buyers, count(*) FILTER (WHERE days = 1) AS one_day_users FROM per_user) SELECT buyers, round(buyers::DOUBLE * 100 / total, 2) AS pct_buyers, round(once_buyers::DOUBLE * 100 / buyers, 2) AS pct_once, repeat_buyers, round(one_day_users::DOUBLE * 100 / total, 2) AS pct_one_day_active FROM agg"),
    ("q12", "最近购买距今分布（R）", "R = 距窗口末（2017-12-03，UTC+8）最近一次购买的天数；样本=窗口内有 buy 行为的购买用户（人数见 q11 快照行）；分布近似平坦系每日购买量稳定的镜像",
     f"WITH buys AS (SELECT user_id, max({DAY}) AS last_day FROM events WHERE behavior_type = 'buy' GROUP BY user_id), lagged AS (SELECT datediff('day', CAST(last_day AS DATE), DATE '2017-12-03') AS lag, count(*) AS user_count FROM buys GROUP BY 1) SELECT CAST(lag AS VARCHAR) || ' 天前' AS dim, user_count FROM lagged ORDER BY lag ASC"),
]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect()
    # 官方窗口（同 ingest.DATASET_WINDOW，上海时区端点）换算 unix 秒，视图层先清洗再出数
    from datetime import datetime, timedelta, timezone

    tz_cn = timezone(timedelta(hours=8))
    start = int(datetime(2017, 11, 25, tzinfo=tz_cn).timestamp())
    end = int(datetime(2017, 12, 4, tzinfo=tz_cn).timestamp())
    total = con.execute(f"SELECT count(*) FROM read_parquet('{PARQUET}')").fetchone()[0]
    con.execute(f"CREATE VIEW events AS SELECT * FROM read_parquet('{PARQUET}') WHERE ts >= {start} AND ts < {end}")
    kept = con.execute("SELECT count(*) FROM events").fetchone()[0]
    print(f"官方窗口清洗：{total} → {kept} 行（剔除脏时间戳 {total - kept} 行，口径同 ingest.clean_window）")
    # dayofweek 口径自证：2017-11-26 是周日，DuckDB 0=周日应返回 0
    dow = con.execute("SELECT dayofweek(DATE '2017-11-26')").fetchone()[0]
    assert dow == 0, f"dayofweek 口径变化：2017-11-26(周日) 返回 {dow}，q10 的 IN (0,6) 需重核"
    lo, hi = con.execute("SELECT min(ts), max(ts) FROM events").fetchone()
    lo_str = datetime.fromtimestamp(lo, tz=tz_cn).strftime("%Y-%m-%d %H:%M")
    hi_str = datetime.fromtimestamp(hi, tz=tz_cn).strftime("%Y-%m-%d %H:%M")
    print(f"数据窗口(UTC+8): {lo_str} → {hi_str}")
    ids = []
    for qid, title, note, sql in PRESETS:
        cols = [d[0] for d in con.execute(sql).description]
        rows = [dict(zip(cols, r)) for r in con.execute(sql).fetchall()]
        (OUT / f"{qid}.json").write_text(
            json.dumps({"id": qid, "title": title, "metricNote": note, "rows": rows}, ensure_ascii=False, indent=1),
            encoding="utf-8",
        )
        ids.append(qid)
        print(f"✓ {qid} {title}: {len(rows)} 行")


if __name__ == "__main__":
    main()
