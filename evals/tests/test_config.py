from pathlib import Path

from evals.config import load_config


def test_defaults():
    cfg = load_config(env={})
    assert cfg.toolkit_base_url == "http://localhost:3000"
    assert cfg.toolkit_model_note == ""
    assert cfg.judge_base_url == "https://api.deepseek.com"
    assert cfg.judge_api_key == ""
    assert cfg.judge_model == "deepseek-chat"
    assert cfg.datasets_dir.name == "datasets"
    assert cfg.artifacts_dir.name == "artifacts"
    assert cfg.baseline_dir.name == "baseline"
    assert cfg.calibration_dir.name == "calibration"


def test_env_overrides():
    cfg = load_config(
        env={
            "TOOLKIT_BASE_URL": "http://127.0.0.1:4000/",
            "TOOLKIT_MODEL": "glm-4.6",
            "LLM_BASE_URL": "https://open.bigmodel.cn/api/paas/v4",
            "LLM_API_KEY": "sk-test",
            "LLM_MODEL": "glm-4.6",
            "EVALS_ARTIFACTS_DIR": "X:/tmp/art",
        }
    )
    assert cfg.toolkit_base_url == "http://127.0.0.1:4000"  # 尾斜杠被去掉
    assert cfg.toolkit_model_note == "glm-4.6"
    assert cfg.judge_base_url == "https://open.bigmodel.cn/api/paas/v4"
    assert cfg.judge_api_key == "sk-test"
    assert cfg.judge_model == "glm-4.6"
    assert cfg.artifacts_dir == Path("X:/tmp/art")  # Path 相等比较不受分隔符影响
