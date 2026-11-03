import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
COGNITIVE_OUTPUT_DIR = REPO_ROOT / 'data' / 'processed' / 'cognitive'
COGNITIVE_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def save_cognitive_features(session_id: str, payload: dict) -> None:
    output_path = COGNITIVE_OUTPUT_DIR / f'cognitive_features_{session_id}.json'
    with output_path.open('w', encoding='utf-8') as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
