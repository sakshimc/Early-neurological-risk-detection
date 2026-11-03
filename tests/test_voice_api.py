from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_voice_submit_accepts_audio_upload():
    payload = {
        'task_id': 'reading',
        'task_title': 'Reading Sentence',
    }
    files = {
        'audio': ('sample.webm', b'fake-audio-bytes', 'audio/webm'),
    }

    response = client.post('/api/voice/submit', data=payload, files=files)

    assert response.status_code == 200
    assert response.json()['status'] == 'success'
    assert response.json()['task_id'] == 'reading'


def test_voice_submit_requires_audio_file():
    response = client.post('/api/voice/submit', data={'task_id': 'reading'})

    assert response.status_code == 400
    assert 'No audio file' in response.json()['detail']
