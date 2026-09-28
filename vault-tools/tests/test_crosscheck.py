from pathlib import Path

import pytest
from vault_tools.crosscheck import crosscheck

FIXTURE = Path(__file__).parent / "fixtures" / "demo-vault"

pytest.importorskip("obsidiantools", reason="可选依赖未安装")


def test_crosscheck_on_fixture():
    data = crosscheck(FIXTURE)
    assert data["status"] == "ok"
    assert data["ot_note_count"] >= 10
    assert "顶包" in data["note"]
