"""runner.py 端到端测试：注入 fake client/judge，验证四道守卫、落盘与汇总数学。零网络零 key。"""

import json
import socket
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

import pytest
from evals import runner as runner_module
from evals.client import ToolkitError, ToolkitResponse
from evals.config import load_config
from evals.judge import JudgeError, JudgeOutcome
from evals.model import Case, DimensionScore
from evals.runner import (
    CostGateError,
    MockModeError,
    ToolkitPreflightError,
    plan_text,
    probe_toolkit,
    rebuild_summary,
    run_datasets,
)

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
            for d, s in zip(DIM_KEYS, SCORES.get(case.id, (3, 3, 3, 3)))
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


@pytest.fixture(autouse=True)
def _stub_preflight(monkeypatch):
    """可达性预检默认走真实网络：单测统一替换为 no-op（run_datasets 内延迟解析模块属性，
    monkeypatch 生效）。预检自身的真实行为在下方 probe_toolkit 专属测试里用本地 server 验证。"""
    monkeypatch.setattr(runner_module, "probe_toolkit", lambda url, **kw: None)


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


def test_preflight_failure_blocks_everything(tmp_path):
    """预检红：任何 case 都不发起、不建 run_dir（防 66 例全 toolkit_error 空跑）。"""
    client = FakeClient()

    def bad_probe(_url):
        raise ToolkitPreflightError("toolkit 服务不可达")

    with pytest.raises(ToolkitPreflightError, match="不可达"):
        run_datasets(cfg_key(tmp_path), CASES, client=client, judge=FakeJudge(), yes=True, probe=bad_probe)
    assert client.calls == []
    assert not (tmp_path / "artifacts").exists() or not list((tmp_path / "artifacts").iterdir())


def test_preflight_receives_configured_base_url(tmp_path):
    seen = []
    run_datasets(cfg_key(tmp_path), CASES, client=FakeClient(), judge=FakeJudge(), yes=True, probe=seen.append)
    assert seen == ["http://localhost:3000"]


class _ProbeHandler(BaseHTTPRequestHandler):
    status = 200

    def do_GET(self):
        self.send_response(self.status)
        self.end_headers()
        self.wfile.write(b"ok")

    def log_message(self, *args):
        pass


def _serve(status: int) -> HTTPServer:
    srv = HTTPServer(("127.0.0.1", 0), type("_Handler", (_ProbeHandler,), {"status": status}))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def test_probe_toolkit_reachable_200():
    srv = _serve(200)
    try:
        probe_toolkit(f"http://127.0.0.1:{srv.server_port}/", timeout=2)
    finally:
        srv.shutdown()
        srv.server_close()


def test_probe_toolkit_http_404_still_reachable():
    """4xx 也算可达：预检只判「服务在不在」，路由/方法错误留给首个 case 暴露。"""
    srv = _serve(404)
    try:
        probe_toolkit(f"http://127.0.0.1:{srv.server_port}/", timeout=2)
    finally:
        srv.shutdown()
        srv.server_close()


def test_probe_toolkit_closed_port_raises():
    sock = socket.socket()
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()  # 留下一个确定无监听的端口
    with pytest.raises(ToolkitPreflightError, match="npm run dev"):
        probe_toolkit(f"http://127.0.0.1:{port}/", timeout=2)


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


def test_structural_pass_rate_not_diluted(tmp_path):
    """must_include 只存在于个别案例：通过率分母应是该检查出现的案例数，不是全部 ok 案例。"""
    cases = {
        "competitor-analysis": [
            Case(id="comp-a", tool="competitor-analysis", task="案例A的任务描述", difficulty="基础",
                 input={"_marker": "comp-a", "purpose": "目的", "myProduct": "产品描述足够长", "competitors": []},
                 expect_must_include=("【行业常识】",)),  # COMPETITOR_OUT 含该标注 → 命中
            Case(id="comp-b", tool="competitor-analysis", task="案例B的任务描述", difficulty="边界",
                 input={"_marker": "comp-b", "purpose": "目的", "myProduct": "产品描述足够长", "competitors": []}),
        ],
    }
    run_dir = run_datasets(cfg_key(tmp_path), cases, client=FakeClient(), judge=FakeJudge(), yes=True)
    summary = json.loads((run_dir / "summary.json").read_text(encoding="utf-8"))
    rates = summary["per_tool"]["competitor-analysis"]["structural_pass_rate"]
    assert rates["must_include"] == 1.0  # 1/1，而非被稀释成 0.5
    assert rates["sections_complete"] == 1.0  # 2/2


def test_rebuild_summary_reproduces(tmp_path):
    run_dir = run_datasets(cfg_key(tmp_path), CASES, client=FakeClient(), judge=FakeJudge(), yes=True)
    original = json.loads((run_dir / "summary.json").read_text(encoding="utf-8"))
    cfg = load_config(env={"LLM_API_KEY": "sk-test", "EVALS_ARTIFACTS_DIR": str(tmp_path / "artifacts")})
    rebuilt = rebuild_summary(run_dir, cfg)
    assert rebuilt["per_tool"] == original["per_tool"]
    assert rebuilt["cost"]["judge_prompt_tokens"] == original["cost"]["judge_prompt_tokens"]
    assert rebuilt["mode_counter"] == original["mode_counter"]
    assert rebuilt["rebuilt_at"]  # 重建标记存在


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
