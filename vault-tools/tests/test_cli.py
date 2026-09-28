import hashlib
import json
from pathlib import Path

from vault_tools.cli import main

FIXTURE = Path(__file__).parent / "fixtures" / "demo-vault"


def _tree_hash(root: Path) -> dict[str, str]:
    out = {}
    for p in sorted(root.rglob("*")):
        if p.is_file():
            out[str(p.relative_to(root))] = hashlib.sha256(p.read_bytes()).hexdigest()
    return out


def test_orphans_json(capsys):
    rc = main(["orphans", "--vault", str(FIXTURE)])
    data = json.loads(capsys.readouterr().out)
    assert rc == 0
    assert sorted(data["true_orphans"]) == ["10-课程/孤儿笔记.md", "20-开发/孤儿2.md"]


def test_indexdiff_json(capsys):
    rc = main(["indexdiff", "--vault", str(FIXTURE)])
    data = json.loads(capsys.readouterr().out)
    assert rc == 0
    assert data["missing_from_index"]["10-课程"] == ["10-课程/孤儿笔记.md"]


def test_report_writes_file_outside_vault(tmp_path, capsys):
    before = _tree_hash(FIXTURE)
    rc = main(["report", "--vault", str(FIXTURE), "--out", str(tmp_path)])
    after = _tree_hash(FIXTURE)
    assert rc == 0
    assert before == after, "扫描运行修改了 vault —— 违反只读红线"
    files = list(tmp_path.glob("*.md"))
    assert len(files) == 1 and "体检报告" in files[0].name
    assert "source: claude" in files[0].read_text(encoding="utf-8")


def test_report_out_inside_vault_rejected(tmp_path, capsys):
    rc = main(["report", "--vault", str(FIXTURE), "--out", str(FIXTURE / "sub")])
    assert rc == 2


def test_bad_vault_exits_2(capsys):
    rc = main(["orphans", "--vault", "Z:/不存在的库"])
    assert rc == 2
