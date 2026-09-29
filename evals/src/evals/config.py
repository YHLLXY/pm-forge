"""evals 运行配置：环境变量 → EvalsConfig。

key 只进 .env（gitignore），永不入库；datasets/artifacts 以模块根定位，
保证从仓库任意目录运行都能找到。
"""

import os
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path

_MODULE_ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class EvalsConfig:
    toolkit_base_url: str  # TOOLKIT_BASE_URL，默认 http://localhost:3000
    toolkit_model_note: str  # TOOLKIT_MODEL（披露用，可空）
    judge_base_url: str  # LLM_BASE_URL，默认 https://api.deepseek.com
    judge_api_key: str  # LLM_API_KEY
    judge_model: str  # LLM_MODEL，默认 deepseek-chat
    datasets_dir: Path  # <evals>/datasets
    artifacts_dir: Path  # EVALS_ARTIFACTS_DIR，默认 <evals>/artifacts


def load_config(env: Mapping[str, str] | None = None) -> EvalsConfig:
    e = os.environ if env is None else env
    return EvalsConfig(
        toolkit_base_url=(e.get("TOOLKIT_BASE_URL") or "http://localhost:3000").rstrip("/"),
        toolkit_model_note=e.get("TOOLKIT_MODEL", ""),
        judge_base_url=(e.get("LLM_BASE_URL") or "https://api.deepseek.com").rstrip("/"),
        judge_api_key=e.get("LLM_API_KEY", ""),
        judge_model=e.get("LLM_MODEL") or "deepseek-chat",
        datasets_dir=_MODULE_ROOT / "datasets",
        artifacts_dir=Path(e.get("EVALS_ARTIFACTS_DIR") or _MODULE_ROOT / "artifacts"),
    )
