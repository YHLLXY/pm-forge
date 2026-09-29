"""评测运行编排：守卫（密钥/成本/mock）→ 逐 case 黑盒调用与评分 → 增量落盘 → 汇总。

真实评分的三道门：
1. LLM_API_KEY 未配置 → CostGateError；
2. 未显式 --yes → CostGateError（先 --dry-run 看计划）；
3. toolkit 返回 mock 模式（X-PMForge-Mode: mock）→ MockModeError，--allow-mock 显式豁免。
"""

import json
from collections.abc import Callable
from dataclasses import asdict
from pathlib import Path

from .client import ToolkitError, call_toolkit
from .clock import iso_now, stamp
from .config import EvalsConfig
from .judge import JudgeError, call_judge
from .model import DIMENSIONS, TOOL_IDS, Case, CaseResult
from .structural import structural_checks

TOOL_NAMES = {
    "competitor-analysis": "竞品分析",
    "feedback-insights": "用户反馈洞察",
    "prd-draft": "PRD 草稿",
}


class CostGateError(RuntimeError):
    pass


class MockModeError(RuntimeError):
    pass


def plan_text(cases_by_tool: dict[str, list[Case]]) -> str:
    total = sum(len(v) for v in cases_by_tool.values())
    lines = [f"评测计划：{total} 个 case × 2 次调用（toolkit 生成 + judge 评分）"]
    for tool in TOOL_IDS:
        lines.append(f"  {TOOL_NAMES[tool]}（{tool}）：{len(cases_by_tool.get(tool, []))} 条")
    est = total * 11_000
    lines.append(
        f"成本上界估算：≈{est:,} token（每 case ≤ 生成 4096 + 评分约 6500）；"
        "DeepSeek 计价约几元人民币级，实际花费以 API usage 汇总为准。"
    )
    lines.append("真实执行需 --yes 显式确认；--dry-run 仅查看计划、不发起任何调用。")
    return "\n".join(lines)


def _run_case(
    cfg: EvalsConfig,
    tool: str,
    case: Case,
    *,
    client: Callable,
    judge: Callable,
    allow_mock: bool,
) -> CaseResult:
    base = {"case_id": case.id, "tool": tool, "task": case.task, "difficulty": case.difficulty}
    try:
        resp = client(cfg.toolkit_base_url, tool, case.input)
    except ToolkitError as exc:
        return CaseResult(**base, status="toolkit_error", mode="unknown", output="", duration_ms=0, error=str(exc))
    if resp.mode == "mock" and not allow_mock:
        raise MockModeError(
            "toolkit 处于演示模式（MOCK_LLM=1 或未配置生成 key），输出为固定样例，评分无意义。"
            "请配置 toolkit 的真实 LLM key 后重试；确要评测演示模式请加 --allow-mock。"
        )
    structural = structural_checks(case, resp.text)
    # JudgeError（如偶发畸形 JSON）带更正提示重试一次；再失败才记 judge_error
    _RETRY_HINT = "上一次评分响应不是合法 JSON：请只输出一个合法 JSON 对象，且 evidence 中不要使用英文双引号。"
    outcome = None
    last_err: JudgeError | None = None
    for kwargs in ({}, {"hint": _RETRY_HINT}):
        try:
            outcome = judge(cfg, TOOL_NAMES[tool], case, resp.text, **kwargs)
            break
        except JudgeError as exc:
            last_err = exc
    if outcome is None:
        return CaseResult(
            **base, status="judge_error", mode=resp.mode, output=resp.text,
            duration_ms=resp.duration_ms, structural=structural, error=str(last_err),
        )
    return CaseResult(
        **base,
        status="ok",
        mode=resp.mode,
        output=resp.text,
        duration_ms=resp.duration_ms,
        structural=structural,
        dimensions=outcome.dimensions,
        judge_model=outcome.model,
        judged_at=iso_now(),
        judge_usage=outcome.usage,
    )


