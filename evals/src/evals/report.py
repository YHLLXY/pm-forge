"""评测运行报告渲染（markdown）。

生成稿写入 run_dir/report.md，人工通读后再按两步式发布（site 条目在 T11 显式拷贝）。
"""

import json
from pathlib import Path

from .calibrate import load_results
from .model import DIMENSION_LABELS, TOOL_IDS
from .regress import compare, load_summary
from .runner import TOOL_NAMES


def _per_case_mean(row: dict) -> float | None:
    dims = row.get("dimensions") or []
    if not dims:
        return None
    return sum(d["score"] for d in dims) / len(dims)


def _low_score_excerpts(results: list[dict], per_tool: dict) -> list[str]:
    lines: list[str] = []
    for tool in TOOL_IDS:
        tool_results = [
            r for r in results if r.get("tool") == tool and r.get("status") == "ok"
        ]
        scored = [(r, _per_case_mean(r)) for r in tool_results]
        scored = [(r, m) for r, m in scored if m is not None]
        if scored:
            worst, mean = min(scored, key=lambda pair: pair[1])
            dims = {d["dimension"]: d["score"] for d in worst.get("dimensions", [])}
            low_dim = min(dims, key=lambda d: dims[d]) if dims else ""
            evidence = next(
                (d.get("evidence", "") for d in worst["dimensions"] if d["dimension"] == low_dim), ""
            )
            lines.append(
                f"- **{TOOL_NAMES[tool]} / {worst['case_id']}**（均分 {mean:.1f}，最低维度 {DIMENSION_LABELS[low_dim]}）："
                f"{evidence}（输出前 120 字：{worst.get('output', '')[:120]}…）"
            )
        errors = [r for r in results if r.get("tool") == tool and r.get("status") != "ok"]
        for row in errors[:3]:
            lines.append(
                f"- **{TOOL_NAMES[tool]} / {row['case_id']}**（{row['status']}）：{row.get('error', '')}"
            )
        if per_tool.get(tool, {}).get("error_count", 0) > 3:
            lines.append(f"- （{TOOL_NAMES[tool]} 错误案例较多，共 {per_tool[tool]['error_count']} 条，详见 results.jsonl）")
    return lines


