"""确定性结构检查：用代码判定输出契约的遵守，不依赖 LLM 判断。

这是评分链的硬一层——JSON 契约（数量守恒、quotes 逐字）与章节结构
都能机械验证；LLM-as-judge 只负责契约之外的语义质量。
"""

import json

from .model import Case

FAILURE_MARK = "[生成失败"

_COMPETITOR_SECTIONS = (
    "一、分析目的",
    "二、市场与竞品选择",
    "三、竞品画像",
    "四、功能矩阵与体验对比",
    "五、差异化与机会点",
    "六、信息来源",
)
_PRD_SECTIONS = (
    "一、背景与目标",
    "二、用户与场景",
    "三、用户故事与功能需求",
    "四、流程与交互",
    "五、非功能需求",
    "六、风险与开放问题",
)
_EVIDENCE_MARKS = ("【依据输入】", "【推断】", "【行业常识】")
_SENTIMENTS = {"positive", "negative", "mixed"}


def _strip_fence(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        first_newline = text.find("\n")
        if first_newline != -1:
            text = text[first_newline + 1 :]
        if text.rstrip().endswith("```"):
            text = text.rstrip()[:-3]
    return text.strip()


def _feedback_checks(case: Case, output: str, checks: dict[str, bool]) -> None:
    try:
        data = json.loads(_strip_fence(output))
    except json.JSONDecodeError:
        checks["json_valid"] = False
        return
    if not isinstance(data, dict):
        checks["json_valid"] = False
        return
    checks["json_valid"] = True

    themes = data.get("themes")
    if not isinstance(themes, list) or not 3 <= len(themes) <= 8:
        checks["themes_in_range"] = False
        themes = []
    else:
        checks["themes_in_range"] = True

    dict_themes = [t for t in themes if isinstance(t, dict)]
    sentiments = [t.get("sentiment") for t in dict_themes]
    checks["sentiment_valid"] = bool(dict_themes) and all(s in _SENTIMENTS for s in sentiments)

    feedbacks = case.input.get("feedbacks", [])
    counts = [t.get("count", 0) for t in dict_themes if isinstance(t.get("count"), int)]
    total = sum(counts)
    outliers = data.get("notableOutliers", [])
    checks["count_sum_consistent"] = total == len(feedbacks) or (
        total < len(feedbacks) and bool(outliers)
    )

    joined = "".join(feedbacks)
    quotes = [
        q
        for t in dict_themes
        for q in (t.get("quotes") or [])
        if isinstance(q, str)
    ]
    checks["quotes_verbatim"] = bool(quotes) and all(q in joined for q in quotes)


def structural_checks(case: Case, output: str) -> dict[str, bool]:
    checks: dict[str, bool] = {"no_failure_mark": FAILURE_MARK not in output}
    if case.expect_must_include:
        checks["must_include"] = all(s in output for s in case.expect_must_include)
    if case.tool == "competitor-analysis":
        checks["sections_complete"] = all(f"## {s}" in output for s in _COMPETITOR_SECTIONS)
        checks["evidence_marks_present"] = any(m in output for m in _EVIDENCE_MARKS)
    elif case.tool == "feedback-insights":
        _feedback_checks(case, output, checks)
    elif case.tool == "prd-draft":
        checks["sections_complete"] = all(f"## {s}" in output for s in _PRD_SECTIONS)
        checks["has_tracking"] = "埋点" in output
    return checks
