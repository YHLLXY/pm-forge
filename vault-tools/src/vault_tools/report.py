"""体检报告渲染：输出 markdown（source: claude 标注）。只返回字符串，不碰文件系统。"""

from __future__ import annotations

import subprocess
from datetime import datetime
from zoneinfo import ZoneInfo

from . import __version__
from .config import ScanConfig
from .index_diff import IndexDiffReport
from .model import ScanResult
from .orphans import OrphanReport

_TZ = ZoneInfo("Asia/Shanghai")  # 与 site/astro-paper.config.ts 的 timezone 一致


def report_filename(now: datetime | None = None) -> str:
    now = now or datetime.now(_TZ)
    return f"{now:%Y-%m-%d}-vault-体检报告.md"


def _git_head(vault_root) -> str:
    try:
        out = subprocess.run(
            ["git", "-C", str(vault_root), "rev-parse", "--short", "HEAD"],
            capture_output=True, text=True, timeout=15, check=True,
        )
        return out.stdout.strip()
    except (subprocess.SubprocessError, OSError):
        return "（非 git 仓库或 git 不可用）"


def render_report(scan: ScanResult, orphans: OrphanReport, diff: IndexDiffReport,
                  config: ScanConfig, crosscheck_data: dict | None = None) -> str:
    now = datetime.now(_TZ)
    lines: list[str] = []
    ap = lines.append

    ap("---")
    ap(f"date: {now:%Y-%m-%d}")
    ap("tags:")
    ap("  - 体检报告")
    ap("  - 巡检")
    ap('area: "91-MOC"')
    ap("source: claude")
    ap("---")
    ap("")
    ap("# 🩺 Vault 体检报告")
    ap("")
    ap(f"> 来源：claude（vault-tools v{__version__} 自动巡检）· 生成于 {now:%Y-%m-%d %H:%M} · "
       f"vault HEAD `{_git_head(scan.vault_root)}`")
    ap("")

    # 一、体检结论
    n_missing = sum(len(v) for v in diff.missing_from_index.values())
    ap("## 一、体检结论")
    ap("")
    ap(f"扫描笔记 **{len(scan.notes)}** 篇，链接 **{len(scan.links)}** 条："
       f"🔴 真孤儿 **{len(orphans.true_orphans)}** · 🟠 索引漏收 **{n_missing}** · "
       f"🟡 索引悬空条目 **{len(diff.dangling)}** · ⚪ 豁免未入链 "
       f"**{sum(len(v) for v in orphans.exempt_unlinked.values())}**。")
    ap("")

    # 二、孤立节点
    ap("## 二、孤立节点（零入链）")
    ap("")
    if orphans.true_orphans:
        ap("| 全路径 | 处置 |")
        ap("|---|---|")
        for p in orphans.true_orphans:
            ap(f"| `[[{p[:-3]}]]` | 挂接所属 _Index / 门户口 / MOC，或归类刻意不连 |")
    else:
        ap("无真孤儿。✅")
    ap("")
    ap("### 豁免未入链（不计孤儿，核对豁免是否仍成立）")
    ap("")
    for g, paths in orphans.exempt_unlinked.items():
        shown = "、".join("`" + p + "`" for p in paths[:20])
        ap(f"- `{g}`（{len(paths)} 篇）：{shown}" + ("…（截断）" if len(paths) > 20 else ""))
    ap("")

    # 三、索引双向 diff
    ap("## 三、索引完整性双向 diff")
    ap("")
    ap("### 漏收（文件有、_Index 没有）")
    ap("")
    if diff.missing_from_index:
        for a, paths in sorted(diff.missing_from_index.items()):
            ap(f"- **{a}**：{'、'.join('`' + p + '`' for p in paths)}")
    else:
        ap("无漏收。✅")
    ap("")
    ap("### 悬空（_Index 条目、目标不存在）")
    ap("")
    if diff.dangling:
        ap("| 所在索引文件 | 悬空条目 |")
        ap("|---|---|")
        for lk in diff.dangling:
            ap(f"| `[[{lk.source[:-3]}]]` | `[[{lk.target}]]` |")
    else:
        ap("无悬空条目。✅")
    ap("")
    if diff.no_index_areas:
        ap(f"### 整区无 _Index.md：{'、'.join(diff.no_index_areas)}")
        ap("")

    # 四、消歧警示
    ap("## 四、重名文件与消歧警示")
    ap("")
    if scan.duplicate_stems:
        for stem, paths in sorted(scan.duplicate_stems.items()):
            ap(f"- `{stem}` 同名 ×{len(paths)}：{'、'.join('`' + p + '`' for p in paths)}")
        if orphans.ambiguous_bare:
            ap("- ⚠️ 裸名链接命中同名文件："
               + "、".join("`[[" + b + "]]`" for b in orphans.ambiguous_bare)
               + "——这些链接会「顶包」，本报告按顶包安全方向计入全部同名文件；"
               "建议改写为全路径链接（AGENTS.md 十八节）。")
    else:
        ap("无同名文件。✅")
    ap("")

    # 五、刻意不连声明核对
    ap("## 五、刻意不连声明核对")
    ap("")
    if diff.undeclared_exempt:
        ap("- ⚠️ 以下类别按 AGENTS.md 十八节须在门户口/索引页写明，当前未检出声明："
           + "、".join("`" + c + "`" for c in diff.undeclared_exempt))
    else:
        ap("所有刻意不连类别均已在门户口/索引页声明。✅")
    ap("")

    # 六、扫描参数与方法附注
    ap("## 六、扫描参数与方法附注")
    ap("")
    ap(f"- vault：`{scan.vault_root}`")
    ap(f"- 排除目录：{'、'.join(sorted(config.exclude_dirs))}")
    ap(f"- 豁免 glob：{'、'.join('`' + g + '`' for g in config.exempt_globs)}")
    ap("- 判定规则：AGENTS.md 十八节（①≥1 入链 ②目标必须存在 ③逐篇 wikilink；同名全路径消歧；"
       "刻意不连须声明）。裸名链接按「顶包安全方向」计入全部同名文件——宁可漏报孤儿，不冤枉已挂链笔记。")
    ap("- 静态解析边界：canvas / excalidraw / 别名图谱边不在本报告范围；"
       "Obsidian 图谱以应用内显示为准（验收②由用户对照）。")
    ap("")

    # 七、obsidiantools 对照（可选）
    if crosscheck_data:
        ap("## 七、obsidiantools 对照")
        ap("")
        for k, v in crosscheck_data.items():
            ap(f"- {k}: {v}")
        ap("- 注：obsidiantools 0.11.0 按笔记名键控，同名文件互相顶包，其 isolated/nonexistent "
           "数值仅作参照，与本报告的偏差源于主键模型差异（实测见 pm-forge M4 计划 Task 0）。")
        ap("")

    ap("---")
    ap(f"*本报告由 vault-tools v{__version__} 只读扫描生成，未修改 vault 任何文件。*")
    return "\n".join(lines)
