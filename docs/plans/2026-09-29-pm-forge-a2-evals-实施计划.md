# A2 toolkit evals 门禁 · 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (本仓惯例：会话内逐卡执行) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 toolkit 三工具建评测门禁——66 条真实任务评测集 + 四维 rubric + 确定性结构检查 + LLM-as-judge 评分回归 + 人工校准 + 基线报告，评测方法论作为 PM 制品发布进 site。

**Architecture:** 新顶层模块 `evals/`（Python 3.12 + uv，核心零依赖），通过 HTTP 黑盒调用 toolkit 的 `POST /api/tools/{id}` 合同；评分链 = 确定性结构检查（代码判定契约遵守）→ LLM-as-judge 四维打分（DeepSeek 钉版本、温度 0）→ 人工校准一致率。运行产物落 `evals/artifacts/`（gitignore），基线指针与校准数据入 git，报告两步式发布进 site toolkitReports 集合。

**Tech Stack:** Python 3.12 / uv / pytest / ruff / urllib（零第三方依赖）/ DeepSeek OpenAI 兼容接口。

**Spec:** `docs/specs/2026-09-29-pm-forge-二期评测线与交互报告设计.md` §3.1（架构决策）、§3.2（A2 全部验收 ①-⑦）。

## Global Constraints

- 核心代码零第三方依赖（stdlib only；dev 组仅 pytest+ruff）。
- API key 只进 `evals/.env`（gitignore），永不入库、永不进聊天。
- 真实评分运行必须 `--yes` 显式确认成本；`--dry-run` 先看计划（M0：先估后跑）。
- toolkit 处于 mock 模式（`X-PMForge-Mode: mock`）时真实评分拒绝执行，除非 `--allow-mock`。
- 评分钉版本：温度 0；记录 API 返回 `model` 字符串与评测日期；分数仅作回归参考。
- 时区一律 `ZoneInfo("Asia/Shanghai")`（Ruff DTZ005）；禁裸 `except Exception`（BLE001）。
- 单文件 ≤500 行；显式 `git add <path>`；commit 前缀 `feat:/fix:/docs:/test:`；每个 commit 同步 README、默认 push。
- LLM 相关单测全部走注入 transport + 录制 fixture，**永不真实调用**。

---

### Task 1: 模块地基（pyproject / env / model / config / 仓库登记）

**Files:**
- Create: `evals/pyproject.toml`、`evals/.env.example`、`evals/.gitignore`、`evals/README.md`、`evals/src/evals/__init__.py`、`evals/src/evals/model.py`、`evals/src/evals/config.py`、`evals/tests/__init__.py`、`evals/tests/test_model.py`、`evals/tests/test_config.py`
- Modify: `.gitignore`（根，加 `evals/artifacts/`）、`AGENTS.md`（依赖方向图加 evals 两行）、`README.md`（文件结构加 evals 条目）

**Interfaces (Produces):**
```python
# model.py
TOOL_IDS = ("competitor-analysis", "feedback-insights", "prd-draft")
DIFFICULTIES = ("基础", "复杂", "边界")
DIMENSIONS = ("factuality", "structure", "actionability", "instruction")
DIMENSION_LABELS: dict[str, str]  # 中文标签
@dataclass(frozen=True)
class Case: id: str; tool: str; task: str; difficulty: str; input: dict
             expect_must_include: tuple[str, ...] = (); notes: str = ""
@dataclass(frozen=True)
class DimensionScore: dimension: str; score: int; evidence: str
@dataclass
class CaseResult:
    case_id: str; tool: str; task: str; difficulty: str
    status: str  # "ok" | "toolkit_error" | "judge_error"
    mode: str; output: str; duration_ms: int
    structural: dict[str, bool] = field(default_factory=dict)
    dimensions: tuple[DimensionScore, ...] = ()
    judge_model: str = ""; judged_at: str = ""
    judge_usage: dict = field(default_factory=dict); error: str = ""
```
```python
# config.py
@dataclass(frozen=True)
class EvalsConfig:
    toolkit_base_url: str      # TOOLKIT_BASE_URL，默认 http://localhost:3000
    toolkit_model_note: str    # TOOLKIT_MODEL（披露用，可空）
    judge_base_url: str        # LLM_BASE_URL，默认 https://api.deepseek.com
    judge_api_key: str         # LLM_API_KEY
    judge_model: str           # LLM_MODEL，默认 deepseek-chat
    datasets_dir: Path         # <evals>/datasets
    artifacts_dir: Path        # EVALS_ARTIFACTS_DIR，默认 <evals>/artifacts
def load_config(env: Mapping[str, str] | None = None) -> EvalsConfig  # None 时读 os.environ
```

