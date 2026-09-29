"""cli.py 测试：validate / run --dry-run / 成本门。数据集用临时目录，不触碰真实 datasets。"""

import json
from pathlib import Path

import pytest
from evals import cli


def make_datasets(tmp_path: Path) -> Path:
    ds = tmp_path / "ds"
    ds.mkdir()
    rows = {
        "competitor-analysis": {
            "id": "comp-900", "tool": "competitor-analysis", "task": "校验用任务描述",
            "difficulty": "基础",
            "input": {"purpose": "校验目的", "myProduct": "校验产品描述足够长", "competitors": [{"name": "A"}]},
        },
        "feedback-insights": {
            "id": "fb-900", "tool": "feedback-insights", "task": "校验用任务描述",
            "difficulty": "复杂",
            "input": {"feedbacks": ["一", "二", "三", "四", "五"]},
        },
        "prd-draft": {
            "id": "prd-900", "tool": "prd-draft", "task": "校验用任务描述",
            "difficulty": "边界",
            "input": {"moduleName": "模块", "requirementName": "需求", "background": "校验背景描述足够长", "users": "校验用户"},
        },
    }
    for tool, row in rows.items():
        (ds / f"{tool}.jsonl").write_text(
            json.dumps(row, ensure_ascii=False) + "\n", encoding="utf-8"
        )
    return ds


def test_validate_ok(tmp_path, capsys):
    rc = cli.main(["validate", "--datasets", str(make_datasets(tmp_path))])
    assert rc == 0
    out = capsys.readouterr().out
    assert "competitor-analysis" in out
    assert "校验通过" in out


def test_validate_bad_dataset_line_number(tmp_path, capsys):
    ds = make_datasets(tmp_path)
    path = ds / "competitor-analysis.jsonl"
    bad = json.loads(path.read_text(encoding="utf-8"))
    bad["difficulty"] = "超难"
    lines = path.read_text(encoding="utf-8").splitlines()
    path.write_text("\n".join([lines[0], json.dumps(bad, ensure_ascii=False)]), encoding="utf-8")
    rc = cli.main(["validate", "--datasets", str(ds)])
    assert rc == 1
    assert "competitor-analysis.jsonl:2" in capsys.readouterr().err


def test_run_dry_run_prints_plan_without_key(tmp_path, capsys, monkeypatch):
    monkeypatch.setenv("LLM_API_KEY", "")
    rc = cli.main(["run", "--dry-run", "--datasets", str(make_datasets(tmp_path))])
    assert rc == 0
    assert "--yes" in capsys.readouterr().out


def test_run_blocked_without_yes(tmp_path, capsys, monkeypatch):
    monkeypatch.setenv("LLM_API_KEY", "sk-test")
    rc = cli.main(["run", "--datasets", str(make_datasets(tmp_path))])
    assert rc == 1
    assert "--yes" in capsys.readouterr().err


def test_unknown_command_exits_2(capsys):
    with pytest.raises(SystemExit) as ei:
        cli.main(["nope"])
    assert ei.value.code == 2
