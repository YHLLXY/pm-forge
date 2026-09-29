"""structural.py 的确定性结构检查测试：正例、反例、围栏 JSON、边界语义。"""

import json

from evals.model import Case
from evals.structural import structural_checks


def _case(tool, input=None, must=()):
    return Case(
        id=f"{tool}-t",
        tool=tool,
        task="测试任务",
        difficulty="基础",
        input=input or {},
        expect_must_include=tuple(must),
    )


COMPETITOR_OK = """# 竞品分析：测试
## 一、分析目的
内容
## 二、市场与竞品选择
- A（【行业常识】，建议核实）
## 三、竞品画像
表格
## 四、功能矩阵与体验对比
表格
## 五、差异化与机会点
机会
## 六、信息来源
来源
"""

FEEDBACK_INPUT = {"feedbacks": ["加载特别慢", "一直转圈", "界面很好看", "客服回复快"]}
FEEDBACK_DATA = {
    "themes": [
        {
            "name": "太慢",
            "summary": "加载慢",
            "sentiment": "negative",
            "count": 2,
            "quotes": ["加载特别慢", "一直转圈"],
            "impact": 4,
            "severity": 4,
            "opportunities": ["优化加载"],
        },
        {
            "name": "好看",
            "summary": "界面好",
            "sentiment": "positive",
            "count": 1,
            "quotes": ["界面很好看"],
            "impact": 2,
            "severity": 1,
            "opportunities": ["保持"],
        },
        {
            "name": "服务好",
            "summary": "客服好",
            "sentiment": "positive",
            "count": 1,
            "quotes": ["客服回复快"],
            "impact": 2,
            "severity": 1,
            "opportunities": ["保持服务标准"],
        },
    ],
    "overallSentiment": "negative",
    "notableOutliers": [],
}


def _feedback_output(data=None, fenced=False):
    text = json.dumps(data if data is not None else FEEDBACK_DATA, ensure_ascii=False)
    return f"```json\n{text}\n```" if fenced else text


def test_no_failure_mark_all_tools():
    ok = structural_checks(_case("competitor-analysis"), COMPETITOR_OK)
    assert ok["no_failure_mark"] is True
    bad = structural_checks(_case("competitor-analysis"), COMPETITOR_OK + "\n\n[生成失败：超时]")
    assert bad["no_failure_mark"] is False


def test_must_include_optional():
    res = structural_checks(_case("competitor-analysis", must=("【行业常识】",)), COMPETITOR_OK)
    assert res["must_include"] is True
    res2 = structural_checks(_case("competitor-analysis", must=("【依据输入】",)), COMPETITOR_OK)
    assert res2["must_include"] is False
    res3 = structural_checks(_case("competitor-analysis"), COMPETITOR_OK)
    assert "must_include" not in res3


def test_competitor_sections_and_evidence():
    res = structural_checks(_case("competitor-analysis"), COMPETITOR_OK)
    assert res["sections_complete"] is True
    assert res["evidence_marks_present"] is True
    res2 = structural_checks(
        _case("competitor-analysis"), COMPETITOR_OK.replace("## 六、信息来源\n来源\n", "")
    )
    assert res2["sections_complete"] is False


def test_feedback_valid_json_all_checks():
    res = structural_checks(_case("feedback-insights", FEEDBACK_INPUT), _feedback_output())
    assert res["json_valid"] is True
    assert res["themes_in_range"] is True  # 3 主题，在契约 3-8 区间
    assert res["sentiment_valid"] is True
    assert res["count_sum_consistent"] is True  # 2+1+1 == 4 条反馈
    assert res["quotes_verbatim"] is True


def test_feedback_fenced_json_parses():
    res = structural_checks(_case("feedback-insights", FEEDBACK_INPUT), _feedback_output(fenced=True))
    assert res["json_valid"] is True


def test_feedback_theme_range_enforced():
    import copy

    data = copy.deepcopy(FEEDBACK_DATA)
    data["themes"] = data["themes"][:2]  # 2 主题，低于契约下限 3
    res = structural_checks(_case("feedback-insights", FEEDBACK_INPUT), _feedback_output(data))
    assert res["themes_in_range"] is False


def test_feedback_count_sum_wrong():
    import copy

    data = copy.deepcopy(FEEDBACK_DATA)
    data["themes"][0]["count"] = 5  # 5+1=6 != 3，且 outliers 为空
    res = structural_checks(_case("feedback-insights", FEEDBACK_INPUT), _feedback_output(data))
    assert res["count_sum_consistent"] is False


def test_feedback_count_sum_with_outliers_ok():
    import copy

    data = copy.deepcopy(FEEDBACK_DATA)
    data["themes"][0]["count"] = 1  # 1+1=2 < 3，但有 outliers 兜底
    data["notableOutliers"] = ["第3条未归入主题"]
    res = structural_checks(_case("feedback-insights", FEEDBACK_INPUT), _feedback_output(data))
    assert res["count_sum_consistent"] is True


def test_feedback_quote_not_verbatim():
    import copy

    data = copy.deepcopy(FEEDBACK_DATA)
    data["themes"][0]["quotes"] = ["加载非常慢"]  # 原文是「加载特别慢」
    res = structural_checks(_case("feedback-insights", FEEDBACK_INPUT), _feedback_output(data))
    assert res["quotes_verbatim"] is False


def test_feedback_invalid_json_no_downstream_checks():
    res = structural_checks(_case("feedback-insights", FEEDBACK_INPUT), "不是 JSON 输出")
    assert res["json_valid"] is False
    assert "themes_in_range" not in res
    assert "quotes_verbatim" not in res


def test_prd_sections_and_tracking():
    prd = (
        "# PRD：测试\n## 一、背景与目标\nx\n## 二、用户与场景\nx\n"
        "## 三、用户故事与功能需求\nx\n## 四、流程与交互\nx\n"
        "## 五、非功能需求\n- 埋点：export_clicked\n## 六、风险与开放问题\nx\n"
    )
    res = structural_checks(_case("prd-draft"), prd)
    assert res["sections_complete"] is True
    assert res["has_tracking"] is True
    res2 = structural_checks(_case("prd-draft"), prd.replace("- 埋点：export_clicked\n", ""))
    assert res2["has_tracking"] is False
