"""report.py 测试：核心字段呈现、成本披露、校准节按需出现。"""

import json
from pathlib import Path

from evals.report import render_comparison_report, render_run_report

SUMMARY = {
    "run_id": "20260930-100000",
    "started_at": "2026-09-30T10:00:00+08:00",
    "finished_at": "2026-09-30T10:05:00+08:00",
    "toolkit_base_url": "http://localhost:3000",
    "toolkit_model_note": "deepseek-chat",
    "judge_model": "deepseek-chat-20260901",
    "judge_model_configured": "deepseek-chat",
    "mode_counter": {"openai-compatible": 4},
    "cost": {"cases": 4, "toolkit_calls": 4, "judge_prompt_tokens": 900, "judge_completion_tokens": 200},
    "per_tool": {
        "competitor-analysis": {
            "case_count": 2,
            "ok_count": 2,
            "error_count": 0,
            "dim_avg": {"factuality": 3.0, "structure": 4.0, "actionability": 2.5, "instruction": 4.0},
            "structural_pass_rate": {"no_failure_mark": 1.0, "sections_complete": 1.0},
        },
    },
}

RESULTS = [
    {
        "case_id": "comp-001",
        "tool": "competitor-analysis",
        "status": "ok",
        "difficulty": "基础",
        "output": "# 竞品分析：t\n……",
        "dimensions": [
            {"dimension": "factuality", "score": 4, "evidence": "断言均有标注"},
            {"dimension": "structure", "score": 5, "evidence": "六章齐全"},
            {"dimension": "actionability", "score": 3, "evidence": "机会点空泛"},
            {"dimension": "instruction", "score": 5, "evidence": "标注到位"},
        ],
    },
    {
        "case_id": "comp-002",
        "tool": "competitor-analysis",
        "status": "toolkit_error",
        "difficulty": "边界",
        "output": "",
        "dimensions": [],
        "error": "INVALID_INPUT: 模拟失败",
    },
]

CALIBRATION = {
    "pairs": 32,
    "exact_rate": 0.72,
    "within1_rate": 0.95,
    "mean_abs_diff": 0.4,
    "per_dimension": {},
    "disagreements": [],
}


def _run_dir(tmp_path: Path, with_calibration=False) -> Path:
    run = tmp_path / "artifacts" / "20260930-100000"
    run.mkdir(parents=True, exist_ok=True)
    (run / "summary.json").write_text(json.dumps(SUMMARY, ensure_ascii=False), encoding="utf-8")
    (run / "results.jsonl").write_text(
        "\n".join(json.dumps(r, ensure_ascii=False) for r in RESULTS) + "\n", encoding="utf-8"
    )
    if with_calibration:
        (run / "calibration.json").write_text(json.dumps(CALIBRATION, ensure_ascii=False), encoding="utf-8")
    return run


def test_render_contains_core_fields(tmp_path):
    md = render_run_report(_run_dir(tmp_path))
    assert "20260930-100000" in md
    assert "deepseek-chat-20260901" in md  # judge model 字符串留痕
    assert "事实性/幻觉控制" in md
    assert "INVALID_INPUT" in md  # 错误案例摘录
    assert "回归参考" in md  # 钉版本/局限声明
    assert "900" in md  # 成本披露
    assert "（本次运行尚未做人工校准）" in md  # 无校准文件则校准节为占位说明


def test_render_with_calibration(tmp_path):
    md = render_run_report(_run_dir(tmp_path, with_calibration=True))
    assert "一致率" in md
    assert "72%" in md  # exact_rate 0.72 → 百分比呈现
    assert "95%" in md  # within1_rate 0.95


def test_render_low_score_excerpt(tmp_path):
    md = render_run_report(_run_dir(tmp_path))
    assert "comp-001" in md
    assert "机会点空泛" in md  # 最低维度的 evidence 摘录


def test_render_comparison(tmp_path):
    base = _run_dir(tmp_path)
    cand_summary = {
        **SUMMARY,
        "run_id": "20261001-100000",
        "per_tool": {
            "competitor-analysis": {
                **SUMMARY["per_tool"]["competitor-analysis"],
                "dim_avg": {"factuality": 3.5, "structure": 4.0, "actionability": 2.5, "instruction": 4.0},
            }
        },
    }
    cand = tmp_path / "artifacts" / "20261001-100000"
    cand.mkdir(parents=True)
    (cand / "summary.json").write_text(json.dumps(cand_summary, ensure_ascii=False), encoding="utf-8")
    md = render_comparison_report(base, cand)
    assert "20260930-100000" in md and "20261001-100000" in md
    assert "+0.50" in md
