"""评测集内容验收：数量 / 唯一性 / 难度分布 / 任务实质性 / 边界案例必须留说明。"""

from pathlib import Path

from evals.dataset import difficulty_counts, load_all
from evals.model import TOOL_IDS

DATASETS = Path(__file__).resolve().parents[1] / "datasets"


def _by_tool():
    return load_all(DATASETS)


def test_load_all_three_tools():
    assert set(_by_tool()) == set(TOOL_IDS)


def test_each_tool_at_least_20_cases():
    for tool, cases in _by_tool().items():
        assert len(cases) >= 20, f"{tool} 仅 {len(cases)} 条"


def test_ids_globally_unique():
    ids = [c.id for cases in _by_tool().values() for c in cases]
    assert len(ids) == len(set(ids)), "id 跨文件重复"


def test_each_tool_covers_three_difficulties():
    for tool, cases in _by_tool().items():
        counts = difficulty_counts(cases)
        assert all(v >= 5 for v in counts.values()), (tool, counts)


def test_tasks_substantive():
    for cases in _by_tool().values():
        for c in cases:
            assert len(c.task) >= 8, c.id


def test_inputs_nonempty_objects():
    for cases in _by_tool().values():
        for c in cases:
            assert isinstance(c.input, dict) and c.input, c.id


def test_boundary_cases_documented():
    for cases in _by_tool().values():
        for c in cases:
            if c.difficulty == "边界":
                assert c.notes.strip(), f"{c.id} 边界案例必须用 notes 说明边界点"


def test_feedback_cases_meet_toolkit_minimum():
    # toolkit zod：至少 5 条反馈、单条 ≥2 字符（黑盒合同的下限自检）
    for c in _by_tool()["feedback-insights"]:
        fbs = c.input["feedbacks"]
        assert isinstance(fbs, list) and len(fbs) >= 5, c.id
        assert all(isinstance(f, str) and len(f) >= 2 for f in fbs), c.id


def test_competitor_cases_meet_toolkit_limits():
    # toolkit zod：purpose ≥5、myProduct ≥10、竞品 1-5 家
    for c in _by_tool()["competitor-analysis"]:
        assert len(c.input["purpose"]) >= 5, c.id
        assert len(c.input["myProduct"]) >= 10, c.id
        assert 1 <= len(c.input["competitors"]) <= 5, c.id


def test_prd_cases_meet_toolkit_minimums():
    # toolkit zod：moduleName/requirementName ≥2、background ≥10、users ≥5
    for c in _by_tool()["prd-draft"]:
        assert len(c.input["moduleName"]) >= 2, c.id
        assert len(c.input["requirementName"]) >= 2, c.id
        assert len(c.input["background"]) >= 10, c.id
        assert len(c.input["users"]) >= 5, c.id