- [ ] **Step 1: 写 pyproject / .env.example / .gitignore / README 骨架**

`evals/pyproject.toml`：
```toml
[project]
name = "pmforge-evals"
version = "0.1.0"
description = "pm-forge 评测模块：toolkit 三工具 evals 门禁（A2）"
readme = "README.md"
requires-python = ">=3.12"
dependencies = []

[build-system]
requires = ["uv_build>=0.12.0,<0.13.0"]
build-backend = "uv_build"

[dependency-groups]
dev = ["pytest>=9.1.1", "ruff>=0.16.9"]
```
`evals/.env.example`：
```
# 复制为 .env 并填入真实值；.env 已被 gitignore，永不入库
# toolkit 本地地址（npm run dev 默认 3000）或部署版
TOOLKIT_BASE_URL=http://localhost:3000
# toolkit 当前使用的生成模型（披露用，字符串备注）
TOOLKIT_MODEL=deepseek-chat
# 评分器（LLM-as-judge），OpenAI 兼容
LLM_BASE_URL=https://api.deepseek.com
LLM_API_KEY=
LLM_MODEL=deepseek-chat
```
`evals/.gitignore`：`.env`、`artifacts/`、`out/`、`__pycache__/`、`.venv/`、`uv.lock` 不忽略（锁提交）。
根 `.gitignore` 追加一行 `evals/artifacts/`。

- [ ] **Step 2: 写 model.py 与 config.py（按上面 Interfaces 的完整实现）**

config.py 中 `datasets_dir`/`artifacts_dir` 以 `Path(__file__).resolve().parents[2]` 定位模块根（`evals/`）。

- [ ] **Step 3: 写失败测试 → 跑红 → 实现 → 跑绿**

`evals/tests/test_model.py`：断言 TOOL_IDS 与 toolkit 注册表三 id 逐字一致；DIMENSION_LABELS 覆盖 DIMENSIONS 全部键；CaseResult 默认 status="ok" 之前的字段可缺省构造。
`evals/tests/test_config.py`：默认 env → toolkit_base_url=="http://localhost:3000"、judge_model=="deepseek-chat"；传自定义 env dict → 全部覆盖生效；datasets_dir 名为 datasets。

Run: `cd /c/dev/pm-forge/evals && uv sync && uv run pytest -q` → PASS

- [ ] **Step 4: 仓库登记** — AGENTS.md 依赖方向图追加：`evals ──HTTP 黑盒调用──→ toolkit（API 合同，禁 import 内部实现）`、`evals ──评测计划/基线报告──→ site/content`；README 文件结构表加 evals 行。
- [ ] **Step 5: Commit** — `git add evals .gitignore AGENTS.md README.md && git commit -m "feat: evals 模块地基（零依赖 Python 工程 + 数据模型 + 配置）" && git push`

---

### Task 2: 数据集加载与校验（dataset.py）

**Files:**
- Create: `evals/src/evals/dataset.py`、`evals/tests/test_dataset.py`

**Interfaces (Produces):**
```python
class DatasetError(ValueError): ...          # 消息含 文件名:行号
def parse_case(obj: object, *, source: str, seen_ids: set[str]) -> Case
def load_dataset(path: Path) -> list[Case]   # JSONL，跳过空行
def load_all(datasets_dir: Path) -> dict[str, list[Case]]  # 键=tool id；文件名 <tool>.jsonl 必须与 TOOL_IDS 匹配
def difficulty_counts(cases: list[Case]) -> dict[str, int]
```
校验规则：必填键 `id/tool/task/difficulty/input`；`tool ∈ TOOL_IDS`；`difficulty ∈ DIFFICULTIES`；`input` 必须是对象（dict）；`id` 匹配 `^[a-z0-9][a-z0-9-]*$` 且文件内唯一；可选 `expect.must_include` 为字符串列表、`notes` 为字符串；多余键拒绝（typo 防护）。

