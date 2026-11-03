import os
import tempfile

import numpy as np

from backend.app.services.video_service import analyze_video_payload


def _write_dummy_video(path):
    import cv2

    writer = cv2.VideoWriter(path, cv2.VideoWriter_fourcc(*'mp4v'), 5.0, (32, 32))
    if not writer.isOpened():
        raise RuntimeError('Video writer could not be opened')
    for _ in range(10):
        frame = np.zeros((32, 32, 3), dtype=np.uint8)
        writer.write(frame)
    writer.release()


def test_analyze_video_payload_returns_expected_structure():
    with tempfile.TemporaryDirectory() as temp_dir:
        video_path = os.path.join(temp_dir, 'face_test.mp4')
        _write_dummy_video(video_path)
        payload = {
            'session_id': 'video-test-session',
            'files': [
                {'task': 'face', 'file_path': video_path},
            ],
        }
        result = analyze_video_payload(payload)
        assert result['status'] == 'success'
        assert result['session_id'] == 'video-test-session'
        assert 'face' in result['tasks']
        assert result['tasks']['face']['quality'] == 'ok'


def test_invalid_video_returns_insufficient_quality():
    payload = {
        'session_id': 'invalid-video-test',
        'files': [
            {'task': 'face', 'file_path': 'does-not-exist.mp4'},
        ],
    }
    result = analyze_video_payload(payload)
    assert result['tasks']['face']['quality'] == 'insufficient'
    assert result['tasks']['face']['feature_not_reliable'] is True
