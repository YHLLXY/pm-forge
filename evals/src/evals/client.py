"""toolkit HTTP 黑盒客户端。

被测对象是产品本身的 API 合同（POST /api/tools/{id}），不 import toolkit
任何内部实现；transport 可注入，单测零网络。
"""

import json
import time
import urllib.error
import urllib.request
from collections.abc import Callable, Mapping
from dataclasses import dataclass

Transport = Callable[[str, bytes], tuple[int, Mapping[str, str], bytes]]

_MODE_HEADER = "x-pmforge-mode"


class ToolkitError(RuntimeError):
    def __init__(self, code: str, message: str):
        super().__init__(f"{code}: {message}")
        self.code = code
        self.message = message


@dataclass
class ToolkitResponse:
    text: str
    mode: str
    duration_ms: int


def _post(url: str, body: bytes, timeout: int) -> tuple[int, Mapping[str, str], bytes]:
    req = urllib.request.Request(
        url, data=body, method="POST", headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.headers, resp.read()
    except urllib.error.HTTPError as exc:
        return exc.code, exc.headers, exc.read()
    except urllib.error.URLError as exc:
        reason = getattr(exc, "reason", exc)
        raise ToolkitError("CONNECTION", f"无法连接 toolkit：{reason}") from exc


def call_toolkit(
    base_url: str,
    tool: str,
    case_input: dict,
    *,
    timeout: int = 180,
    transport: Transport | None = None,
) -> ToolkitResponse:
    url = f"{base_url.rstrip('/')}/api/tools/{tool}"
    body = json.dumps({"input": case_input}, ensure_ascii=False).encode("utf-8")
    if transport is None:
        transport = lambda u, b: _post(u, b, timeout)

    started = time.monotonic()
    status, headers, resp_body = transport(url, body)
    duration_ms = int((time.monotonic() - started) * 1000)

    if status != 200:
        text = resp_body.decode("utf-8", errors="replace")
        code, message = f"HTTP_{status}", text[:200]
        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            data = None
        if isinstance(data, dict) and "code" in data:
            code = str(data["code"])
            message = str(data.get("message", message))
        raise ToolkitError(code, message)

    mode = next(
        (v for k, v in headers.items() if k.lower() == _MODE_HEADER),
        "unknown",
    )
    return ToolkitResponse(
        text=resp_body.decode("utf-8", errors="replace"),
        mode=mode,
        duration_ms=duration_ms,
    )
