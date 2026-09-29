import json
from pathlib import Path

import pytest
from evals.dataset import DatasetError, difficulty_counts, load_all, load_dataset, parse_case
from evals.model import TOOL_IDS, Case

VALID = {
    "id": "comp-001",
    "tool": "competitor-analysis",
    "task": "对比记账应用与竞品的差异化方向",
    "difficulty": "基础",
    "input": {
        "purpose": "为了 Q4 迭代方向做竞品对比",
        "myProduct": "极简记账应用，主打快速记账",
        "competitors": [{"name": "钱迹", "notes": ""}],
    },
}


def _write_jsonl(path: Path, rows: list[object]) -> Path:
    lines = [
        r if isinstance(r, str) else json.dumps(r, ensure_ascii=False) for r in rows
    ]
    path.write_text("\n".join(lines), encoding="utf-8")
    return path


def _parse(obj: object, source: str = "t.jsonl:1"):
    return parse_case(obj, source=source, seen_ids=set())


def test_parse_case_full_fields():
    obj = {
        **VALID,
        "expect": {"must_include": ["证据", "核实"]},
        "notes": "关注证据链标注",
    }
    case = _parse(obj)
    assert isinstance(case, Case)
    assert case.id == "comp-001"
    assert case.expect_must_include == ("证据", "核实")
    assert case.notes == "关注证据链标注"


def test_parse_case_minimal():
    case = _parse(dict(VALID))
    assert case.expect_must_include == ()
    assert case.notes == ""


def test_parse_case_missing_required_key():
    bad = {k: v for k, v in VALID.items() if k != "task"}
    with pytest.raises(DatasetError, match="task"):
        _parse(bad)


def test_parse_case_unknown_tool():
    with pytest.raises(DatasetError, match="未知 tool"):
        _parse({**VALID, "tool": "competitor"})


def test_parse_case_bad_difficulty():
    with pytest.raises(DatasetError, match="difficulty"):
        _parse({**VALID, "difficulty": "简单"})


def test_parse_case_input_not_dict():
    with pytest.raises(DatasetError, match="input"):
        _parse({**VALID, "input": "文本"})


def test_parse_case_duplicate_id():
    with pytest.raises(DatasetError, match="重复"):
        parse_case(dict(VALID), source="t.jsonl:2", seen_ids={"comp-001"})


def test_parse_case_extra_key_rejected():
    with pytest.raises(DatasetError, match="未知键"):
        _parse({**VALID, "expects": {}})


def test_parse_case_bad_id_format():
    with pytest.raises(DatasetError, match="id"):
        _parse({**VALID, "id": "Comp_001"})


def test_load_dataset_line_numbers_and_blank_lines(tmp_path: Path):
    path = tmp_path / "t.jsonl"
    bad = {**VALID, "id": "comp-002", "difficulty": "超难"}
    _write_jsonl(path, [VALID, "", "{not json"])
    with pytest.raises(DatasetError, match="t.jsonl:3"):
        load_dataset(path)
    _write_jsonl(path, [VALID, "", bad])
    with pytest.raises(DatasetError, match="t.jsonl:3"):
        load_dataset(path)


def test_load_dataset_happy_path(tmp_path: Path):
    path = tmp_path / "t.jsonl"
    second = {**VALID, "id": "comp-002", "difficulty": "边界", "notes": "边界点"}
    _write_jsonl(path, [VALID, second])
    cases = load_dataset(path)
    assert [c.id for c in cases] == ["comp-001", "comp-002"]


def test_load_all_rejects_unknown_and_missing(tmp_path: Path):
    good = _write_jsonl(tmp_path / "competitor-analysis.jsonl", [VALID])
    for tool, cid in (("feedback-insights", "fb-001"), ("prd-draft", "prd-001")):
        _write_jsonl(
            tmp_path / f"{tool}.jsonl",
            [{**VALID, "id": cid, "tool": tool}],
        )
    by_tool = load_all(tmp_path)
    assert set(by_tool) == set(TOOL_IDS)
    assert good.exists()

    # 未知文件名（typo 防护）
    _write_jsonl(tmp_path / "comp.jsonl", [VALID])
    with pytest.raises(DatasetError, match="未知文件"):
        load_all(tmp_path)
    (tmp_path / "comp.jsonl").unlink()

    # 缺文件
    (tmp_path / "prd-draft.jsonl").unlink()
    with pytest.raises(DatasetError, match="缺数据集文件"):
        load_all(tmp_path)


def test_difficulty_counts():
    cases = [
        _parse({**VALID, "id": f"c-{i}", "difficulty": d})
        for i, d in enumerate(["基础", "基础", "复杂", "边界"])
    ]
    assert difficulty_counts(cases) == {"基础": 2, "复杂": 1, "边界": 1}
