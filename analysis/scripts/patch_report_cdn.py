"""把 Quarto 报告 HTML 里的 jsdelivr CDN 脚本替换为本地文件。

背景：Quarto 渲染的 HTML 会引用 cdn.jsdelivr.net 的 jquery/requirejs，
jsdelivr 在国内不稳定（时好时坏），破坏作品集站"零外部请求"的要求。

用法（仓库根目录）：
    uv run --project analysis python analysis/scripts/patch_report_cdn.py

布局约定（quarto render 输出）：
    analysis/reports/<name>.html
    analysis/reports/<name>_files/    # 静态资源目录

动作：
  1. 把 assets/local-libs/{jquery,requirejs} 拷进 <name>_files/libs/<pkg>/
  2. 把 HTML 中 CDN <script> 的 src 换成相对本地路径，去掉 integrity/crossorigin

注意：`quarto render` 会重建 _files 并重新引入 CDN 引用——重渲染后必须重跑本脚本，
然后再把 reports/ 同步到 site/public/reports/。
"""

from __future__ import annotations

import re
import shutil
from pathlib import Path

ANALYSIS_DIR = Path(__file__).resolve().parent.parent
REPORTS_DIR = ANALYSIS_DIR / "reports"
LOCAL_LIBS = ANALYSIS_DIR / "assets" / "local-libs"

CDN_PATTERN = re.compile(
    r'<script src="https://cdn\.jsdelivr\.net/npm/(?P<pkg>jquery|requirejs)@'
    r'[^"]+"(?P<attrs>[^>]*)></script>'
)
LOCAL_FILES = {
    "jquery": "jquery/jquery.min.js",
    "requirejs": "requirejs/require.min.js",
}


def patch_html(html: Path) -> int:
    stem = html.stem
    files_libs = html.parent / f"{stem}_files" / "libs"
    text = html.read_text(encoding="utf-8")

    def repl(match: re.Match[str]) -> str:
        pkg = match.group("pkg")
        lib_rel = LOCAL_FILES[pkg]
        (files_libs / pkg).mkdir(parents=True, exist_ok=True)
        shutil.copyfile(LOCAL_LIBS / lib_rel, files_libs / lib_rel)
        return f'<script src="{stem}_files/libs/{lib_rel}"></script>'

    new_text, n = CDN_PATTERN.subn(repl, text)
    if n:
        html.write_text(new_text, encoding="utf-8")
    return n


def main() -> None:
    changed = []
    for html in sorted(REPORTS_DIR.glob("*.html")):
        n = patch_html(html)
        if n:
            changed.append(f"{html.relative_to(ANALYSIS_DIR)}（{n} 处 CDN → 本地）")
    if changed:
        print("补丁完成：")
        for c in changed:
            print(f"  - {c}")
    else:
        print("未发现 CDN 引用（可能已打补丁）")


if __name__ == "__main__":
    main()
