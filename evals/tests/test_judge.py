"""judge.py 测试：请求形状、钉版本留痕、响应解析（干净/围栏/畸形）。零网络、零 key。"""

import json
from copy import deepcopy

import pytest
from evals.config import load_config
from evals.judge import JudgeError, build_judge_messages, call_judge, parse_judge_response
from evals.model import DIMENSIONS, Case

CASE = Case(
    id="comp-001",
    tool="competitor-analysis",
    task="对比竞品的差异化方向",
    difficulty="基础",
    input={"purpose": "测试目的", "myProduct": "测试产品描述", "competitors": []},
)

JUDGE_JSON = {
    "dimensions": [
        {"dimension": "factuality", "score": 4, "evidence": "断言均有标注"},
        {"dimension": "structure", "score": 5, "evidence": "六章齐全"},
        {"dimension": "actionability", "score": 3, "evidence": "机会点偏空泛"},
        {"dimension": "instruction", "score": 5, "evidence": "无证据处均标待验证"},
    ],
    "note": "整体可用",
}

API_RESPONSE = {
    "choices": [{"message": {"content": json.dumps(JUDGE_JSON, ensure_ascii=False)}}],
    "model": "judge-x-20260901",
    "usage": {"prompt_tokens": 900, "completion_tokens": 200},
}


def _cfg():
    return load_config(
        env={
            "LLM_API_KEY": "sk-test",
            "LLM_BASE_URL": "https://judge.example",
            "LLM_MODEL": "judge-x",
        }
    )


def _api_payload(content: str) -> dict:
    resp = deepcopy(API_RESPONSE)
    resp["choices"][0]["message"]["content"] = content
    return resp


def test_parse_clean_json():
    dims, note = parse_judge_response(json.dumps(JUDGE_JSON, ensure_ascii=False))
    assert [d.dimension for d in dims] == list(DIMENSIONS)  # 按稳定键排序
    assert dims[0].score == 4
    assert dims[0].evidence == "断言均有标注"
    assert note == "整体可用"


def test_parse_fenced_json():
    content = "```json\n" + json.dumps(JUDGE_JSON, ensure_ascii=False) + "\n```"
    dims, _ = parse_judge_response(content)
    assert len(dims) == 4


def test_parse_missing_dimension_raises():
    bad = {"dimensions": JUDGE_JSON["dimensions"][:3], "note": "x"}
    with pytest.raises(JudgeError, match="缺维度"):
        parse_judge_response(json.dumps(bad, ensure_ascii=False))


def test_parse_unknown_dimension_raises():
    bad = deepcopy(JUDGE_JSON)
    bad["dimensions"][0]["dimension"] = "creativity"
    with pytest.raises(JudgeError, match="未知维度"):
        parse_judge_response(json.dumps(bad, ensure_ascii=False))


def test_parse_score_out_of_range():
    bad = deepcopy(JUDGE_JSON)
    bad["dimensions"][0]["score"] = 6
    with pytest.raises(JudgeError, match="1-5"):
        parse_judge_response(json.dumps(bad, ensure_ascii=False))


def test_parse_score_not_int():
    bad = deepcopy(JUDGE_JSON)
    bad["dimensions"][0]["score"] = "4"
    with pytest.raises(JudgeError, match="整数"):
        parse_judge_response(json.dumps(bad, ensure_ascii=False))


def test_parse_empty_evidence_raises():
    bad = deepcopy(JUDGE_JSON)
    bad["dimensions"][0]["evidence"] = "  "
    with pytest.raises(JudgeError, match="evidence"):
        parse_judge_response(json.dumps(bad, ensure_ascii=False))


def test_parse_duplicate_dimension_raises():
    bad = deepcopy(JUDGE_JSON)
    bad["dimensions"].append(dict(bad["dimensions"][0]))
    with pytest.raises(JudgeError, match="重复"):
        parse_judge_response(json.dumps(bad, ensure_ascii=False))


def test_parse_garbage_raises():
    with pytest.raises(JudgeError):
        parse_judge_response("完全不是 JSON 的回答")


def test_build_judge_messages_contains_rubric():
    msgs = build_judge_messages("竞品分析", CASE, "输出文本")
    assert [m["role"] for m in msgs] == ["system", "user"]
    for dim in DIMENSIONS:
        assert dim in msgs[0]["content"]
    assert "竞品分析" in msgs[1]["content"]
    assert "输出文本" in msgs[1]["content"]


def test_call_judge_request_shape_and_outcome():
    captured = {}

    def transport(url, headers, body):
        captured["url"] = url
        captured["headers"] = dict(headers)
        captured["payload"] = json.loads(body)
        return 200, {}, json.dumps(API_RESPONSE, ensure_ascii=False).encode("utf-8")

    outcome = call_judge(_cfg(), "竞品分析", CASE, "# 输出\n内容", transport=transport)
    assert captured["url"] == "https://judge.example/chat/completions"
    assert captured["headers"]["Authorization"] == "Bearer sk-test"
    assert captured["payload"]["temperature"] == 0  # 钉版本纪律：温度 0
    assert captured["payload"]["model"] == "judge-x"
    assert outcome.model == "judge-x-20260901"  # API 返回的 model 字符串留痕
    assert outcome.usage == {"prompt_tokens": 900, "completion_tokens": 200}
    assert outcome.note == "整体可用"
    assert [d.dimension for d in outcome.dimensions] == list(DIMENSIONS)


def test_call_judge_fenced_content_ok():
    content = "```json\n" + json.dumps(JUDGE_JSON, ensure_ascii=False) + "\n```"
    outcome = call_judge(
        _cfg(), "竞品分析", CASE, "输出", transport=lambda u, h, b: (200, {}, json.dumps(_api_payload(content), ensure_ascii=False).encode("utf-8"))
    )
    assert len(outcome.dimensions) == 4


def test_call_judge_api_error():
    def transport(url, headers, body):
        return 401, {}, json.dumps({"error": {"message": "bad key"}}, ensure_ascii=False).encode("utf-8")

    with pytest.raises(JudgeError, match="401"):
        call_judge(_cfg(), "竞品分析", CASE, "输出", transport=transport)
