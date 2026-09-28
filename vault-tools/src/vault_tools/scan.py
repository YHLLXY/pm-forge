"""扫描核心：walk vault、解析 wikilink/md 链接/嵌入、全路径消歧。

消歧规则（顶包安全方向，AGENTS.md 十八节）：
- 裸名 [[X]] 计入所有同名 X 的入链（宁可漏报孤儿，不冤枉已挂链笔记）；
- 命中多个同名 stem 的裸名链接记入 duplicate_stems 供报告警示。
"""

from __future__ import annotations

import fnmatch
import posixpath
import re
from pathlib import Path, PurePosixPath
from urllib.parse import unquote

from .config import MEDIA_EXTS, ScanConfig
from .model import Link, ScanResult

WIKILINK_RE = re.compile(r"(!?)\[\[([^\[\]]+?)\]\]")
MDLINK_RE = re.compile(r"\[[^\[\]]*\]\(([^()\s]+)\)")


def _norm_wikilink_target(inner: str) -> tuple[str, bool]:
    """返回 (规范化目标, 是否自引用)。去别名/锚点/.md。"""
    if inner.startswith("#"):
        return "", True
    target = inner.split("|", 1)[0]
    target = target.split("#", 1)[0]
    target = target.removesuffix(".md")
    return target.strip(), False


def scan_vault(config: ScanConfig) -> ScanResult:
    root = config.vault_root
    result = ScanResult(vault_root=root)

    # 1. 收集笔记（排除目录）
    for p in sorted(root.rglob("*.md")):
        rel = p.relative_to(root)
        if any(part in config.exclude_dirs for part in rel.parts):
            continue
        result.notes.append(rel.as_posix())

    by_path = {n.casefold(): n for n in result.notes}
    by_stem: dict[str, list[str]] = {}
    for n in result.notes:
        by_stem.setdefault(PurePosixPath(n).stem.casefold(), []).append(n)
    result.duplicate_stems = {
        PurePosixPath(paths[0]).stem: paths
        for paths in by_stem.values() if len(paths) > 1
    }

    # 排除目录里的 md（如 90-模板）：不扫描内容，但文件真实存在——
    # 悬空判定须认账，否则 [[90-模板/t-xxx]] 会被误报
    excluded_by_path: dict[str, str] = {}
    for p in sorted(root.rglob("*.md")):
        rel = p.relative_to(root)
        if any(part in config.exclude_dirs for part in rel.parts):
            excluded_by_path[rel.as_posix().casefold()] = rel.as_posix()
    excluded_stems = {PurePosixPath(v).stem.casefold(): v
                      for v in excluded_by_path.values()}

    # 目录集合（folder 链接解析用）
    dirs: set[str] = set()
    for n in result.notes:
        parts = PurePosixPath(n).parts[:-1]
        for i in range(1, len(parts) + 1):
            dirs.add("/".join(parts[:i]))
    for v in excluded_by_path.values():
        parts = PurePosixPath(v).parts[:-1]
        for i in range(1, len(parts) + 1):
            dirs.add("/".join(parts[:i]))

    def _hit(cand: str) -> str | None:
        key = (cand + ".md").casefold()
        if key in by_path:
            return by_path[key]
        if cand.casefold() in by_path:
            return by_path[cand.casefold()]
        if key in excluded_by_path:
            return excluded_by_path[key]
        if cand.casefold() in excluded_by_path:
            return excluded_by_path[cand.casefold()]
        return None

    def resolve_wiki(target: str, source: str) -> tuple[str, ...]:
        """wikilink：裸名 → 全部同名 stem；路径式 → 根路径/相对/Obsidian 式子路径，命中即收。

        子路径匹配可能命中多篇（路径以 target 结尾）——全部计入，保持顶包安全方向。
        """
        if "/" not in target:
            hits = tuple(sorted(by_stem.get(target.casefold(), ())))
            if hits:
                return hits
            ex = excluded_stems.get(target.casefold())
            return (ex,) if ex else ()
        rel = posixpath.normpath(posixpath.join(posixpath.dirname(source), target)) \
            if posixpath.dirname(source) else posixpath.normpath(target)
        cands = {h for h in (_hit(target), _hit(rel)) if h}
        if not cands:
            fold = target.casefold()
            cands.update(n2 for n2 in result.notes
                         if n2[:-3].casefold().endswith("/" + fold))
        return tuple(sorted(cands))

    def resolve_md(target: str, source: str) -> tuple[str, ...]:
        """md 链接是显式文件路径：相对源目录优先，回退 vault 根路径式；不向同名扩散。"""
        rel = posixpath.normpath(posixpath.join(posixpath.dirname(source), target)) \
            if posixpath.dirname(source) else posixpath.normpath(target)
        cands = {h for h in (_hit(rel), _hit(target)) if h}
        return tuple(sorted(cands))

    # 2. 解析链接
    for n in result.notes:
        text = (root / Path(*n.split("/"))).read_text(encoding="utf-8", errors="replace")
        result.texts[n] = text
        for m in WIKILINK_RE.finditer(text):
            raw, inner, embed = m.group(0), m.group(2), m.group(1) == "!"
            target, is_self = _norm_wikilink_target(inner)
            if is_self:
                continue
            if target.endswith("/"):
                # folder 链接：相对 → vault 根式 → 子路径式，命中任何已知目录即算连上
                tt = target.rstrip("/")
                cand_dirs = []
                d_rel = posixpath.normpath(posixpath.join(posixpath.dirname(n), tt))
                if not d_rel.startswith(".."):
                    cand_dirs.append(d_rel)
                cand_dirs.append(posixpath.normpath(tt))
                fold = tt.casefold()
                d_hit = next((d for d in cand_dirs if d in dirs), None)
                if d_hit is None:
                    d_hit = next((d2 for d2 in dirs
                                  if d2.casefold().endswith("/" + fold)), None)
                result.links.append(Link(n, target, raw, "folder",
                                         (d_hit,) if d_hit else ()))
                continue
            if not target:
                continue
            resolved = resolve_wiki(target, n)
            lk = Link(n, target, raw, "embed" if embed else "wikilink", resolved)
            result.links.append(lk)
            if not resolved and Path(target).suffix.lower() not in MEDIA_EXTS:
                result.unresolved.append(lk)
        for m in MDLINK_RE.finditer(text):
            raw_t = m.group(1)
            if raw_t.startswith(("http://", "https://", "file:", "mailto:", "tel:", "#")):
                continue  # 外部协议链接（file: 指向 vault 外磁盘文件）不属图谱
            t = unquote(raw_t).split("#", 1)[0]
            t = t.removesuffix(".md")
            if not t:
                continue
            resolved = resolve_md(t, n)
            lk = Link(n, t, m.group(0), "mdlink", resolved)
            result.links.append(lk)
            if not resolved and Path(t).suffix.lower() not in MEDIA_EXTS:
                result.unresolved.append(lk)

    # 3. 入链表
    for lk in result.links:
        for r in lk.resolved:
            result.inbound.setdefault(r, []).append(lk)

    return result


def is_exempt(path: str, config: ScanConfig) -> bool:
    return any(fnmatch.fnmatch(path, g) for g in config.exempt_globs)
