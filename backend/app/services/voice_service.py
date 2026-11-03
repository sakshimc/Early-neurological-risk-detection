import json
import os
import tempfile
import uuid
from pathlib import Path
from typing import Dict, Optional

import numpy as np
from scipy.io import wavfile

from .voice_features import (
    DEFAULT_SAMPLE_RATE,
    MIN_DURATION_SECONDS,
    MIN_RMS,
    MIN_VOICED_FRAMES,
    PITCH_LOWER_HZ,
    PITCH_UPPER_HZ,
    compute_jitter_shimmer,
    compute_pause_metrics,
    compute_rms,
    compute_silence_ratio,
    compute_voiced_ratio,
    safe_mean,
    safe_range,
    safe_std,
    sanitize_feature_values,
)

REPO_ROOT = Path(__file__).resolve().parents[3]
VOICE_OUTPUT_DIR = REPO_ROOT / 'data' / 'processed' / 'voice'
VOICE_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def save_voice_features(session_id: str, task_id: str, payload: dict) -> None:
    output_path = VOICE_OUTPUT_DIR / f'voice_features_{session_id}_{task_id}.json'
    with output_path.open('w', encoding='utf-8') as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)


def _load_audio(file_path: str) -> tuple[np.ndarray, int]:
    if not file_path or not Path(file_path).exists():
        raise FileNotFoundError('Audio file was not found')

    sample_rate, waveform = wavfile.read(file_path)
    if waveform.ndim > 1:
        waveform = np.mean(waveform, axis=1)
    waveform = waveform.astype(float)
    return waveform, int(sample_rate)


def _resample_and_prepare(signal: np.ndarray, source_rate: int, target_rate: int = DEFAULT_SAMPLE_RATE) -> np.ndarray:
    if source_rate == target_rate:
        return signal

    if signal.size < 2:
        return signal

    target_len = int(np.ceil(len(signal) * target_rate / source_rate))
    resampled = np.interp(
        np.linspace(0, len(signal) - 1, target_len),
        np.arange(len(signal)),
        signal,
    )
    return resampled.astype(float)


def _trim_silence(signal: np.ndarray, sample_rate: int) -> np.ndarray:
    if signal.size == 0:
        return signal

    frame_length = max(256, int(sample_rate * 0.02))
    frame_rms = np.array([compute_rms(signal[start:start + frame_length]) for start in range(0, len(signal), frame_length)])
    if frame_rms.size == 0:
        return signal

    threshold = max(MIN_RMS * 10.0, np.percentile(frame_rms, 20))
    non_silent = frame_rms > threshold
    if not np.any(non_silent):
        return signal

    start = 0
    while start < len(signal) and compute_rms(signal[start:start + frame_length]) <= threshold:
        start += frame_length

    end = len(signal)
    while end > start and compute_rms(signal[max(0, end - frame_length):end]) <= threshold:
        end -= frame_length

    return signal[start:end]


def _estimate_pitch(signal: np.ndarray, sample_rate: int) -> tuple[np.ndarray, np.ndarray]:
    if signal.size < 1024:
        return np.array([]), np.array([])

    frame_length = 512
    hop_length = 256
    frames = []
    for start in range(0, len(signal) - frame_length + 1, hop_length):
        frame = signal[start:start + frame_length]
        frame = frame * np.hanning(frame_length)
        spectrum = np.fft.rfft(frame)
        magnitudes = np.abs(spectrum)
        freqs = np.fft.rfftfreq(frame_length, 1.0 / sample_rate)
        valid = (freqs >= PITCH_LOWER_HZ) & (freqs <= PITCH_UPPER_HZ)
        if not np.any(valid):
            continue
        peak_index = np.argmax(magnitudes[valid])
        freq = freqs[valid][peak_index]
        frames.append(freq)

    pitch_values = np.array(frames, dtype=float)
    voiced_mask = np.isfinite(pitch_values)
    pitch_values = pitch_values[voiced_mask]
    amplitude_values = np.array([compute_rms(signal[start:start + frame_length]) for start in range(0, len(signal) - frame_length + 1, hop_length)], dtype=float)
    amplitude_values = amplitude_values[voiced_mask]
    return pitch_values, amplitude_values


