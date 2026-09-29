"""evals 数据模型与常量。

TOOL_IDS 与 toolkit/src/tools/registry.ts 逐字一致（黑盒合同锚点）；
DIMENSIONS 是四维 rubric 的稳定键，中文标签只用于展示。
"""

from dataclasses import dataclass, field

TOOL_IDS = ("competitor-analysis", "feedback-insights", "prd-draft")
DIFFICULTIES = ("基础", "复杂", "边界")
DIMENSIONS = ("factuality", "structure", "actionability", "instruction")
DIMENSION_LABELS = {
    "factuality": "事实性/幻觉控制",
    "structure": "结构完整",
    "actionability": "可操作性",
    "instruction": "指令遵守",
}


@dataclass(frozen=True)
class Case:
    """一条评测任务。input 形状由 toolkit 侧 zod schema 校验（黑盒，不在本模块重复）。"""

    id: str
    tool: str
    task: str
    difficulty: str
    input: dict
    expect_must_include: tuple[str, ...] = ()
    notes: str = ""


@dataclass(frozen=True)
class DimensionScore:
    dimension: str  # ∈ DIMENSIONS
    score: int  # 1-5
    evidence: str  # 引用输出原文的评分理由


@dataclass
class CaseResult:
    """单个 case 的完整运行记录，增量写入 results.jsonl。"""

    case_id: str
    tool: str
    task: str
    difficulty: str
    status: str  # "ok" | "toolkit_error" | "judge_error"
    mode: str  # toolkit X-PMForge-Mode 头
    output: str
    duration_ms: int
    structural: dict[str, bool] = field(default_factory=dict)
    dimensions: tuple[DimensionScore, ...] = ()
    judge_model: str = ""  # API 返回的 model 字符串（钉版本留痕）
    judged_at: str = ""  # Asia/Shanghai ISO 时间
    judge_usage: dict = field(default_factory=dict)  # {prompt_tokens, completion_tokens}
    error: str = ""
