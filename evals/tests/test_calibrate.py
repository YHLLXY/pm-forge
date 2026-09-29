"""calibrate.py 测试：CSV 加载、一致率数学、引用完整性。"""

import pytest
from evals.calibrate import HumanScore, agreement, load_human_scores
from evals.model import DimensionScore

RESULTS = [
    {
        "case_id": "comp-001",
        "status": "ok",
        "dimensions": [
            {"dimension": "factuality", "score": 4, "evidence": "证据一"},
            {"dimension": "structure", "score": 3, "evidence": "证据二"},
        ],
    },
    {"case_id": "fb-001", "status": "toolkit_error", "dimensions": []},
]


def _human(tmp_path, rows):
    path = tmp_path / "human.csv"
    lines = ["case_id,dimension,score,rater,note"]
    lines += rows
    path.write_text("\n".join(lines), encoding="utf-8")
    return path


def test_load_human_scores(tmp_path):
    path = _human(tmp_path, ["comp-001,factuality,4,ai-blind,锚点对照"])
    scores = load_human_scores(path)
    assert scores == [HumanScore(case_id="comp-001", dimension="factuality", score=4, rater="ai-blind", note="锚点对照")]


def test_load_human_scores_rejects_bad_dimension(tmp_path):
    path = _human(tmp_path, ["comp-001,creativity,4,,"])
    with pytest.raises(ValueError, match="dimension"):
        load_human_scores(path)


def test_load_human_scores_rejects_bad_score(tmp_path):
    path = _human(tmp_path, ["comp-001,factuality,9,,"])
    with pytest.raises(ValueError, match="1-5"):
        load_human_scores(path)


def test_agreement_math():
    human = [
        HumanScore("comp-001", "factuality", 4),  # 完全一致
        HumanScore("comp-001", "structure", 1),  # 差 2 → 分歧
    ]
    stats = agreement(RESULTS, human)
    assert stats["pairs"] == 2
    assert stats["exact_rate"] == 0.5
    assert stats["within1_rate"] == 0.5  # structure 差 2，超出 ±1
    assert stats["mean_abs_diff"] == 1.0
    assert stats["per_dimension"]["factuality"]["pairs"] == 1
    assert stats["per_dimension"]["structure"]["mean_abs_diff"] == 2.0
    assert stats["disagreements"] == [
        {"case_id": "comp-001", "dimension": "structure", "model": 3, "human": 1, "evidence": "证据二"}
    ]


def test_agreement_rejects_unknown_case():
    human = [HumanScore("nope-001", "factuality", 4)]
    with pytest.raises(ValueError, match="nope-001"):
        agreement(RESULTS, human)


def test_agreement_rejects_error_case_reference():
    human = [HumanScore("fb-001", "factuality", 4)]
    with pytest.raises(ValueError, match="无模型分"):
        agreement(RESULTS, human)


def test_agreement_empty_pairs_raises():
    with pytest.raises(ValueError, match="无可用校准对"):
        agreement(RESULTS, [])


def test_human_score_model_scores_map():
    # 模型维度分以 results 里的 dimensions 为准
    dims = [DimensionScore(dimension="factuality", score=4, evidence="x")]
    assert [d.dimension for d in dims] == ["factuality"]
