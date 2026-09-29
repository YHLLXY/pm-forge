"""人工校准：模型分 vs 人工分的一致率统计（spec §3.2 验收 ④ 的核心展示物）。

CSV 格式（表头必填 case_id,dimension,score；rater/note 可选）：
    case_id,dimension,score,rater,note
    comp-001,factuality,4,ai-blind,按锚点盲评
"""

import csv
import json
from dataclasses import dataclass
from pathlib import Path

from .model import DIMENSION_LABELS, DIMENSIONS


@dataclass(frozen=True)
class HumanScore:
    case_id: str
    dimension: str
    score: int
    rater: str = ""
    note: str = ""


def load_human_scores(csv_path: Path) -> list[HumanScore]:
    scores: list[HumanScore] = []
    with open(csv_path, encoding="utf-8-sig", newline="") as fh:
        for lineno, row in enumerate(csv.DictReader(fh), start=2):
            case_id = (row.get("case_id") or "").strip()
            dimension = (row.get("dimension") or "").strip()
            raw_score = (row.get("score") or "").strip()
            if not case_id and not dimension and not raw_score:
                continue  # 空行
            if dimension not in DIMENSIONS:
                raise ValueError(f"{csv_path.name}:{lineno}: dimension 须为 {DIMENSIONS} 之一：{dimension!r}")
            try:
                score = int(raw_score)
            except ValueError as exc:
                raise ValueError(f"{csv_path.name}:{lineno}: score 必须是整数：{raw_score!r}") from exc
            if not 1 <= score <= 5:
                raise ValueError(f"{csv_path.name}:{lineno}: score 必须在 1-5：{score}")
            scores.append(
                HumanScore(
                    case_id=case_id,
                    dimension=dimension,
                    score=score,
                    rater=(row.get("rater") or "").strip(),
                    note=(row.get("note") or "").strip(),
                )
            )
    return scores


def _model_scores(results: list[dict]) -> dict[str, dict[str, tuple[int, str]]]:
    """case_id -> {dimension: (model_score, evidence)}；仅 ok 案例。"""
    out: dict[str, dict[str, tuple[int, str]]] = {}
    for row in results:
        if row.get("status") != "ok":
            continue
        dims: dict[str, tuple[int, str]] = {}
        for d in row.get("dimensions", []):
            dims[d["dimension"]] = (d["score"], d.get("evidence", ""))
        out[row["case_id"]] = dims
    return out


def agreement(results: list[dict], human: list[HumanScore]) -> dict:
    if not human:
        raise ValueError("无可用校准对：human-scores.csv 为空")
    model = _model_scores(results)

    pairs = 0
    exact = 0
    within1 = 0
    abs_sum = 0
    per_dim: dict[str, dict[str, float]] = {}
    disagreements: list[dict] = []
    problems: list[str] = []

    for h in human:
        dims = model.get(h.case_id)
        if dims is None:
            if h.case_id in {r.get("case_id") for r in results}:
                problems.append(f"{h.case_id}：非 ok 状态，无模型分可对")
            else:
                problems.append(f"{h.case_id}：results 中不存在")
            continue
        if h.dimension not in dims:
            problems.append(f"{h.case_id}：模型分缺维度 {h.dimension}")
            continue
        m_score, m_evidence = dims[h.dimension]
        pairs += 1
        diff = abs(m_score - h.score)
        abs_sum += diff
        if m_score == h.score:
            exact += 1
        if diff <= 1:
            within1 += 1
        bucket = per_dim.setdefault(
            h.dimension, {"pairs": 0, "exact": 0, "abs_sum": 0}
        )
        bucket["pairs"] += 1
        bucket["abs_sum"] += diff
        if m_score == h.score:
            bucket["exact"] += 1
        if diff > 1:
            disagreements.append(
                {
                    "case_id": h.case_id,
                    "dimension": h.dimension,
                    "model": m_score,
                    "human": h.score,
                    "evidence": m_evidence[:120],
                }
            )

    if problems:
        raise ValueError("校准引用不完整：\n" + "\n".join(problems))
    if pairs == 0:
        raise ValueError("无可用校准对")

    per_dim_out = {
        dim: {
            "label": DIMENSION_LABELS[dim],
            "pairs": b["pairs"],
            "exact_rate": round(b["exact"] / b["pairs"], 3),
            "mean_abs_diff": round(b["abs_sum"] / b["pairs"], 3),
        }
        for dim, b in sorted(per_dim.items())
    }
    return {
        "pairs": pairs,
        "exact_rate": round(exact / pairs, 3),
        "within1_rate": round(within1 / pairs, 3),
        "mean_abs_diff": round(abs_sum / pairs, 3),
        "per_dimension": per_dim_out,
        "disagreements": disagreements,
    }


def load_results(run_dir: Path) -> list[dict]:
    path = Path(run_dir) / "results.jsonl"
    rows: list[dict] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            rows.append(json.loads(line))
    return rows
