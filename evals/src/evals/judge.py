"""LLM-as-judge 四维评分器。

钉版本纪律：温度 0；记录 API 返回的 model 字符串与 usage（模型升级导致
的分数漂移因此可被察觉）；分数仅作回归参考。
所有单测走注入 transport + 录制 fixture，本模块自身不发起真实调用。
"""

import json
import urllib.error
import urllib.request
from collections.abc import Callable, Mapping
from dataclasses import dataclass, field

from .config import EvalsConfig
from .model import DIMENSIONS, Case, DimensionScore
from .structural import strip_code_fence

JudgeTransport = Callable[[str, Mapping[str, str], bytes], tuple[int, Mapping[str, str], bytes]]

_SYSTEM_PROMPT = """你是严格的 AI 产品质量评审。对给定输出按四个维度打分（1-5 整数），并引用输出原文作为证据。

维度定义与锚点：
- factuality（事实性/幻觉控制）：5=所有断言可溯源到输入材料，或明确标注【行业常识】并给出核实方式；3=个别断言无来源标注；1=存在编造事实且无任何标注。
- structure（结构完整）：5=严格覆盖该工具产出契约的全部必需模块且内容实质；3=缺 1 个模块或模块空泛；1=缺失大半模块。
- actionability（可操作性）：5=结论具体到可直接执行（有动作、有数值、有负责方）；3=方向正确但空泛；1=全是套话。
- instruction（指令遵守）：5=无证据的结论全部按规范标"待验证"或"【待补充】"，格式契约完全遵守；3=个别遗漏；1=大量违反。

只输出一个 JSON 对象，不要代码围栏，不要解释文字：
{"dimensions": [{"dimension": "factuality", "score": 1, "evidence": "引用原文的具体证据"}, {"dimension": "structure", "score": 1, "evidence": "..."}, {"dimension": "actionability", "score": 1, "evidence": "..."}, {"dimension": "instruction", "score": 1, "evidence": "..."}], "note": "一句话总评"}
dimensions 必须恰好包含 factuality、structure、actionability、instruction 四项，不得重复。"""


class JudgeError(RuntimeError):
    pass


@dataclass
class JudgeOutcome:
    dimensions: tuple[DimensionScore, ...]
    note: str
    model: str  # API 返回的 model 字符串（钉版本留痕）
    usage: dict = field(default_factory=dict)


def build_judge_messages(tool_name: str, case: Case, output: str) -> list[dict]:
    user = (
        f"被评工具：{tool_name}\n"
        f"评测任务：{case.task}（难度：{case.difficulty}）\n\n"
        f"待评输出：\n{output}"
    )
    return [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user", "content": user},
    ]


def parse_judge_response(content: str) -> tuple[tuple[DimensionScore, ...], str]:
    text = strip_code_fence(content)
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise JudgeError(f"评分响应不是 JSON：{exc.msg}；原文前 200 字：{content[:200]}") from exc
    if not isinstance(data, dict) or not isinstance(data.get("dimensions"), list):
        raise JudgeError("评分响应缺 dimensions 列表")

    by_key: dict[str, DimensionScore] = {}
    for item in data["dimensions"]:
        if not isinstance(item, dict):
            raise JudgeError("dimensions 项必须是对象")
        dim = item.get("dimension")
        score = item.get("score")
        evidence = item.get("evidence")
        if dim not in DIMENSIONS:
            raise JudgeError(f"未知维度：{dim!r}")
        if dim in by_key:
            raise JudgeError(f"维度重复：{dim}")
        if not isinstance(score, int) or isinstance(score, bool) or not 1 <= score <= 5:
            raise JudgeError(f"维度 {dim} 的分数必须是 1-5 整数：{score!r}")
        if not isinstance(evidence, str) or not evidence.strip():
            raise JudgeError(f"维度 {dim} 的 evidence 必须非空")
        by_key[dim] = DimensionScore(dimension=dim, score=score, evidence=evidence)

    missing = set(DIMENSIONS) - set(by_key)
    if missing:
        raise JudgeError(f"缺维度：{sorted(missing)}")

    note = data.get("note", "")
    if not isinstance(note, str):
        note = ""
    return tuple(by_key[d] for d in DIMENSIONS), note


def _post(
    url: str, headers: Mapping[str, str], body: bytes, timeout: int
) -> tuple[int, Mapping[str, str], bytes]:
    req = urllib.request.Request(url, data=body, method="POST", headers=dict(headers))
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.headers, resp.read()
    except urllib.error.HTTPError as exc:
        return exc.code, exc.headers, exc.read()
    except urllib.error.URLError as exc:
        reason = getattr(exc, "reason", exc)
        raise JudgeError(f"无法连接评分 API：{reason}") from exc


def call_judge(
    cfg: EvalsConfig,
    tool_name: str,
    case: Case,
    output: str,
    *,
    transport: JudgeTransport | None = None,
    timeout: int = 120,
) -> JudgeOutcome:
    url = f"{cfg.judge_base_url}/chat/completions"
    payload = {
        "model": cfg.judge_model,
        "messages": build_judge_messages(tool_name, case, output),
        "temperature": 0,
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {cfg.judge_api_key}",
    }
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    if transport is None:
        transport = lambda u, h, b: _post(u, h, b, timeout)

    status, _, resp_body = transport(url, headers, body)
    text = resp_body.decode("utf-8", errors="replace")
    if status != 200:
        detail = text[:200]
        try:
            data = json.loads(text)
            if isinstance(data, dict) and isinstance(data.get("error"), dict):
                detail = str(data["error"].get("message", detail))
        except json.JSONDecodeError:
            pass
        raise JudgeError(f"评分 API HTTP {status}：{detail}")

    try:
        data = json.loads(text)
        content = data["choices"][0]["message"]["content"]
    except (json.JSONDecodeError, KeyError, IndexError, TypeError) as exc:
        raise JudgeError(f"评分 API 响应结构异常：{exc}") from exc

    dimensions, note = parse_judge_response(content)
    usage_raw = data.get("usage") or {}
    usage = {k: usage_raw[k] for k in ("prompt_tokens", "completion_tokens") if k in usage_raw}
    return JudgeOutcome(
        dimensions=dimensions,
        note=note,
        model=str(data.get("model", "")),
        usage=usage,
    )
