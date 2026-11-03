import json
from pathlib import Path

from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_report_generate_returns_multimodal_summary(tmp_path, monkeypatch):
    root = Path(__file__).resolve().parents[1]
    processed_root = root / 'data' / 'processed'
    for folder in ['typing', 'video', 'voice', 'cognitive']:
        target = processed_root / folder
        target.mkdir(parents=True, exist_ok=True)

    (processed_root / 'typing' / 'typing_features_report-session.json').write_text(
        json.dumps({'session_id': 'report-session', 'test_id': 'typing', 'features': {'typing_speed_wpm': 45.0, 'accuracy': 95.0, 'error_count': 2}}),
        encoding='utf-8',
    )
    (processed_root / 'video' / 'video_features_report-session.json').write_text(
        json.dumps({'session_id': 'report-session', 'tasks': {'face': {'quality': 'good', 'features': {'face_confidence': 0.8}}}}),
        encoding='utf-8',
    )
    (processed_root / 'voice' / 'voice_features_report-session.json').write_text(
        json.dumps({'task': 'reading', 'quality': {'status': 'good'}, 'features': {'speech_rate_wpm': 120.0, 'mean_pitch_hz': 140.0}}),
        encoding='utf-8',
    )
    (processed_root / 'cognitive' / 'cognitive_features_report-session.json').write_text(
        json.dumps({'session_id': 'report-session', 'reaction_time': {'mean_ms': 320.0}, 'working_memory': {'accuracy': 0.78}, 'attention': {'accuracy': 0.86}}),
        encoding='utf-8',
    )

    response = client.post('/api/report/generate', json={'session_id': 'report-session'})

    assert response.status_code == 200
    assert response.json()['status'] == 'success'
    assert response.json()['assessment_status']['typing'] is True
    assert response.json()['assessment_status']['cognitive'] is True
    assert response.json()['screening_result']['type'] == 'provisional_research_screening'
