from pathlib import Path

import pytest
from vault_tools.config import ScanConfig
from vault_tools.index_diff import diff_index
from vault_tools.orphans import detect_orphans
from vault_tools.report import render_report, report_filename
from vault_tools.scan import scan_vault

FIXTURE = Path(__file__).parent / "fixtures" / "demo-vault"


@pytest.fixture(scope="module")
def md():
    cfg = ScanConfig(vault_root=FIXTURE)
    scan = scan_vault(cfg)
    return render_report(scan, detect_orphans(scan, cfg), diff_index(scan, cfg), cfg)


def test_frontmatter_has_source_claude(md):
    assert "source: claude" in md.split("---")[1]


def test_report_lists_true_orphans_full_path(md):
    assert "10-课程/孤儿笔记.md" in md
    assert "20-开发/孤儿2.md" in md


def test_report_lists_dangling(md):
    assert "不存在课" in md


def test_report_has_disambiguation_warning(md):
    assert "README" in md and "消歧" in md


def test_report_undeclared(md):
    assert "语料" in md


def test_filename_format():
    from datetime import datetime, timezone
    name = report_filename(datetime(2026, 9, 28, 10, 0, tzinfo=timezone.utc))
    assert name == "2026-09-28-vault-体检报告.md"
