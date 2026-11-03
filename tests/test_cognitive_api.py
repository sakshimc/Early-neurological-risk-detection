from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_cognitive_submit_accepts_payload():
    payload = {
        'session_id': 'cognitive-session',
        'test_id': 'cognitive',
        'reaction_time': {
            'trials': [120.0, 140.0, 130.0],
            'mean_ms': 130.0,
            'median_ms': 130.0,
            'variability_ms': 10.0,
        },
        'working_memory': {
            'maximum_sequence_length': 5,
            'correct_trials': 3,
            'total_trials': 4,
            'accuracy': 0.75,
        },
        'attention': {
            'correct_hits': 3,
            'false_alarms': 1,
            'missed_targets': 0,
            'accuracy': 0.8,
            'mean_reaction_time_ms': 500.0,
        },
    }

    response = client.post('/api/cognitive/submit', json=payload)

    assert response.status_code == 200
    assert response.json()['status'] == 'success'
    assert response.json()['session_id'] == 'cognitive-session'


def test_cognitive_submit_requires_cognitive_test_id():
    payload = {
        'session_id': 'bad-session',
        'test_id': 'typing',
        'reaction_time': {'trials': []},
        'working_memory': {'correct_trials': 0, 'total_trials': 0, 'accuracy': 0.0},
        'attention': {'correct_hits': 0, 'false_alarms': 0, 'missed_targets': 0, 'accuracy': 0.0, 'mean_reaction_time_ms': 0.0},
    }

    response = client.post('/api/cognitive/submit', json=payload)

    assert response.status_code == 400
