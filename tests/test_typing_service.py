import pytest
from backend.app.services.typing_service import (
    extract_typing_features,
    features_to_vector,
    TYPING_FEATURE_NAMES,
    PAUSE_THRESHOLD_MS,
)

STANDARD_RAW = {
    'session_id': 'test-session',
    'test_id': 'typing',
    'target_text': 'The quick brown fox jumps over the lazy dog.',
    'typed_text': 'The quick brown fox jumps over the lazy dog.',
    'started_at': 0.0,
    'completed_at': 10000.0,
    'events': [
        {'key': 'T', 'event': 'keydown', 'timestamp': 0},
        {'key': 'T', 'event': 'keyup', 'timestamp': 80},
        {'key': 'h', 'event': 'keydown', 'timestamp': 180},
        {'key': 'h', 'event': 'keyup', 'timestamp': 240},
    ],
}

def test_normal_typing_sequence():
    features = extract_typing_features(STANDARD_RAW)
    assert features['total_characters'] == len(STANDARD_RAW['target_text'])
    assert features['typed_characters'] == len(STANDARD_RAW['typed_text'])
    assert features['error_count'] == 0
    assert features['accuracy'] == 100.0
    assert features['completion_time_seconds'] == pytest.approx(10.0)
    assert features['typing_speed_wpm'] > 0
    assert features['mean_hold_duration'] == pytest.approx(70.0)
    assert features['backspace_count'] == 0

def test_typing_with_backspaces():
    raw = {
        **STANDARD_RAW,
        'typed_text': 'The quick brown fox jumps over the lazy do',
        'events': [
            {'key': 'T', 'event': 'keydown', 'timestamp': 0},
            {'key': 'T', 'event': 'keyup', 'timestamp': 80},
            {'key': 'Backspace', 'event': 'keydown', 'timestamp': 100},
            {'key': 'Backspace', 'event': 'keyup', 'timestamp': 120},
        ],
    }
    features = extract_typing_features(raw)
    assert features['backspace_count'] == 1
    assert features['backspace_rate'] == pytest.approx(1 / 2)

def test_typing_with_long_pause():
    raw = {
        **STANDARD_RAW,
        'events': [
            {'key': 'T', 'event': 'keydown', 'timestamp': 0},
            {'key': 'T', 'event': 'keyup', 'timestamp': 80},
            {'key': 'h', 'event': 'keydown', 'timestamp': PAUSE_THRESHOLD_MS + 50},
            {'key': 'h', 'event': 'keyup', 'timestamp': PAUSE_THRESHOLD_MS + 130},
        ],
    }
    features = extract_typing_features(raw)
    assert features['pause_count'] == 1
    assert features['total_pause_duration'] > 0

def test_missing_keyup_event():
    raw = {
        **STANDARD_RAW,
        'events': [
            {'key': 'T', 'event': 'keydown', 'timestamp': 0},
            {'key': 'h', 'event': 'keydown', 'timestamp': 180},
            {'key': 'h', 'event': 'keyup', 'timestamp': 240},
        ],
    }
    features = extract_typing_features(raw)
    assert features['mean_hold_duration'] is not None
    assert features['typed_characters'] == len(raw['typed_text'])

def test_empty_event_list():
    raw = {**STANDARD_RAW, 'events': []}
    features = extract_typing_features(raw)
    assert features['total_characters'] == len(raw['target_text'])
    assert features['pause_count'] == 0
    assert features['backspace_count'] == 0
    assert features['typing_speed_wpm'] == 0.0

def test_zero_duration():
    raw = {**STANDARD_RAW, 'started_at': 0.0, 'completed_at': 0.0}
    features = extract_typing_features(raw)
    assert features['completion_time_seconds'] == 0.0
    assert features['typing_speed_wpm'] == 0.0

def test_single_key_event():
    raw = {
        **STANDARD_RAW,
        'typed_text': 'T',
        'events': [{'key': 'T', 'event': 'keydown', 'timestamp': 0}],
    }
    features = extract_typing_features(raw)
    assert features['typed_characters'] == 1
    assert features['mean_hold_duration'] is None

def test_features_to_vector_order():
    features = extract_typing_features(STANDARD_RAW)
    vector = features_to_vector(features)
    assert len(vector) == len(TYPING_FEATURE_NAMES)
    assert vector[0] == features['typing_speed_wpm']
    assert vector[-1] == features['typing_rhythm_cv']