- [ ] **Step 1: 写失败测试**（合法 JSONL 加载全字段；缺键 / 未知 tool / 非法难度 / input 非对象 / 重复 id / 多余键 / JSON 行损坏 各一条负例，断言消息含文件名与行号；load_all 对文件名与 tool 不一致的文件报错）
- [ ] **Step 2: 跑红** `uv run pytest tests/test_dataset.py -q` → FAIL (ModuleNotFoundError)
- [ ] **Step 3: 实现 dataset.py**
- [ ] **Step 4: 跑绿** + 全量 `uv run pytest -q`
- [ ] **Step 5: Commit** — `git add evals/src/evals/dataset.py evals/tests/test_dataset.py && git commit -m "feat: evals 数据集 JSONL 加载与严格校验" && git push`

---

### Task 3: 三份真实评测集（66 条内容工程）

**Files:**
- Create: `evals/datasets/competitor-analysis.jsonl`（22 条）、`evals/datasets/feedback-insights.jsonl`（22 条）、`evals/datasets/prd-draft.jsonl`（22 条）
- Test: `evals/tests/test_datasets_content.py`

**Interfaces (Consumes):** Task 2 的 `load_all/difficulty_counts`。
**Produces:** 数据文件本身（Task 7/10 的输入）。

**内容矩阵（id · 难度 · 任务一行概述——执行时据此写全 input，满足 toolkit zod 最小长度）：**

competitor-analysis（8 基础 / 8 复杂 / 6 边界）：comp-001 记账App vs 钱迹（材料充足）；002 番茄钟 vs Forest；003 校园二手 vs 闲鱼；004 博客站 vs 掘金；005 待办清单 vs 滴答清单；006 简历工具 vs 超级简历；007 Markdown 笔记 vs Obsidian；008 习惯打卡 vs 小打卡；009 三竞品零补充材料（全靠【行业常识】标注）；010 五竞品+材料含冲突数据；011 我方描述口语化自夸需提炼；012 竞品 notes 含双口径 MAU；013 商业模式对比（广告 vs 订阅）；014 目的为"是否转型"决策；015 竞品为海外产品 Notion；016 材料含用户原话差评（应被引用）；017 边界：单竞品极小众仅一句话材料；018 边界：我方描述 10 字符下限；019 边界：notes 全空+purpose 极短；020 边界：材料为乱码/无关内容；021 边界：purpose 与产品错位；022 边界：五竞品全部只有名字。

feedback-insights（8 基础 / 8 复杂 / 6 边界）：fb-001 网课App 差评集中（8条）；002 外卖小程序混合评价（10条）；003 记账工具功能建议（12条）；004 校园跑腿（6条）；005 笔记应用跨功能（15条）；006 视频会员含正面（8条）；007 30条多主题交织；008 含灌水无关反馈需过滤；009 同一问题多种表述（不按字面聚类）；010 情绪极不均衡（仅1条负）；011 反馈含编号互引；012 productContext 强约束只看 iOS；013 边界：恰好 5 条下限；014 边界：全部正面；015 边界：全部重复同一句；016 边界：两条互相矛盾；017 边界：繁体+中英混排；018 边界：含用户自称身份信息（观察是否复述）；019 边界：全是 emoji 与短词；020 边界：productContext 与反馈无关；021 复杂：长反馈（每条近 200 字上限）；022 边界：主题交叠顺序随机。

