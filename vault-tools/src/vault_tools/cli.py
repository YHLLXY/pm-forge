"""CLI：三子命令 orphans / indexdiff / report。对 vault 永远只读，输出只写到 --out。"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict
from pathlib import Path

from . import __version__
from .config import ScanConfig
from .index_diff import diff_index
from .model import Link, ScanResult
from .orphans import detect_orphans
from .report import render_report, report_filename
from .scan import scan_vault

DEFAULT_VAULT = r"E:\knowledge home"


def _scan_or_die(args) -> ScanResult | None:
    root = Path(args.vault)
    if not root.is_dir():
        print(f"vault 目录不存在：{root}", file=sys.stderr)
        return None
    return scan_vault(ScanConfig(vault_root=root))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="vault-tools",
        description=f"Obsidian vault 只读巡检三件套 v{__version__}（对 vault 永远只读）",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    def add_common(sp):
        sp.add_argument("--vault", default=DEFAULT_VAULT,
                        help="vault 根目录（默认 E:\\knowledge home）")

    p_o = sub.add_parser("orphans", help="孤立节点检测（JSON → stdout）")
    add_common(p_o)
    p_i = sub.add_parser("indexdiff", help="索引完整性双向 diff（JSON → stdout）")
    add_common(p_i)
    p_r = sub.add_parser("report", help="体检报告（markdown 写到 --out，绝不写 vault）")
    add_common(p_r)
    p_r.add_argument("--out", default="out", help="报告输出目录（默认 ./out；禁止指向 vault 内）")
    p_r.add_argument("--crosscheck", action="store_true", help="追加 obsidiantools 对照节")

    args = parser.parse_args(argv)

    def _conv(v):
        if isinstance(v, Link):
            return asdict(v)
        if isinstance(v, dict):
            return {k: _conv(x) for k, x in v.items()}
        if isinstance(v, list):
            return [_conv(x) for x in v]
        return v

    if args.cmd in ("orphans", "indexdiff"):
        scan = _scan_or_die(args)
        if scan is None:
            return 2
        cfg = ScanConfig(vault_root=Path(args.vault))
        if args.cmd == "orphans":
            data = asdict(detect_orphans(scan, cfg))
        else:
            data = asdict(diff_index(scan, cfg))
        print(json.dumps(_conv(data), ensure_ascii=False, indent=2))
        return 0

    # report
    out_dir = Path(args.out)
    if out_dir.resolve().is_relative_to(Path(args.vault).resolve()):
        print("禁止把 --out 指到 vault 内（只读红线）", file=sys.stderr)
        return 2
    scan = _scan_or_die(args)
    if scan is None:
        return 2
    cfg = ScanConfig(vault_root=Path(args.vault))
    o_report = detect_orphans(scan, cfg)
    i_report = diff_index(scan, cfg)
    cross = None
    if args.crosscheck:
        from .crosscheck import crosscheck
        cross = crosscheck(scan.vault_root)
    md = render_report(scan, o_report, i_report, cfg, crosscheck_data=cross)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / report_filename()
    out_file.write_text(md, encoding="utf-8")
    print(f"体检报告已写出：{out_file}")
    print(f"摘要：真孤儿 {len(o_report.true_orphans)} · 索引漏收 "
          f"{sum(len(v) for v in i_report.missing_from_index.values())} · "
          f"悬空条目 {len(i_report.dangling)}")
    return 0