def analyze_voice_recording(file_path: str, task_id: str, session_id: str | None = None) -> dict:
    try:
        waveform, source_rate = _load_audio(file_path)
    except (FileNotFoundError, ValueError, OSError):
        return {
            'task': task_id,
            'quality': {
                'status': 'insufficient',
                'reason': 'Unable to read audio file',
            },
            'features': {},
        }

    if waveform.size == 0:
        return {
            'task': task_id,
            'quality': {
                'status': 'insufficient',
                'reason': 'Audio file is empty',
            },
            'features': {},
        }

    signal = _resample_and_prepare(waveform, source_rate)
    signal = _trim_silence(signal, DEFAULT_SAMPLE_RATE)
    rms = compute_rms(signal)
    duration_seconds = len(signal) / DEFAULT_SAMPLE_RATE

    if duration_seconds < MIN_DURATION_SECONDS or rms < MIN_RMS:
        return {
            'task': task_id,
            'quality': {
                'status': 'insufficient',
                'reason': 'Recording is too short or has insufficient energy',
            },
            'features': {},
        }

    pitch_values, amplitude_values = _estimate_pitch(signal, DEFAULT_SAMPLE_RATE)
    voiced_ratio = compute_voiced_ratio(np.ones(len(pitch_values))) if len(pitch_values) > 0 else 0.0
    silence_ratio = compute_silence_ratio(signal, DEFAULT_SAMPLE_RATE)

    if len(pitch_values) < MIN_VOICED_FRAMES:
        return {
            'task': task_id,
            'quality': {
                'status': 'insufficient',
                'reason': 'Insufficient voiced audio for reliable pitch estimation',
            },
            'features': {},
        }

    features: Dict[str, Optional[float]] = {
        'duration_seconds': round(duration_seconds, 3),
        'sample_rate': DEFAULT_SAMPLE_RATE,
        'total_samples': int(len(signal)),
        'rms_energy': round(rms, 6),
        'voiced_frame_ratio': round(voiced_ratio, 3),
        'silence_ratio': round(silence_ratio, 3),
        'mean_pitch_hz': round(float(np.mean(pitch_values)), 3),
        'median_pitch_hz': round(float(np.median(pitch_values)), 3),
        'pitch_std_hz': round(float(np.std(pitch_values)), 3),
        'pitch_range_hz': round(float(np.max(pitch_values) - np.min(pitch_values)), 3),
        'mean_rms': round(float(np.mean(amplitude_values)), 6) if amplitude_values.size else None,
        'rms_std': round(float(np.std(amplitude_values)), 6) if amplitude_values.size else None,
    }

    pause_metrics = compute_pause_metrics(signal, DEFAULT_SAMPLE_RATE)
    features.update({
        'pause_count': pause_metrics['pause_count'],
        'total_pause_duration': round(pause_metrics['total_pause_duration'], 3),
        'mean_pause_duration': round(pause_metrics['mean_pause_duration'], 3),
        'maximum_pause_duration': round(pause_metrics['maximum_pause_duration'], 3),
    })

    if task_id == 'reading':
        words = 10
        speech_rate_wpm = (words / max(duration_seconds, 1e-6)) * 60.0
        features.update({
            'speech_rate_wpm': round(speech_rate_wpm, 3),
            'speech_duration': round(duration_seconds, 3),
        })
    elif task_id == 'sustained_vowel':
        jitter_shimmer = compute_jitter_shimmer(pitch_values, amplitude_values)
        features.update({
            'jitter': jitter_shimmer['jitter'],
            'jitter_status': jitter_shimmer['jitter_status'],
            'shimmer': jitter_shimmer['shimmer'],
            'shimmer_status': jitter_shimmer['shimmer_status'],
            'voiced_ratio': round(voiced_ratio, 3),
        })
    elif task_id == 'pa_ta_ka':
        features.update({
            'speech_duration': round(duration_seconds, 3),
            'syllable_repetition_rate': None,
            'syllable_repetition_status': 'unavailable',
        })

    features = sanitize_feature_values(features)

    result = {
        'task': task_id,
        'quality': {
            'status': 'good',
            'reason': None,
        },
        'features': features,
    }

    if session_id:
        save_voice_features(session_id, task_id, result)

    return result