def render_run_report(run_dir: Path) -> str:
    run_dir = Path(run_dir)
    summary = load_summary(run_dir)
    results = load_results(run_dir)
    per_tool = summary.get("per_tool", {})

    total_ok = sum(p.get("ok_count", 0) for p in per_tool.values())
    total_err = sum(p.get("error_count", 0) for p in per_tool.values())

    lines: list[str] = []
    lines.append(f"# toolkit evals 运行报告 · {summary['run_id']}")
    lines.append("")
    lines.append("> source: claude")
    lines.append("")
    lines.append("## 一、概览")
    lines.append("")
    lines.append(f"- 运行时间：{summary.get('started_at')} → {summary.get('finished_at')}")
    lines.append(
        f"- toolkit：{summary.get('toolkit_base_url')}（生成模型备注：{summary.get('toolkit_model_note') or '未记录'}）"
    )
    lines.append(
        f"- 评分器（judge）：{summary.get('judge_model')}（配置 {summary.get('judge_model_configured')}，温度 0）"
    )
    modes = summary.get("mode_counter", {})
    lines.append(f"- 响应模式：{'、'.join(f'{k} × {v}' for k, v in modes.items()) or '无'}")
    lines.append(f"- 案例结果：ok {total_ok} / 错误 {total_err}")
    lines.append("")
    lines.append("## 二、方法一句话")
    lines.append("")
    lines.append(
        "HTTP 黑盒调用 toolkit 的 `POST /api/tools/{id}` → 确定性结构检查（代码判定契约遵守）→ "
        "LLM-as-judge 四维评分（1-5，温度 0）→ 人工校准一致率。分数仅作回归参考。"
    )
    lines.append("")
    lines.append("## 三、分数表（工具 × 维度均分）")
    lines.append("")
    lines.append("| 工具 | " + " | ".join(DIMENSION_LABELS[d] for d in DIMENSION_LABELS) + " |")
    lines.append("|---" * (len(DIMENSION_LABELS) + 1) + "|")
    for tool in TOOL_IDS:
        dims = per_tool.get(tool, {}).get("dim_avg", {})
        cells = [
            f"{dims[d]:.2f}" if dims.get(d) is not None else "—" for d in DIMENSION_LABELS
        ]
        lines.append(f"| {TOOL_NAMES[tool]} | " + " | ".join(cells) + " |")
    lines.append("")
    lines.append("### 结构检查通过率")
    lines.append("")
    for tool in TOOL_IDS:
        rates = per_tool.get(tool, {}).get("structural_pass_rate") or {}
        if not rates:
            continue
        parts = [f"{k} {v:.0%}" for k, v in rates.items()]
        lines.append(f"- {TOOL_NAMES[tool]}：{'；'.join(parts)}")
    lines.append("")
    lines.append("## 四、人工校准一致率")
    lines.append("")
    calib_path = run_dir / "calibration.json"
    if calib_path.exists():
        calib = json.loads(calib_path.read_text(encoding="utf-8"))
        lines.append(
            f"- 校准对 {calib.get('pairs')}；完全一致率 {calib.get('exact_rate'):.0%}；"
            f"±1 一致率 {calib.get('within1_rate'):.0%}；平均绝对差 {calib.get('mean_abs_diff')}"
        )
        for dim, stats in (calib.get("per_dimension") or {}).items():
            lines.append(
                f"  - {stats.get('label', dim)}：n={stats.get('pairs')}，"
                f"完全一致 {stats.get('exact_rate'):.0%}，平均绝对差 {stats.get('mean_abs_diff')}"
            )
        if calib.get("disagreements"):
            lines.append(f"- 分歧（差 >1 分）{len(calib['disagreements'])} 条，逐条复核记录见 calibration.json")
    else:
        lines.append("（本次运行尚未做人工校准）")
    lines.append("")
    lines.append("## 五、低分案例与错误摘录")
    lines.append("")
    excerpts = _low_score_excerpts(results, per_tool)
    lines.extend(excerpts if excerpts else ["（无）"])
    lines.append("")
    lines.append("## 六、成本披露")
    lines.append("")
    cost = summary.get("cost", {})
    lines.append(
        f"- 评分器 tokens：prompt {cost.get('judge_prompt_tokens', 0):,} + "
        f"completion {cost.get('judge_completion_tokens', 0):,}"
        f"（toolkit 生成侧成本见 toolkit 自身用量，评测集不含生成侧 usage 时以备注为准）"
    )
    lines.append("")
    lines.append("## 七、局限与钉版本声明")
    lines.append("")
    lines.append(
        f"- judge 模型字符串（{summary.get('judge_model')}）与评测日期均已留痕；评分模型升级可能造成分数漂移，"
        "分数仅作同基线下的回归参考，不构成绝对质量结论。"
    )
    lines.append("- 评测集为自造真实任务（无隐私），覆盖基础/复杂/边界三档；边界案例考察的是契约遵守与信息缺口处理。")
    lines.append("- LLM 评分存在固有主观性，人工校准一致率与分歧清单是解读分数的必要上下文。")
    return "\n".join(lines) + "\n"


def render_comparison_report(base_dir: Path, cand_dir: Path) -> str:
    base_dir, cand_dir = Path(base_dir), Path(cand_dir)
    base = load_summary(base_dir)
    cand = load_summary(cand_dir)
    return "\n".join(
        [
            f"# toolkit evals 回归对比 · {base['run_id']} → {cand['run_id']}",
            "",
            "```",
            compare(base, cand),
            "```",
            "",
        ]
    )
