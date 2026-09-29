from evals.model import (
    DIFFICULTIES,
    DIMENSION_LABELS,
    DIMENSIONS,
    TOOL_IDS,
    CaseResult,
)


def test_tool_ids_match_toolkit_registry():
    # toolkit/src/tools/registry.ts 的三个 id，逐字一致（黑盒合同锚点）
    assert TOOL_IDS == ("competitor-analysis", "feedback-insights", "prd-draft")


def test_difficulties_three_levels():
    assert DIFFICULTIES == ("基础", "复杂", "边界")


def test_dimension_labels_cover_all_dimensions():
    assert set(DIMENSION_LABELS) == set(DIMENSIONS)
    assert all(isinstance(v, str) and v for v in DIMENSION_LABELS.values())


def test_case_result_defaults():
    r = CaseResult(
        case_id="comp-001",
        tool="competitor-analysis",
        task="t",
        difficulty="基础",
        status="ok",
        mode="openai-compatible",
        output="o",
        duration_ms=1,
    )
    assert r.structural == {}
    assert r.dimensions == ()
    assert r.judge_model == ""
    assert r.judged_at == ""
    assert r.judge_usage == {}
    assert r.error == ""
