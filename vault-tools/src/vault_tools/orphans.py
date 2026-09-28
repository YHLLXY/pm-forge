"""孤立节点检测：AGENTS.md 十八节规则①——每篇笔记须 ≥1 条入链。"""

from __future__ import annotations

import fnmatch
from dataclasses import dataclass, field

from .config import ScanConfig
from .model import ScanResult
from .scan import is_exempt


@dataclass
class OrphanReport:
    true_orphans: list[str] = field(default_factory=list)
    exempt_unlinked: dict[str, list[str]] = field(default_factory=dict)
    ambiguous_bare: list[str] = field(default_factory=list)


def detect_orphans(scan: ScanResult, config: ScanConfig) -> OrphanReport:
    report = OrphanReport()
    for n in scan.notes:
        if n in scan.inbound:
            continue
        if is_exempt(n, config):
            for g in config.exempt_globs:
                if fnmatch.fnmatch(n, g):
                    report.exempt_unlinked.setdefault(g, []).append(n)
                    break
        else:
            report.true_orphans.append(n)

    # 消歧警示：裸名链接命中了同名文件
    bare_targets = {
        lk.target for lk in scan.links
        if lk.kind in ("wikilink", "embed") and "/" not in lk.target
    }
    report.ambiguous_bare = sorted(bare_targets & set(scan.duplicate_stems))
    return report