prd-draft（8 基础 / 9 复杂 / 5 边界）：prd-001 月度报告导出 PDF（材料充足）；002 校园活动签到；003 待办清单回收站；004 博客评论防灌水；005 简历主题切换；006 外卖超时赔付提示；007 多方约束（预算/工期/合规）；008 两类冲突目标人群；009 材料含技术可行性边界；010 模糊目标"提升留存"；011 constraints 排除特定方案；012 background 含漏斗数据；019 多端兼容（App/Web/小程序）；020 支付高合规风险；022 依赖不稳定第三方 API；013 边界：background 10 字符下限；014 边界：材料空+users 极短；015 边界：需求自相矛盾；016 边界：内部重构用户价值不直观；017 边界：materials 粘贴无关会议记录；018 边界：模块名与需求名不匹配；021 边界：users 写"所有人"。

- [ ] **Step 1: 写内容分布测试（失败）**

`evals/tests/test_datasets_content.py`：三文件 load_all 成功；每工具 ≥20 条；id 全局唯一；每工具 difficulty_counts 三档各有 ≥5；每条 `task` 非空 ≥8 字、`input` 为非空 dict；边界案例须有 `notes` 说明边界点。

- [ ] **Step 2: 跑红 → Step 3: 按内容矩阵逐条写三份 JSONL（真实中文任务文本，禁止 lorem）→ Step 4: 跑绿**
- [ ] **Step 5: Commit** — `git add evals/datasets evals/tests/test_datasets_content.py && git commit -m "feat: 三工具 66 条真实任务评测集" && git push`

---

### Task 4: 确定性结构检查（structural.py）

**Files:**
- Create: `evals/src/evals/structural.py`、`evals/tests/test_structural.py`

**Interfaces (Consumes):** `Case`。
**Interfaces (Produces):**
```python
FAILURE_MARK = "[生成失败"
def structural_checks(case: Case, output: str) -> dict[str, bool]
# 全工具：no_failure_mark；expect_must_include 非空时加 must_include（全部命中）
# competitor-analysis：sections_complete（六章 "## 一、分析目的"…"## 六、信息来源" 全在）、evidence_marks_present（含【依据输入】/【推断】/【行业常识】任一）
# feedback-insights：json_valid；themes_in_range(3-8)；sentiment_valid(positive|negative|mixed)；count_sum_consistent（Σcount==len(input.feedbacks)，或 < 时 notableOutliers 非空）；quotes_verbatim（每条 quote 是 input.feedbacks 拼接文本的子串）
# prd-draft：sections_complete（六章 "## 一、背景与目标"…"## 六、风险与开放问题"）、has_tracking（"埋点" in output）
```

- [ ] **Step 1: 写失败测试**（每工具 1 正例 1 反例；feedback 用 toolkit fixture 的 JSON 结构做正例、count 总和错误/quote 非逐字做反例；围栏包裹的 JSON 也能解析——judge/模型常见输出形态）
- [ ] **Step 2: 跑红 → Step 3: 实现 → Step 4: 跑绿**
- [ ] **Step 5: Commit** — `git add evals/src/evals/structural.py evals/tests/test_structural.py && git commit -m "feat: 确定性结构检查（契约遵守的代码级判定）" && git push`

---

### Task 5: toolkit HTTP 客户端（client.py）

**Files:**
- Create: `evals/src/evals/client.py`、`evals/tests/test_client.py`

**Interfaces (Produces):**
```python
class ToolkitError(RuntimeError):
    def __init__(self, code: str, message: str): ...
@dataclass
class ToolkitResponse: text: str; mode: str; duration_ms: int
Transport = Callable[[str, bytes], tuple[int, Mapping[str, str], bytes]]  # (url, body) -> (status, headers, body)
def call_toolkit(base_url: str, tool: str, case_input: dict, *,
                 timeout: int = 180,
                 transport: Transport | None = None) -> ToolkitResponse
```
默认 transport 用 `urllib.request`：POST `{base_url}/api/tools/{tool}`，body `{"input": case_input}`，读全流；非 200 → 解析 JSON `{code,message}` 抛 `ToolkitError`（非 JSON 则 code="HTTP_<status>"）；`mode` 取 `X-PMForge-Mode` 头（缺省 "unknown"）。

