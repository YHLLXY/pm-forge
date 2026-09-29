"""client.py 的黑盒合同测试：URL/请求体形状、错误映射、mode 头提取。全程注入 transport，无网络。"""

import json

import pytest
from evals.client import ToolkitError, ToolkitResponse, call_toolkit


def test_happy_path_url_body_and_headers():
    captured = {}

    def transport(url: str, body: bytes):
        captured["url"] = url
        captured["body"] = json.loads(body)
        return 200, {"X-PMForge-Mode": "openai-compatible"}, "报告内容".encode()

    resp = call_toolkit(
        "http://localhost:3000/",  # 尾斜杠应被处理
        "competitor-analysis",
        {"purpose": "测试目的"},
        transport=transport,
    )
    assert isinstance(resp, ToolkitResponse)
    assert resp.text == "报告内容"
    assert resp.mode == "openai-compatible"
    assert resp.duration_ms >= 0
    assert captured["url"] == "http://localhost:3000/api/tools/competitor-analysis"
    assert captured["body"] == {"input": {"purpose": "测试目的"}}


def test_404_json_error_mapped():
    def transport(url: str, body: bytes):
        body_json = json.dumps({"code": "NOT_FOUND", "message": "未知工具：nope"}, ensure_ascii=False)
        return 404, {"Content-Type": "application/json"}, body_json.encode("utf-8")

    with pytest.raises(ToolkitError) as ei:
        call_toolkit("http://x", "nope", {}, transport=transport)
    assert ei.value.code == "NOT_FOUND"
    assert "未知工具" in ei.value.message


def test_400_invalid_input_mapped():
    def transport(url: str, body: bytes):
        body_json = json.dumps({"code": "INVALID_INPUT", "issues": []}, ensure_ascii=False)
        return 400, {}, body_json.encode("utf-8")

    with pytest.raises(ToolkitError) as ei:
        call_toolkit("http://x", "prd-draft", {}, transport=transport)
    assert ei.value.code == "INVALID_INPUT"


def test_non_json_error_becomes_http_code():
    def transport(url: str, body: bytes):
        return 502, {}, b"Bad Gateway"

    with pytest.raises(ToolkitError) as ei:
        call_toolkit("http://x", "t", {}, transport=transport)
    assert ei.value.code == "HTTP_502"


def test_missing_mode_header_is_unknown():
    resp = call_toolkit("http://x", "t", {}, transport=lambda u, b: (200, {}, b"o"))
    assert resp.mode == "unknown"


def test_mode_header_case_insensitive():
    resp = call_toolkit(
        "http://x", "t", {}, transport=lambda u, b: (200, {"x-pmforge-mode": "mock"}, b"o")
    )
    assert resp.mode == "mock"


def test_empty_output_is_valid_response():
    resp = call_toolkit("http://x", "t", {}, transport=lambda u, b: (200, {}, b""))
    assert resp.text == ""
    assert resp.mode == "unknown"
