"""regress.py 测试：差值表、缺失工具告警、基线标记。"""

import json

import pytest
from evals.regress import compare, latest_run, load_summary, mark_baseline

BASE = {
    "run_id": "20260930-1000",
    "judge_model": "deepseek-v3",
    "per_tool": {
        "competitor-analysis": {
            "dim_avg": {"factuality": 3.0, "structure": 4.0},
            "structural_pass_rate": {"sections_complete": 1.0},
        },
        "feedback-insights": {"dim_avg": {"factuality": 5.0}, "structural_pass_rate": {}},
    },
}
CAND = {
    "run_id": "20261001-1000",
    "judge_model": "deepseek-v3",
    "per_tool": {
        "competitor-analysis": {
            "dim_avg": {"factuality": 3.5, "structure": 3.0},
            "structural_pass_rate": {"sections_complete": 0.9},
        },
        "feedback-insights": {"dim_avg": {"factuality": 5.0}, "structural_pass_rate": {}},
    },
}


def test_compare_shows_deltas():
    text = compare(BASE, CAND)
    assert "20260930-1000" in text and "20261001-1000" in text
    assert "+0.50" in text  # factuality 3.0 → 3.5
    assert "-1.00" in text  # structure 4.0 → 3.0
    assert "-0.100" in text  # sections_complete 1.0 → 0.9


def test_compare_flags_missing_tool():
    cand2 = {
        "run_id": "x",
        "judge_model": "j",
        "per_tool": {"competitor-analysis": CAND["per_tool"]["competitor-analysis"]},
    }
    text = compare(BASE, cand2)
    assert "feedback-insights" in text
    assert "缺失" in text


def test_compare_accepts_mark_baseline_wrapped_payload():
    # 真实链路：mark_baseline 落盘的是 {run_id, judge_model, summary} 包装结构。
    # compare 必须兼容它，否则端到端 regress 永远显示"基线缺失"（2026-09-30 实测踩中）。
    wrapped = {
        "run_id": BASE["run_id"],
        "judge_model": BASE["judge_model"],
        "marked_at": "2026-09-30T00:00:00+08:00",
        "summary": BASE,
    }
    text = compare(wrapped, CAND)
    assert "+0.50" in text  # factuality 3.0 → 3.5
    assert "基线缺失" not in text


def test_load_summary_missing_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        load_summary(tmp_path)


def test_mark_baseline_snapshot(tmp_path):
    run = tmp_path / "artifacts" / "20260930-1000"
    run.mkdir(parents=True)
    (run / "summary.json").write_text(json.dumps(BASE, ensure_ascii=False), encoding="utf-8")
    out = mark_baseline(run, tmp_path / "baseline")
    data = json.loads(out.read_text(encoding="utf-8"))
    assert data["run_id"] == "20260930-1000"
    assert data["judge_model"] == "deepseek-v3"
    assert data["marked_at"]
    assert data["summary"] == BASE


def test_latest_run(tmp_path):
    artifacts = tmp_path / "artifacts"
    for name in ("20260930-100000", "20261001-090000"):
        (artifacts / name).mkdir(parents=True)
        (artifacts / name / "summary.json").write_text("{}", encoding="utf-8")
    (artifacts / "not-a-run.txt").mkdir(parents=True)
    assert latest_run(artifacts).name == "20261001-090000"