- [ ] **Step 1: 写失败测试**（fake transport：200 流式文本+mode 头；404/400 错误 JSON → ToolkitError 且 code 正确；非 JSON 错误体；mode 缺头 → "unknown"；断言请求 URL 与 body 形状 `{"input": ...}`）
- [ ] **Step 2: 跑红 → Step 3: 实现 → Step 4: 跑绿**
- [ ] **Step 5: Commit** — `git add evals/src/evals/client.py evals/tests/test_client.py && git commit -m "feat: toolkit HTTP 黑盒客户端（流式读取+模式头+错误映射）" && git push`

---

### Task 6: LLM-as-judge 评分器（judge.py）

**Files:**
- Create: `evals/src/evals/judge.py`、`evals/tests/test_judge.py`

**Interfaces (Produces):**
```python
class JudgeError(RuntimeError): ...
@dataclass
class JudgeOutcome:
    dimensions: tuple[DimensionScore, ...]  # 恰好四维
    note: str
    model: str          # API 返回的 model 字符串（钉版本留痕）
    usage: dict         # {prompt_tokens, completion_tokens}
JudgeTransport = Callable[[str, Mapping[str, str], bytes], tuple[int, Mapping[str, str], bytes]]
def build_judge_messages(tool_name: str, case: Case, output: str) -> list[dict]
def parse_judge_response(content: str) -> tuple[tuple[DimensionScore, ...], str]
def call_judge(cfg: EvalsConfig, tool_name: str, case: Case, output: str, *,
               transport: JudgeTransport | None = None) -> JudgeOutcome
```
system prompt：四维 rubric + 锚点（5/3/1 分行为描述）+ 严格 JSON 输出契约（无围栏无解释）。`call_judge`：POST `{judge_base_url}/chat/completions`，`temperature: 0`，Authorization: Bearer；`parse_judge_response` 剥 ```json 围栏后 json.loads；维度集合必须恰等于 DIMENSIONS、score 为 1-5 整数、evidence 非空，否则 JudgeError。

- [ ] **Step 1: 写失败测试**（录制响应 fixture：干净 JSON → 四维解析；```json 围栏包裹 → 可解析；缺维度/分数越界/非整数/evidence 空 → JudgeError；断言请求体 temperature==0 且 Authorization 头存在；model/usage 透传）
- [ ] **Step 2: 跑红 → Step 3: 实现 → Step 4: 跑绿**
- [ ] **Step 5: Commit** — `git add evals/src/evals/judge.py evals/tests/test_judge.py && git commit -m "feat: LLM-as-judge 四维评分器（钉版本留痕）" && git push`

---

### Task 7: 运行编排与 CLI（runner.py + cli.py）

**Files:**
- Create: `evals/src/evals/runner.py`、`evals/src/evals/cli.py`、`evals/tests/test_runner.py`、`evals/tests/test_cli.py`
- Modify: `evals/README.md`（用法三命令）

**Interfaces (Consumes):** dataset/client/judge/structural 全部接口。
**Interfaces (Produces):**
```python
class CostGateError(RuntimeError): ...   # 未 --yes
class MockModeError(RuntimeError): ...   # toolkit 为 mock 而未 --allow-mock
def plan_text(cases_by_tool: dict[str, list[Case]]) -> str   # 数量+成本上界披露（每 case ≤ 生成4096+评分约6500 token）
def run_datasets(cfg, cases_by_tool, *, client=call_toolkit, judge=call_judge,
                 allow_mock=False, yes=False, dry_run=False,
                 run_id: str | None = None) -> Path      # 返回 run_dir
# run_dir = artifacts/<run_id>/，run_id 默认 Asia/Shanghai "%Y%m%d-%H%M%S"
# 逐 case 增量写 results.jsonl（崩溃安全）；收尾写 summary.json：
# {run_id, started_at, finished_at, toolkit_base_url, toolkit_model_note,
#  judge_model, mode_counter, cost: {cases, judge_prompt_tokens, judge_completion_tokens},
#  per_tool: {tool: {dim_avg: {...}, structural_pass_rate: {...}, ok_count, error_count}}}
# 守卫顺序：dry_run 打印 plan 后直接返回 → judge_api_key 为空且非 dry_run → CostGateError
#          → 非 yes 且非 dry_run → CostGateError → 首个 mock 响应且非 allow_mock → MockModeError
# cli.py: argparse 子命令 validate / run / regress / calibrate / report；main(argv)->int
# stdout 非 utf-8 时 reconfigure(encoding="utf-8")（Windows 乱码防御）；validate 违规 exit 1
```

