"""索引完整性双向 diff：AGENTS.md 十八节规则②③。

→ 方向：目录文件有、_Index 没收（漏收）；
← 方向：_Index 条目、文件不存在（悬空）。
"""

from __future__ import annotations

import posixpath
from dataclasses import dataclass, field

from .config import ScanConfig
from .model import Link, ScanResult
from .scan import is_exempt


@dataclass
class IndexDiffReport:
    missing_from_index: dict[str, list[str]] = field(default_factory=dict)
    dangling: list[Link] = field(default_factory=list)
    no_index_areas: list[str] = field(default_factory=list)
    undeclared_exempt: list[str] = field(default_factory=list)


def _area_of(path: str) -> str:
    return path.split("/", 1)[0] if "/" in path else ""


def diff_index(scan: ScanResult, config: ScanConfig) -> IndexDiffReport:
    report = IndexDiffReport()
    index_files = [n for n in scan.notes
                   if posixpath.basename(n) == config.index_name]

    # ← 悬空：_Index 里的条目解析不到目标
    report.dangling = [
        lk for lk in scan.links
        if posixpath.basename(lk.source) == config.index_name and not lk.resolved
    ]

    # 各区收录集：本区任何 _Index（含子目录级）解析出的本区笔记
    areas = {_area_of(n) for n in scan.notes if _area_of(n)}
    has_index = {_area_of(i) for i in index_files}
    report.no_index_areas = sorted(a for a in areas - has_index if a)

    indexed: dict[str, set[str]] = {}
    for lk in scan.links:
        if posixpath.basename(lk.source) != config.index_name:
            continue
        a = _area_of(lk.source)
        for r in lk.resolved:
            if _area_of(r) == a:
                indexed.setdefault(a, set()).add(r)

    # → 漏收：区内的非 _Index、非豁免笔记不在收录集
    for n in scan.notes:
        if posixpath.basename(n) == config.index_name:
            continue
        a = _area_of(n)
        if not a or a not in has_index:
            continue
        if is_exempt(n, config):
            continue
        if n not in indexed.get(a, set()):
            report.missing_from_index.setdefault(a, []).append(n)
    for a in report.missing_from_index:
        report.missing_from_index[a].sort()

    # 刻意不连声明核对：类别字符串须出现在元文件或任何 _Index 原文
    decl_sources = [scan.texts[n] for n in scan.notes
                    if n in config.meta_files
                    or posixpath.basename(n) == config.index_name]
    report.undeclared_exempt = [
        c for c in config.declared_classes
        if not any(c in t for t in decl_sources)
    ]
    return report
