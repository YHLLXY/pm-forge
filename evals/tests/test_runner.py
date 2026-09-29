"""runner.py 端到端测试：注入 fake client/judge，验证三道守卫、落盘与汇总数学。零网络零 key。"""

import json
from pathlib import Path

import pytest
from evals.client import ToolkitError, ToolkitResponse
from evals.config import load_config
from evals.judge import JudgeError, JudgeOutcome
from evals.model import Case, DimensionScore
from evals.runner import CostGateError, MockModeError, plan_text, run_datasets

DIM_KEYS = ("factuality", "structure", "actionability", "instruction")
SCORES = {
    "comp-001": (4, 5, 3, 5),
    "comp-002": (2, 3, 2, 3),
    "fb-001": (5, 4, 4, 4),
    "prd-001": (3, 3, 3, 3),
}

COMPETITOR_OUT = (
    "# 竞品分析：t\n## 一、分析目的\nx\n## 二、市场与竞品选择\nx（【行业常识】）\n"
    "## 三、竞品画像\nx\n## 四、功能矩阵与体验对比\nx\n## 五、差异化与机会点\nx\n## 六、信息来源\nx\n"
)
FEEDBACK_OUT = json.dumps(
    {
        "themes": [
            {"name": "太长", "sentiment": "negative", "count": 3, "quotes": ["第一条反馈"], "impact": 4, "severity": 4},
            {"name": "太快", "sentiment": "positive", "count": 1, "quotes": ["第四条反馈"], "impact": 2, "severity": 1},
            {"name": "太贵", "sentiment": "negative", "count": 1, "quotes": ["第五条反馈"], "impact": 3, "severity": 3},
        ],
        "overallSentiment": "negative",
        "notableOutliers": [],
    },
    ensure_ascii=False,
)
PRD_OUT = (
    "# PRD：t\n## 一、背景与目标\nx\n## 二、用户与场景\nx\n## 三、用户故事与功能需求\nx\n"
    "## 四、流程与交互\nx\n## 五、非功能需求\n- 埋点：t_clicked\n## 六、风险与开放问题\nx\n"
)
TOOL_OUTPUTS = {
    "competitor-analysis": COMPETITOR_OUT,
    "feedback-insights": FEEDBACK_OUT,
    "prd-draft": PRD_OUT,
}


def _case(cid, tool, difficulty, input_extra):
    return Case(id=cid, tool=tool, task=f"{cid}的任务描述", difficulty=difficulty, input=input_extra)


CASES = {
    "competitor-analysis": [
        _case("comp-001", "competitor-analysis", "基础",
              {"_marker": "comp-001", "purpose": "目的", "myProduct": "产品描述足够长", "competitors": []}),
        _case("comp-002", "competitor-analysis", "边界",
              {"_marker": "comp-002", "purpose": "目的", "myProduct": "产品描述足够长", "competitors": []}),
    ],
    "feedback-insights": [
        _case("fb-001", "feedback-insights", "复杂",
              {"_marker": "fb-001", "feedbacks": ["第一条反馈", "第二条反馈", "第三条反馈", "第四条反馈", "第五条反馈"]}),
    ],
    "prd-draft": [
        _case("prd-001", "prd-draft", "基础",
              {"_marker": "prd-001", "moduleName": "模块", "requirementName": "需求", "background": "背景描述足够长", "users": "用户描述足够长"}),
    ],
}


class FakeClient:
    def __init__(self, mode="openai-compatible", fail_markers=()):
        self.mode = mode
        self.fail_markers = set(fail_markers)
        self.calls: list[str] = []

    def __call__(self, base_url, tool, case_input):
        self.calls.append(tool)
        if case_input.get("_marker") in self.fail_markers:
            raise ToolkitError("INVALID_INPUT", f"模拟失败：{case_input.get('_marker')}")
        return ToolkitResponse(text=TOOL_OUTPUTS[tool], mode=self.mode, duration_ms=5)


class FakeJudge:
    def __init__(self, fail_ids=()):
        self.fail_ids = set(fail_ids)
        self.scored: list[str] = []

    def __call__(self, cfg, tool_name, case, output, **kwargs):
        self.scored.append(case.id)
        if case.id in self.fail_ids:
            raise JudgeError(f"模拟评分失败：{case.id}")
        dims = tuple(
            DimensionScore(dimension=d, score=s, evidence=f"证据-{d}")
            for d, s in zip(DIM_KEYS, SCORES[case.id])
        )
        return JudgeOutcome(
            dimensions=dims, note="ok", model="judge-mock-1",
            usage={"prompt_tokens": 100, "completion_tokens": 10},
        )


class FlakyJudge(FakeJudge):
    """首次评分抛 JudgeError（如畸形 JSON），重试后成功。"""

    def __init__(self):
        super().__init__()
        self.attempts: list[str] = []

    def __call__(self, cfg, tool_name, case, output, **kwargs):
        self.attempts.append(case.id)
        if case.id == "comp-001" and self.attempts.count("comp-001") == 1:
            raise JudgeError("评分响应不是 JSON")
        return super().__call__(cfg, tool_name, case, output, **kwargs)


def cfg_key(tmp_path: Path):
    return load_config(env={"LLM_API_KEY": "sk-test", "EVALS_ARTIFACTS_DIR": str(tmp_path / "artifacts")})


def read_results(run_dir: Path):
    lines = (run_dir / "results.jsonl").read_text(encoding="utf-8").splitlines()
    return [json.loads(line) for line in lines if line.strip()]


def test_plan_text_mentions_counts_and_gate():
    text = plan_text(CASES)
    assert "4 个 case" in text
    assert "--yes" in text
    assert "token" in text


