"""扫描配置。规则出处：E:\\knowledge home\\AGENTS.md 十八节（v2.4）。"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

INDEX_NAME = "_Index.md"

# 完全不进入扫描的目录（模板内假链接会污染图谱；工程噪音不属知识节点）
EXCLUDE_DIRS = frozenset({
    ".git", ".obsidian", ".trash", ".venv", "node_modules",
    "__pycache__", "dist", "build", ".tools", "90-模板",
})

# 豁免孤立判定的 glob（vault 相对 posix 路径，fnmatch）
EXEMPT_GLOBS = (
    "AGENTS.md", "使用说明.md", "应急预案.md", "🏠 首页.md",
    "**/_Index.md",        # 索引页是结构节点
    "**/docs/runs/**",     # 刻意不连：测试产物（AGENTS.md 十八节）
    "**/语料/**",          # 刻意不连：语料
    "**/.tools/**",        # 刻意不连：工具产物
)

# 刻意不连声明核对：AGENTS.md 要求这些类别必须在门户口/索引页写明
DECLARED_CLASSES = ("runs/", "语料", ".tools")

# 根目录元文件（豁免 + 声明核对范围）
META_FILES = ("🏠 首页.md", "AGENTS.md", "使用说明.md", "应急预案.md")

# 媒体/非笔记后缀：嵌入它们不算未解析链接
MEDIA_EXTS = frozenset({
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".pdf", ".mp4",
    ".mp3", ".wav", ".canvas", ".xlsx", ".docx", ".pptx", ".zip", ".excalidraw",
})


@dataclass(frozen=True)
class ScanConfig:
    vault_root: Path
    exclude_dirs: frozenset[str] = EXCLUDE_DIRS
    exempt_globs: tuple[str, ...] = EXEMPT_GLOBS
    index_name: str = INDEX_NAME
    declared_classes: tuple[str, ...] = DECLARED_CLASSES
    meta_files: tuple[str, ...] = META_FILES
