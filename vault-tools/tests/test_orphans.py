from pathlib import Path

import pytest
from vault_tools.config import ScanConfig
from vault_tools.orphans import detect_orphans
from vault_tools.scan import scan_vault

FIXTURE = Path(__file__).parent / "fixtures" / "demo-vault"


@pytest.fixture(scope="module")
def report():
    cfg = ScanConfig(vault_root=FIXTURE)
    return detect_orphans(scan_vault(cfg), cfg)


def test_true_orphans_exact(report):
    assert sorted(report.true_orphans) == ["10-课程/孤儿笔记.md", "20-开发/孤儿2.md"]


def test_exempt_unlinked_grouped(report):
    flat = [p for paths in report.exempt_unlinked.values() for p in paths]
    assert "20-开发/docs/runs/run1.md" in flat
    assert "AGENTS.md" in flat
    # README 们有入链，不在未入链清单
    assert "20-开发/README.md" not in flat


def test_ambiguous_bare_links(report):
    # 裸名链接命中同名文件：README 是；_Index 没有被裸名链接过
    assert report.ambiguous_bare == ["README"]