def test_run_requires_key(tmp_path):
    cfg = load_config(env={"LLM_API_KEY": "", "EVALS_ARTIFACTS_DIR": str(tmp_path)})
    with pytest.raises(CostGateError, match="LLM_API_KEY"):
        run_datasets(cfg, CASES, client=FakeClient(), judge=FakeJudge())


def test_run_requires_yes_and_calls_nothing(tmp_path):
    client = FakeClient()
    with pytest.raises(CostGateError, match="--yes"):
        run_datasets(cfg_key(tmp_path), CASES, client=client, judge=FakeJudge())
    assert client.calls == []


def test_mock_mode_guard_aborts_on_first_response(tmp_path):
    client = FakeClient(mode="mock")
    with pytest.raises(MockModeError, match="演示模式"):
        run_datasets(cfg_key(tmp_path), CASES, client=client, judge=FakeJudge(), yes=True)
    assert len(client.calls) == 1


def test_mock_mode_allow_runs(tmp_path):
    run_dir = run_datasets(
        cfg_key(tmp_path), CASES, client=FakeClient(mode="mock"), judge=FakeJudge(),
        yes=True, allow_mock=True,
    )
    results = read_results(run_dir)
    assert all(r["mode"] == "mock" for r in results)


def test_happy_end_to_end(tmp_path):
    judge = FakeJudge()
    run_dir = run_datasets(cfg_key(tmp_path), CASES, client=FakeClient(), judge=judge, yes=True)
    results = read_results(run_dir)
    assert [r["case_id"] for r in results] == ["comp-001", "comp-002", "fb-001", "prd-001"]
    assert all(r["status"] == "ok" for r in results)
    assert all(r["judged_at"] for r in results)

    summary = json.loads((run_dir / "summary.json").read_text(encoding="utf-8"))
    assert summary["judge_model"] == "judge-mock-1"
    assert summary["mode_counter"] == {"openai-compatible": 4}
    assert summary["cost"]["judge_prompt_tokens"] == 400
    assert summary["cost"]["judge_completion_tokens"] == 40

    pt = summary["per_tool"]["competitor-analysis"]
    assert pt["ok_count"] == 2
    assert pt["error_count"] == 0
    assert pt["dim_avg"]["factuality"] == 3.0  # (4+2)/2
    assert pt["dim_avg"]["structure"] == 4.0
    assert pt["dim_avg"]["actionability"] == 2.5
    assert pt["dim_avg"]["instruction"] == 4.0
    assert all(v == 1.0 for v in pt["structural_pass_rate"].values())
    assert judge.scored == ["comp-001", "comp-002", "fb-001", "prd-001"]


def test_toolkit_error_recorded_not_fatal(tmp_path):
    client = FakeClient(fail_markers={"comp-002"})
    run_dir = run_datasets(cfg_key(tmp_path), CASES, client=client, judge=FakeJudge(), yes=True)
    statuses = {r["case_id"]: r["status"] for r in read_results(run_dir)}
    assert statuses == {"comp-001": "ok", "comp-002": "toolkit_error", "fb-001": "ok", "prd-001": "ok"}
    assert "模拟失败" in next(r for r in read_results(run_dir) if r["case_id"] == "comp-002")["error"]

    summary = json.loads((run_dir / "summary.json").read_text(encoding="utf-8"))
    pt = summary["per_tool"]["competitor-analysis"]
    assert pt["ok_count"] == 1
    assert pt["error_count"] == 1
    assert pt["dim_avg"]["factuality"] == 4.0  # 仅 ok 案例计入均分


def test_judge_error_recorded_not_fatal(tmp_path):
    run_dir = run_datasets(cfg_key(tmp_path), CASES, client=FakeClient(), judge=FakeJudge(fail_ids={"fb-001"}), yes=True)
    statuses = {r["case_id"]: r["status"] for r in read_results(run_dir)}
    assert statuses["fb-001"] == "judge_error"
    assert statuses["comp-001"] == "ok"


def test_judge_retried_once_then_ok(tmp_path):
    judge = FlakyJudge()
    run_dir = run_datasets(cfg_key(tmp_path), CASES, client=FakeClient(), judge=judge, yes=True)
    statuses = {r["case_id"]: r["status"] for r in read_results(run_dir)}
    assert statuses["comp-001"] == "ok"  # 重试后成功
    assert judge.attempts.count("comp-001") == 2  # 恰好重试一次


def test_judge_retry_also_fails_recorded(tmp_path):
    class AlwaysBad(FlakyJudge):
        def __call__(self, cfg, tool_name, case, output, **kwargs):
            if case.id == "comp-001":
                self.attempts.append(case.id)
                raise JudgeError("始终畸形")
            return super().__call__(cfg, tool_name, case, output, **kwargs)

    run_dir = run_datasets(cfg_key(tmp_path), CASES, client=FakeClient(), judge=AlwaysBad(), yes=True)
    statuses = {r["case_id"]: r["status"] for r in read_results(run_dir)}
    assert statuses["comp-001"] == "judge_error"


def test_results_incremental_with_structural(tmp_path):
    run_dir = run_datasets(cfg_key(tmp_path), CASES, client=FakeClient(), judge=FakeJudge(), yes=True)
    lines = read_results(run_dir)
    assert len(lines) == 4
    first = lines[0]
    assert first["output"].startswith("# 竞品分析")
    assert first["structural"]["sections_complete"] is True
    assert first["structural"]["no_failure_mark"] is True
    fb = lines[2]
    assert fb["structural"]["json_valid"] is True
    assert fb["structural"]["count_sum_consistent"] is True
    assert fb["structural"]["quotes_verbatim"] is True