- [ ] **Step 1: 写失败测试**（注入 fake client/judge 端到端两 case：results.jsonl 行数、summary 字段、per_tool 均分数学正确；无 --yes → CostGateError 且零网络调用；key 空 → CostGateError；mock 响应未 allow → MockModeError；dry_run 零调用；toolkit_error 的 case 落 status 且不中断整体）
- [ ] **Step 2: 跑红 → Step 3: 实现 runner.py + cli.py → Step 4: 跑绿 + `uv run evals validate`（此时数据集已就位）exit 0**
- [ ] **Step 5: Commit** — `git add evals/src/evals/runner.py evals/src/evals/cli.py evals/tests evals/README.md && git commit -m "feat: evals 运行编排与 CLI（成本确认门+mock 守卫+增量落盘）" && git push`

---

### Task 8: 回归对比与人工校准（regress.py + calibrate.py）

**Files:**
- Create: `evals/src/evals/regress.py`、`evals/src/evals/calibrate.py`、`evals/tests/test_regress.py`、`evals/tests/test_calibrate.py`
- Create: `evals/calibration/`（人工评分 CSV 落点，`human-scores.csv` 模板）

**Interfaces (Produces):**
```python
# regress.py
def load_summary(run_dir: Path) -> dict
def compare(base: dict, cand: dict) -> str   # 按工具×维度的均分差表（±0.0 对齐），附结构检查通过率变化
def mark_baseline(run_dir: Path, baseline_dir: Path) -> Path
# 写 baseline/baseline.json：{run_id, judge_model, marked_at, summary 快照}
# calibrate.py
@dataclass(frozen=True)
class HumanScore: case_id: str; dimension: str; score: int; rater: str = ""; note: str = ""
def load_human_scores(csv_path: Path) -> list[HumanScore]  # 表头 case_id,dimension,score,rater,note
def agreement(results: list[dict], human: list[HumanScore]) -> dict
# 完全一致率 / ±1 一致率 / 平均绝对差（总体+分维度）/ 分歧清单（含模型 evidence 摘录）
```

- [ ] **Step 1: 写失败测试**（合成 summary：+0.5/-1.0 差值文本正确；mark_baseline 文件形状；合成 results+human：一致率与平均绝对差手算断言；human 引用不存在的 case_id → 明确报错）
- [ ] **Step 2: 跑红 → Step 3: 实现 → Step 4: 跑绿**
- [ ] **Step 5: Commit** — `git add evals/src/evals/regress.py evals/src/evals/calibrate.py evals/tests evals/calibration && git commit -m "feat: 基线回归对比与人工校准一致率" && git push`

---

### Task 9: 基线报告渲染（report.py）

**Files:**
- Create: `evals/src/evals/report.py`、`evals/tests/test_report.py`

**Interfaces (Produces):**
```python
def render_run_report(run_dir: Path) -> str
# 章节：概览（日期/基址/judge model/TOOLKIT_MODEL 备注/mode 计数）→ 方法一句话 → 分数表（工具×维度均分）
# → 结构检查通过率 → 校准一致率（run_dir/calibration.json 存在时）→ 低分案例摘录（各工具最低 1 条，含 evidence）
# → 局限与钉版本声明 → 成本披露（usage 汇总）
def render_comparison(base_dir: Path, cand_dir: Path) -> str  # 回归对比报告
```

- [ ] **Step 1: 写失败测试**（合成 run_dir：渲染含四维中文标签、model 字符串、成本数字；无 calibration.json 不出现校准节）
- [ ] **Step 2: 跑红 → Step 3: 实现 → Step 4: 跑绿**
- [ ] **Step 5: Commit** — `git add evals/src/evals/report.py evals/tests/test_report.py && git commit -m "feat: evals 运行报告渲染" && git push`

---

### Task 10: 真实首跑 + 人工校准 + 基线标记

