from pathlib import Path

import pytest
from vault_tools.config import ScanConfig
from vault_tools.index_diff import diff_index
from vault_tools.scan import scan_vault

FIXTURE = Path(__file__).parent / "fixtures" / "demo-vault"


@pytest.fixture(scope="module")
def report():
    cfg = ScanConfig(vault_root=FIXTURE)
    return diff_index(scan_vault(cfg), cfg)


def test_missing_from_index(report):
    assert report.missing_from_index["10-课程"] == ["10-课程/孤儿笔记.md"]
    assert sorted(report.missing_from_index["20-开发"]) == [
        "20-开发/README.md", "20-开发/孤儿2.md",
    ]
    assert "30-项目" not in report.missing_from_index  # 全收录


def test_dangling_entries(report):
    targets = [lk.target for lk in report.dangling]
    assert targets == ["不存在课"]


def test_folder_link_resolves(report):
    # [[子目录A/]] 目录存在 → 不悬空
    assert not [lk for lk in report.dangling if lk.target == "子目录A/"]


def test_no_index_areas_empty(report):
    assert report.no_index_areas == []


def test_undeclared_exempt(report):
    # 夹具首页声明了 runs/ 与 .tools/，没声明 语料
    assert report.undeclared_exempt == ["语料"]
