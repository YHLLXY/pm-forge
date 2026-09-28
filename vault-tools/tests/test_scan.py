from pathlib import Path

import pytest
from vault_tools.config import ScanConfig
from vault_tools.scan import scan_vault

FIXTURE = Path(__file__).parent / "fixtures" / "demo-vault"


@pytest.fixture(scope="module")
def scan():
    return scan_vault(ScanConfig(vault_root=FIXTURE))


def test_notes_exclude_template_dir(scan):
    assert "90-模板/模板.md" not in scan.notes
    assert len(scan.notes) == 16


def test_note_paths_are_posix_relative_with_md(scan):
    assert "10-课程/子目录A/子目录笔记.md" in scan.notes


def test_wikilink_full_path(scan):
    lk = [l for l in scan.links if l.source == "🏠 首页.md" and l.target == "10-课程/_Index"]
    assert lk and lk[0].resolved == ("10-课程/_Index.md",)


def test_wikilink_bare_name_attributes_all_same_stem(scan):
    # [[README]]（裸名，来自 工具笔记）顶包安全方向：两个 README 都计入入链
    for p in ("20-开发/README.md", "30-项目/README.md"):
        srcs = [l.source for l in scan.inbound[p]]
        assert "20-开发/工具笔记.md" in srcs
    # 路径式链接保持精确：[[20-开发/README]] 只命中 20-开发 那篇
    srcs = [l.source for l in scan.inbound["30-项目/README.md"]]
    assert "🏠 首页.md" not in srcs
    assert set(scan.duplicate_stems) == {"README", "_Index"}


def test_mdlink_relative_is_precise(scan):
    # [说明](./README.md) 是显式相对路径，不向同名扩散
    srcs = [l.source for l in scan.inbound["30-项目/README.md"] if l.kind == "mdlink"]
    assert srcs == []


def test_wikilink_anchor_alias(scan):
    # [[课程A#第二章|跳转]] → 课程A.md
    srcs = [l.source for l in scan.inbound["10-课程/课程A.md"] if l.kind == "wikilink"]
    assert "10-课程/子目录A/_Index.md" in srcs


def test_mdlink_relative(scan):
    srcs = [l.source for l in scan.inbound["10-课程/课程B.md"]]
    assert "10-课程/课程A.md" in srcs


def test_mdlink_url_encoded(scan):
    # [课程A](../10-课程/%E8%AF%BE%E7%A8%8BA.md)
    srcs = [l.source for l in scan.inbound["10-课程/课程A.md"] if l.kind == "mdlink"]
    assert "30-项目/门户口.md" in srcs


def test_template_fake_link_not_scanned(scan):
    assert not [l for l in scan.links if l.target == "假链接"]


def test_media_embed_not_unresolved():
    # 规范化只剥锚点/别名/.md；媒体后缀保留，由 MEDIA_EXTS 判定
    from vault_tools.scan import _norm_wikilink_target
    assert _norm_wikilink_target("img.png")[0] == "img.png"
    assert _norm_wikilink_target("笔记#标题|别名")[0] == "笔记"


def test_media_embed_not_in_unresolved(tmp_path):
    (tmp_path / "a.md").write_text("![[img.png]]", encoding="utf-8")
    (tmp_path / "img.png").write_bytes(b"x")
    scan = scan_vault(ScanConfig(vault_root=tmp_path))
    assert scan.unresolved == []


def test_inbound_self_anchor_ignored(scan):
    # [[#自身锚点]] 不产生链接
    assert not [l for l in scan.links if l.target == ""]


def test_external_file_scheme_links_skipped(tmp_path):
    # file:/// 指向 vault 外磁盘文件，不属图谱，不算悬空
    (tmp_path / "a.md").write_text("[试卷](file:///D:/homework/x.docx)", encoding="utf-8")
    scan = scan_vault(ScanConfig(vault_root=tmp_path))
    assert scan.links == []
    assert scan.unresolved == []


def test_folder_link_root_form(tmp_path):
    # [[A/]] 根目录式 folder 链接：目录存在即连上，不再误判悬空
    (tmp_path / "A").mkdir()
    (tmp_path / "A" / "a.md").write_text("x", encoding="utf-8")
    (tmp_path / "B").mkdir()
    (tmp_path / "B" / "_Index.md").write_text("- [[A/]]\n- [[B/]]\n- [[不存在/]]\n", encoding="utf-8")
    scan = scan_vault(ScanConfig(vault_root=tmp_path))
    fol = {l.target: bool(l.resolved) for l in scan.links if l.kind == "folder"}
    assert fol == {"A/": True, "B/": True, "不存在/": False}


def test_excluded_dir_notes_resolve_for_dangling(tmp_path):
    # 90-模板 被排除扫描，但模板文件真实存在——链接指向它不算悬空
    tpl = tmp_path / "90-模板"
    tpl.mkdir()
    (tpl / "t-每日日志.md").write_text("模板", encoding="utf-8")
    (tmp_path / "_Index.md").write_text("- [[90-模板/t-每日日志]]\n- [[t-每日日志]]\n- [[真不存在]]\n", encoding="utf-8")
    scan = scan_vault(ScanConfig(vault_root=tmp_path))
    resolved_targets = {l.target for l in scan.links if l.resolved}
    assert resolved_targets == {"90-模板/t-每日日志", "t-每日日志"}
    assert [l.target for l in scan.unresolved] == ["真不存在"]
