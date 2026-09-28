"""obsidiantools 对照层（可选依赖）。

实测（M4 计划 Task 0）：obsidiantools 0.11.0 按笔记名键控，同名文件互相顶包，
其 isolated/nonexistent 数值仅作参照，不作裁决；全路径扫描才是事实源。
"""

from __future__ import annotations

from pathlib import Path

NOTE = ("obsidiantools 0.11.0 按笔记名键控，同名文件互相顶包；其 isolated/nonexistent "
        "数值仅作参照，与全路径扫描的偏差源于主键模型差异")


def crosscheck(vault_root: Path) -> dict:
    try:
        import obsidiantools.api as otools
    except ImportError:
        return {"status": "skipped",
                "reason": "obsidiantools 未安装（可选依赖：pip install -e '.[crosscheck]'）"}
    v = otools.Vault(Path(vault_root)).connect().gather()
    ot_names = set(v.md_file_index)
    return {
        "status": "ok",
        "ot_note_count": len(ot_names),
        "ot_isolated_count": len(v.isolated_notes),
        "ot_nonexistent_count": len(v.nonexistent_notes),
        "note": NOTE,
    }
