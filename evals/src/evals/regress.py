"""基线回归对比：候选 run 与 baseline.json 的分数差表。

分数仅作回归参考（spec §3.2 钉版本纪律）——judge 模型升级导致的整体漂移
应结合 summary 里的 judge_model 字段解读，而非直接当成工具质量变化。
"""

import json
from pathlib import Path

from .clock import iso_now
from .model import DIMENSION_LABELS

_BASELINE_FILE = "baseline.json"


def load_summary(run_dir: Path) -> dict:
    return json.loads((Path(run_dir) / "summary.json").read_text(encoding="utf-8"))


def load_baseline(baseline_dir: Path) -> dict:
    path = Path(baseline_dir) / _BASELINE_FILE
    if not path.exists():
        raise FileNotFoundError(f"基线不存在（先 mark_baseline）：{path}")
    return json.loads(path.read_text(encoding="utf-8"))


def latest_run(artifacts_dir: Path) -> Path:
    runs = sorted(
        (p for p in Path(artifacts_dir).iterdir() if p.is_dir() and (p / "summary.json").exists()),
        key=lambda p: p.name,
    )
    if not runs:
        raise FileNotFoundError(f"artifacts 下没有已完成的 run：{artifacts_dir}")
    return runs[-1]


def _fmt_delta(delta: float, decimals: int = 2) -> str:
    return f"{delta:+.{decimals}f}"


def compare(base: dict, cand: dict) -> str:
    lines = [
        (
            f"对比：基线 {base.get('run_id')}（judge={base.get('judge_model')}）"
            f" → 候选 {cand.get('run_id')}（judge={cand.get('judge_model')}）"
        ),
        "",
    ]
    if base.get("judge_model") != cand.get("judge_model"):
        lines.append(f"⚠ judge 模型变化：{base.get('judge_model')} → {cand.get('judge_model')}，整体漂移可能来自评分器而非工具。")
        lines.append("")

    base_per = base.get("per_tool", {})
    cand_per = cand.get("per_tool", {})
    for tool in sorted(set(base_per) | set(cand_per)):
        b = base_per.get(tool)
        c = cand_per.get(tool)
        if b is None:
            lines.append(f"[{tool}] 基线缺失（新增工具维度）——跳过对比")
            lines.append("")
            continue
        if c is None:
            lines.append(f"[{tool}] ⚠ 候选缺失（基线有而本次未跑或已移除）")
            lines.append("")
            continue
        lines.append(f"[{tool}] 维度均分（基线 → 候选，差值）")
        for dim, label in DIMENSION_LABELS.items():
            bv = (b.get("dim_avg") or {}).get(dim)
            cv = (c.get("dim_avg") or {}).get(dim)
            if bv is None and cv is None:
                continue
            btxt = f"{bv:.2f}" if bv is not None else "—"
            ctxt = f"{cv:.2f}" if cv is not None else "—"
            delta_txt = _fmt_delta(cv - bv) if (bv is not None and cv is not None) else "n/a"
            lines.append(f"  {label}（{dim}）: {btxt} → {ctxt}  ({delta_txt})")
        rates_b = b.get("structural_pass_rate") or {}
        rates_c = c.get("structural_pass_rate") or {}
        if rates_b or rates_c:
            lines.append(f"[{tool}] 结构检查通过率")
            for key in sorted(set(rates_b) | set(rates_c)):
                bv = rates_b.get(key)
                cv = rates_c.get(key)
                btxt = f"{bv:.3f}" if bv is not None else "—"
                ctxt = f"{cv:.3f}" if cv is not None else "—"
                delta_txt = _fmt_delta(cv - bv, 3) if (bv is not None and cv is not None) else "n/a"
                lines.append(f"  {key}: {btxt} → {ctxt}  ({delta_txt})")
        lines.append("")

    cost_b = base.get("cost", {})
    cost_c = cand.get("cost", {})
    lines.append(
        "成本（judge tokens）：prompt {pb:,} → {pc:,}；completion {cb:,} → {cc:,}".format(
            pb=cost_b.get("judge_prompt_tokens", 0), pc=cost_c.get("judge_prompt_tokens", 0),
            cb=cost_b.get("judge_completion_tokens", 0), cc=cost_c.get("judge_completion_tokens", 0),
        )
    )
    return "\n".join(lines)


def mark_baseline(run_dir: Path, baseline_dir: Path) -> Path:
    summary = load_summary(run_dir)
    payload = {
        "run_id": summary["run_id"],
        "judge_model": summary.get("judge_model", ""),
        "marked_at": iso_now(),
        "summary": summary,
    }
    baseline_dir = Path(baseline_dir)
    baseline_dir.mkdir(parents=True, exist_ok=True)
    out = baseline_dir / _BASELINE_FILE
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return out
