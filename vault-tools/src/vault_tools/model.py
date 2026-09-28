"""数据模型。路径统一为 vault 相对 posix 字符串（含 .md）。"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path


@dataclass(frozen=True)
class Link:
    source: str                # 规范路径
    target: str                # 规范化目标（去锚点/别名/.md，URI 已解码）
    raw: str
    kind: str                  # "wikilink" | "embed" | "mdlink" | "folder"
    resolved: tuple[str, ...] = ()   # folder 类 = 存在的目录路径


@dataclass
class ScanResult:
    vault_root: Path
    notes: list[str] = field(default_factory=list)
    links: list[Link] = field(default_factory=list)
    inbound: dict[str, list[Link]] = field(default_factory=dict)
    unresolved: list[Link] = field(default_factory=list)
    duplicate_stems: dict[str, list[str]] = field(default_factory=dict)
    texts: dict[str, str] = field(default_factory=dict)
