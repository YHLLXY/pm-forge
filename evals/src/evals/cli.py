"""evals CLI。

子命令：
  validate   校验评测集（schema + 分布），零调用
  run        真实运行评测（--dry-run 看计划 / --yes 确认成本 / --allow-mock 豁免演示模式）
  regress    与基线对比（T8）
  calibrate  人工校准一致率（T8）
  report     渲染运行报告（T9）
"""

import argparse
import json
import sys
from pathlib import Path

from .calibrate import agreement, load_human_scores, load_results
from .config import load_config, load_dotenv
from .dataset import DatasetError, difficulty_counts, load_all
from .model import TOOL_IDS
from .regress import compare, latest_run, load_baseline, load_summary, mark_baseline
from .runner import CostGateError, MockModeError, plan_text, run_datasets


def _cmd_validate(args) -> int:
    cfg = load_config()
    by_tool = load_all(Path(args.datasets) if args.datasets else cfg.datasets_dir)
    for tool in TOOL_IDS:
        cases = by_tool[tool]
        counts = difficulty_counts(cases)
        print(f"{tool}: {len(cases)} 条  {counts}")
    print("全部数据集校验通过。")
    return 0


def _cmd_run(args) -> int:
    cfg = load_config()
    by_tool = load_all(Path(args.datasets) if args.datasets else cfg.datasets_dir)
    if args.tool:
        if args.tool not in TOOL_IDS:
            print(f"[evals] 未知工具：{args.tool}（合法：{TOOL_IDS}）", file=sys.stderr)
            return 2
        by_tool = {t: by_tool.get(t, []) if t == args.tool else [] for t in TOOL_IDS}
    if args.limit:
        by_tool = {t: cases[: args.limit] for t, cases in by_tool.items()}

    if args.dry_run:
        print(plan_text(by_tool))
        return 0

    run_dir = run_datasets(
        cfg,
        by_tool,
        allow_mock=args.allow_mock,
        yes=args.yes,
        progress=print,
    )
    print(f"完成：{Path(str(run_dir)) / 'summary.json'}")
    return 0


def _resolve_run(cfg, run_id: str | None) -> Path:
    if run_id:
        return Path(cfg.artifacts_dir) / run_id
    return latest_run(cfg.artifacts_dir)


def _cmd_regress(args) -> int:
    cfg = load_config()
    baseline = load_baseline(cfg.baseline_dir)
    cand = load_summary(_resolve_run(cfg, args.run))
    print(compare(baseline, cand))
    return 0


def _cmd_mark_baseline(args) -> int:
    cfg = load_config()
    out = mark_baseline(_resolve_run(cfg, args.run), cfg.baseline_dir)
    print(f"基线已标记：{out}")
    return 0


def _cmd_calibrate(args) -> int:
    cfg = load_config()
    run_dir = _resolve_run(cfg, args.run)
    results = load_results(run_dir)
    human_path = Path(args.human) if args.human else cfg.calibration_dir / "human-scores.csv"
    human = load_human_scores(human_path)
    stats = agreement(results, human)
    out = run_dir / "calibration.json"
    out.write_text(json.dumps(stats, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        f"校准对：{stats['pairs']}  完全一致 {stats['exact_rate']:.0%}  "
        f"±1 一致 {stats['within1_rate']:.0%}  平均绝对差 {stats['mean_abs_diff']}"
    )
    print(f"明细（含分歧清单）：{out}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="evals", description="toolkit 三工具评测门禁（A2）")
    sub = parser.add_subparsers(dest="command", required=True)

    p_validate = sub.add_parser("validate", help="校验评测集（零调用）")
    p_validate.add_argument("--datasets", help="数据集目录（默认 <evals>/datasets）")
    p_validate.set_defaults(func=_cmd_validate)

    p_run = sub.add_parser("run", help="真实运行评测（需 --yes 确认成本）")
    p_run.add_argument("--tool", choices=TOOL_IDS, help="只跑指定工具")
    p_run.add_argument("--limit", type=int, help="每工具只跑前 N 条（冒烟用）")
    p_run.add_argument("--datasets", help="数据集目录（默认 <evals>/datasets）")
    p_run.add_argument("--dry-run", action="store_true", help="只打印计划，不调用")
    p_run.add_argument("--yes", action="store_true", help="确认成本，真实执行")
    p_run.add_argument("--allow-mock", action="store_true", help="允许 toolkit 演示模式（评分无意义，仅调试管线）")
    p_run.set_defaults(func=_cmd_run)

    p_regress = sub.add_parser("regress", help="与基线对比")
    p_regress.add_argument("--run", help="候选 run_id（默认 artifacts 下最新）")
    p_regress.set_defaults(func=_cmd_regress)

    p_mark = sub.add_parser("mark-baseline", help="把某个 run 标记为基线")
    p_mark.add_argument("--run", help="run_id（默认 artifacts 下最新）")
    p_mark.set_defaults(func=_cmd_mark_baseline)

    p_cal = sub.add_parser("calibrate", help="人工校准一致率")
    p_cal.add_argument("--run", help="run_id（默认 artifacts 下最新）")
    p_cal.add_argument("--human", help="人工评分 CSV（默认 calibration/human-scores.csv）")
    p_cal.set_defaults(func=_cmd_calibrate)

    return parser


def main(argv: list[str] | None = None) -> int:
    for stream in (sys.stdout, sys.stderr):
        if stream.encoding and stream.encoding.lower() not in ("utf-8", "utf8"):
            stream.reconfigure(encoding="utf-8")
    load_dotenv()
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except (DatasetError, CostGateError, MockModeError, ValueError) as exc:
        print(f"[evals] {exc}", file=sys.stderr)
        return 1