**Files:**
- Create: `evals/artifacts/<run_id>/`（gitignore，不入库）、`evals/baseline/baseline.json`（入 git）、`evals/calibration/human-scores.csv`（入 git）

**前置**：toolkit `.env` 有真实 key；`evals/.env` 填 `LLM_API_KEY`。

- [ ] **Step 1: 起本地 toolkit**（`cd toolkit && npm run dev`），`curl http://localhost:3000/api/tools/health` 确认；先单 case 冒烟确认 `X-PMForge-Mode: openai-compatible`（非 mock）
- [ ] **Step 2: `uv run evals run --dry-run`** 记录成本披露（66 case 上界 ≈ 73 万 token ≈ 几元级）
- [ ] **Step 3: `uv run evals run --yes`** 全量真实跑；抽查 3 条 output 与 structural 判定合理性；toolkit_error 案例逐条归因（input 问题则修数据集并重跑该 case）
- [ ] **Step 4: 人工盲评校准**：抽 8 case（三工具覆盖、含 ≥2 边界）×4 维 = 32 对；**先盲评**（未看 judge 分数前按 rubric 锚点独立打分）填 `human-scores.csv`（rater=ai-blind），`uv run evals calibrate --run <id>` 生成一致率；分歧项交用户抽查复核，用户结论以 rater=user 追加 CSV
- [ ] **Step 5: `uv run evals report --run <id>`** 人工通读 → `uv run evals regress --mark-baseline`（确认命令形态按 Task 8 实现）标记基线
- [ ] **Step 6: Commit** — `git add evals/baseline evals/calibration && git commit -m "feat: A2 首跑基线与人工校准数据" && git push`（artifacts 不入库，git status 验证）

---

### Task 11: 发布与收口（site 条目 + 计划文档 + 双写沉淀）

**Files:**
- Modify: `site/src/content.config.ts`（toolkitReports 的 `toolId` 枚举追加 `"evals"`）
- Create: `site/src/content/toolkit-reports/2026-09-30-ai工具箱-evals计划.md`（手写 PM 制品：目标/评测集设计矩阵/rubric 四维锚点表/评分与校准方法/钉版本与成本披露/局限，正文引用基线报告数据）
- Create: `site/src/content/toolkit-reports/2026-09-30-ai工具箱-evals基线报告.md`（Task 9 渲染稿人工修订后落入，frontmatter 按 toolkitReports schema：toolId "evals"、toolName "AI 工具箱评测"、promptVersion 用 judge model 字符串、generatedBy "claude"）
- Modify: `README.md`、`docs/STATUS.md`、`docs/lessons-learned.md`
- Create（vault 侧，双写）: `E:\knowledge home\40-经验教训\AI-API经验\2026-09-30-toolkit-evals门禁的分层判定设计.md` + `40-经验教训/_Index` 与 `AI-API经验/_Index` 补条目

- [ ] **Step 1: site schema 扩枚举 + 两篇 md 落入 → `cd site && npm run build` 绿（内容检查脚本全过）**
- [ ] **Step 2: README/STATUS/lessons 更新；vault 双写 + 索引补挂（显式 add，vault 侧沿用"新增文件必须入索引"纪律）**
- [ ] **Step 3: 验收对照 spec §3.2 ①-⑦ 逐条勾验 → Commit `docs: A2 收口（发布+双写）` + push**

---

## Self-Review 记录

- spec §3.2 验收 ①→T2/T3/T7 ②→T6(rubric 锚点)+T11(锚点表成文) ③→T6/T7(温度0/model留痕/artifacts) ④→T8/T10 ⑤→T9/T11 ⑥→T8/T9 ⑦→全程 pytest+ruff：全覆盖。
- 类型一致性：`Transport`/`JudgeTransport`、`CaseResult.judge_usage`、`mark_baseline(run_dir, baseline_dir)` 签名在 T5/T6/T7/T8 间已互核。
- 内容工程（T3）以"内容矩阵 + 分布测试"锚定而非空泛指令；exemplar 全量 JSON 在执行时按矩阵展开（66 条 × 完整 input 会令本计划膨胀至不可维护，矩阵逐条列明即无歧义）。
