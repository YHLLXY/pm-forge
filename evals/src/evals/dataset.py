"""评测集 JSONL 加载与严格校验。

数据文件入 git（自造真实任务，无隐私）；校验在加载时一次性完成，
非法记录的消息含「文件名:行号」，可直接定位修改。
"""

import json
import re
from pathlib import Path

from .model import DIFFICULTIES, TOOL_IDS, Case

_REQUIRED_KEYS = {"id", "tool", "task", "difficulty", "input"}
_OPTIONAL_KEYS = {"expect", "notes"}
_ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")


class DatasetError(ValueError):
    """评测集结构非法。"""


def _err(source: str, msg: str) -> DatasetError:
    return DatasetError(f"{source}: {msg}")


def parse_case(obj: object, *, source: str, seen_ids: set[str]) -> Case:
    if not isinstance(obj, dict):
        raise _err(source, "记录必须是 JSON 对象")
    missing = _REQUIRED_KEYS - obj.keys()
    if missing:
        raise _err(source, f"缺必填键：{sorted(missing)}")
    extra = obj.keys() - _REQUIRED_KEYS - _OPTIONAL_KEYS
    if extra:
        raise _err(source, f"含未知键（防 typo）：{sorted(extra)}")

    case_id = obj["id"]
    if not isinstance(case_id, str) or not _ID_RE.match(case_id):
        raise _err(source, f"id 须匹配 ^[a-z0-9][a-z0-9-]*$：{case_id!r}")
    if case_id in seen_ids:
        raise _err(source, f"id 重复：{case_id}")
    if obj["tool"] not in TOOL_IDS:
        raise _err(source, f"未知 tool：{obj['tool']!r}（合法：{TOOL_IDS}）")
    if obj["difficulty"] not in DIFFICULTIES:
        raise _err(source, f"difficulty 须为 {DIFFICULTIES} 之一：{obj['difficulty']!r}")
    if not isinstance(obj["task"], str) or not obj["task"].strip():
        raise _err(source, "task 必须是非空字符串")
    if not isinstance(obj["input"], dict):
        raise _err(source, "input 必须是对象（dict）")

    must_include: tuple[str, ...] = ()
    expect = obj.get("expect")
    if expect is not None:
        if not isinstance(expect, dict):
            raise _err(source, "expect 必须是对象")
        mi = expect.get("must_include", [])
        if not isinstance(mi, list) or not all(isinstance(s, str) for s in mi):
            raise _err(source, "expect.must_include 必须是字符串列表")
        must_include = tuple(mi)
    notes = obj.get("notes", "")
    if not isinstance(notes, str):
        raise _err(source, "notes 必须是字符串")

    seen_ids.add(case_id)
    return Case(
        id=case_id,
        tool=obj["tool"],
        task=obj["task"],
        difficulty=obj["difficulty"],
        input=obj["input"],
        expect_must_include=must_include,
        notes=notes,
    )


def load_dataset(path: Path) -> list[Case]:
    cases: list[Case] = []
    seen: set[str] = set()
    for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        source = f"{path.name}:{lineno}"
        try:
            obj = json.loads(line)
        except json.JSONDecodeError as exc:
            raise _err(source, f"JSON 解析失败：{exc.msg}") from exc
        cases.append(parse_case(obj, source=source, seen_ids=seen))
    return cases


def load_all(datasets_dir: Path) -> dict[str, list[Case]]:
    """加载 <tool>.jsonl 三件套；多余文件名与缺失文件都拒绝（typo 防护）。"""
    found = {p.name for p in datasets_dir.glob("*.jsonl")}
    expected = {f"{t}.jsonl" for t in TOOL_IDS}
    extra = sorted(found - expected)
    if extra:
        raise DatasetError(f"数据集目录含未知文件（防 typo）：{extra}")
    missing = sorted(expected - found)
    if missing:
        raise DatasetError(f"缺数据集文件：{missing}")
    return {t: load_dataset(datasets_dir / f"{t}.jsonl") for t in TOOL_IDS}


def difficulty_counts(cases: list[Case]) -> dict[str, int]:
    counts = dict.fromkeys(DIFFICULTIES, 0)
    for c in cases:
        counts[c.difficulty] += 1
    return counts
