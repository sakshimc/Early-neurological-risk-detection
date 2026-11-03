import os
import tempfile

import numpy as np
from scipy.io import wavfile

from backend.app.services.voice_service import analyze_voice_recording
from backend.app.services.voice_features import sanitize_feature_values


def _write_wav(path, sample_rate=16000, duration=1.2, frequency=220.0):
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    waveform = 0.6 * np.sin(2 * np.pi * frequency * t)
    wavfile.write(path, sample_rate, waveform.astype(np.float32))


def _write_silent_wav(path, sample_rate=16000, duration=0.8):
    wavfile.write(path, sample_rate, np.zeros(int(sample_rate * duration), dtype=np.float32))


def test_reading_task_returns_structured_features():
    with tempfile.TemporaryDirectory() as temp_dir:
        path = os.path.join(temp_dir, 'reading.wav')
        _write_wav(path, duration=1.2, frequency=220.0)
        result = analyze_voice_recording(path, 'reading', session_id='session-1')

        assert result['task'] == 'reading'
        assert result['quality']['status'] == 'good'
        assert result['features']['duration_seconds'] > 0
        assert result['features']['speech_rate_wpm'] > 0
        assert np.isfinite(result['features']['mean_pitch_hz'])


def test_sustained_vowel_returns_jitter_and_shimmer_fields():
    with tempfile.TemporaryDirectory() as temp_dir:
        path = os.path.join(temp_dir, 'vowel.wav')
        _write_wav(path, duration=1.5, frequency=180.0)
        result = analyze_voice_recording(path, 'sustained_vowel', session_id='session-2')

        assert result['task'] == 'sustained_vowel'
        assert result['features']['mean_pitch_hz'] > 0
        assert 'jitter' in result['features']
        assert 'shimmer' in result['features']


def test_pa_ta_ka_reports_unavailable_segmentation_when_needed():
    with tempfile.TemporaryDirectory() as temp_dir:
        path = os.path.join(temp_dir, 'pataka.wav')
        _write_wav(path, duration=1.0, frequency=210.0)
        result = analyze_voice_recording(path, 'pa_ta_ka', session_id='session-3')

        assert result['task'] == 'pa_ta_ka'
        assert result['features']['speech_duration'] >= 0
        assert 'syllable_repetition_rate' in result['features']


def test_short_audio_is_marked_insufficient():
    with tempfile.TemporaryDirectory() as temp_dir:
        path = os.path.join(temp_dir, 'short.wav')
        _write_wav(path, duration=0.15, frequency=180.0)
        result = analyze_voice_recording(path, 'reading', session_id='session-4')

        assert result['quality']['status'] == 'insufficient'
        assert result['quality']['reason']


def test_silent_audio_is_marked_insufficient():
    with tempfile.TemporaryDirectory() as temp_dir:
        path = os.path.join(temp_dir, 'silent.wav')
        _write_silent_wav(path)
        result = analyze_voice_recording(path, 'reading', session_id='session-5')

        assert result['quality']['status'] == 'insufficient'


def test_invalid_audio_returns_insufficient_quality():
    result = analyze_voice_recording('does-not-exist.wav', 'reading', session_id='session-6')
    assert result['quality']['status'] == 'insufficient'


def test_sanitize_feature_values_removes_nan_and_inf():
    values = {'a': np.nan, 'b': np.inf, 'c': 42.0}
    cleaned = sanitize_feature_values(values)
    assert cleaned['a'] is None
    assert cleaned['b'] is None
    assert cleaned['c'] == 42.0
