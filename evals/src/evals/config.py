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
    baseline_dir: Path  # EVALS_BASELINE_DIR，默认 <evals>/baseline
    calibration_dir: Path  # EVALS_CALIBRATION_DIR，默认 <evals>/calibration


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
        baseline_dir=Path(e.get("EVALS_BASELINE_DIR") or _MODULE_ROOT / "baseline"),
        calibration_dir=Path(e.get("EVALS_CALIBRATION_DIR") or _MODULE_ROOT / "calibration"),
    )


def load_dotenv(path: Path | None = None) -> None:
    """极简 .env 加载：KEY=VALUE、# 注释；已存在的环境变量优先（setdefault）。"""
    p = path or _MODULE_ROOT / ".env"
    if not p.exists():
        return
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))