def _summarize(
    rows: list[dict],
    cfg: EvalsConfig,
    run_id: str,
    started_at: str,
    finished_at: str,
    total_cases: int,
) -> dict:
    """从 results 行聚合 summary。

    结构检查通过率的分母是**该检查出现的案例数**（不同工具/案例的检查项
    不同，如 must_include 只在个别案例上存在），不能除以全部 ok 案例数。
    """
    mode_counter: dict[str, int] = {}
    usage_total = {"prompt_tokens": 0, "completion_tokens": 0}
    judge_model_seen = ""
    per_tool = {
        t: {
            "case_count": 0,
            "ok_count": 0,
            "error_count": 0,
            "dims_sum": {d: 0 for d in DIMENSIONS},
            "dims_n": 0,
            "structural_stats": {},  # key -> [hit, present]
        }
        for t in TOOL_IDS
    }
    for row in rows:
        tool = row["tool"]
        bucket = per_tool[tool]
        bucket["case_count"] += 1
        mode_counter[row["mode"]] = mode_counter.get(row["mode"], 0) + 1
        if row["status"] == "ok":
            bucket["ok_count"] += 1
            for key, passed in row["structural"].items():
                stats = bucket["structural_stats"].setdefault(key, [0, 0])
                stats[0] += 1 if passed else 0
                stats[1] += 1
            for ds in row["dimensions"]:
                bucket["dims_sum"][ds["dimension"]] += ds["score"]
                bucket["dims_n"] += 1
            if row.get("judge_model"):
                judge_model_seen = row["judge_model"]
            row_usage = row.get("judge_usage") or {}
            usage_total["prompt_tokens"] += row_usage.get("prompt_tokens", 0)
            usage_total["completion_tokens"] += row_usage.get("completion_tokens", 0)
        else:
            bucket["error_count"] += 1

    per_tool_out = {}
    for tool, bucket in per_tool.items():
        n = bucket["dims_n"] / len(DIMENSIONS) if bucket["dims_n"] else 0
        per_tool_out[tool] = {
            "case_count": bucket["case_count"],
            "ok_count": bucket["ok_count"],
            "error_count": bucket["error_count"],
            "dim_avg": {d: round(bucket["dims_sum"][d] / n, 2) if n else None for d in DIMENSIONS},
            "structural_pass_rate": {
                k: round(v[0] / v[1], 3) if v[1] else None
                for k, v in bucket["structural_stats"].items()
            },
        }
    return {
        "run_id": run_id,
        "started_at": started_at,
        "finished_at": finished_at,
        "toolkit_base_url": cfg.toolkit_base_url,
        "toolkit_model_note": cfg.toolkit_model_note,
        "judge_model": judge_model_seen or cfg.judge_model,
        "judge_model_configured": cfg.judge_model,
        "mode_counter": mode_counter,
        "cost": {
            "cases": total_cases,
            "toolkit_calls": len(rows),
            "judge_prompt_tokens": usage_total["prompt_tokens"],
            "judge_completion_tokens": usage_total["completion_tokens"],
        },
        "per_tool": per_tool_out,
    }


def run_datasets(
    cfg: EvalsConfig,
    cases_by_tool: dict[str, list[Case]],
    *,
    client: Callable = call_toolkit,
    judge: Callable = call_judge,
    allow_mock: bool = False,
    yes: bool = False,
    run_id: str | None = None,
    progress: Callable[[str], None] = lambda _msg: None,
) -> object:
    """运行全部评测集，返回 run_dir（artifacts/<run_id>/）。"""
    total = sum(len(v) for v in cases_by_tool.values())
    if not cfg.judge_api_key:
        raise CostGateError("LLM_API_KEY 未配置（evals/.env）：真实评分需要评分器 key")
    if not yes:
        raise CostGateError("真实评分会产生 API 费用：请先 --dry-run 查看计划，确认后加 --yes 执行")

    run_id = run_id or stamp()
    run_dir = cfg.artifacts_dir / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    started_at = iso_now()

    rows: list[dict] = []
    results_path = run_dir / "results.jsonl"
    idx = 0
    with results_path.open("w", encoding="utf-8") as fh:
        for tool in TOOL_IDS:
            for case in cases_by_tool.get(tool, []):
                idx += 1
                progress(f"[{idx}/{total}] {tool} {case.id} …")
                result = _run_case(cfg, tool, case, client=client, judge=judge, allow_mock=allow_mock)
                row = asdict(result)
                rows.append(row)
                fh.write(json.dumps(row, ensure_ascii=False) + "\n")
                fh.flush()
                progress(f"  → {result.status}")

    finished_at = iso_now()
    summary = _summarize(rows, cfg, run_id, started_at, finished_at, total)
    (run_dir / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return run_dir


def rebuild_summary(run_dir: Path, cfg: EvalsConfig) -> dict:
    """从 results.jsonl 重建 summary.json（崩溃恢复 / 聚合逻辑修复后重算）。

    started/finished 以 results 内 judged_at 的最小/最大值为近似；
    结果与原始 run 的差异仅在时间戳与 rebuilt 标记。
    """
    run_dir = Path(run_dir)
    rows = []
    for line in (run_dir / "results.jsonl").read_text(encoding="utf-8").splitlines():
        if line.strip():
            rows.append(json.loads(line))
    judged = sorted(r["judged_at"] for r in rows if r.get("judged_at"))
    started_at = judged[0] if judged else iso_now()
    finished_at = judged[-1] if judged else iso_now()
    summary = _summarize(rows, cfg, run_dir.name, started_at, finished_at, len(rows))
    summary["rebuilt_at"] = iso_now()
    (run_dir / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return summary
