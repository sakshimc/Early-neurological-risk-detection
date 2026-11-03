import math
from typing import Any, Dict

import numpy as np


DEFAULT_SAMPLE_RATE = 16000
MIN_DURATION_SECONDS = 0.35
MIN_RMS = 1e-5
MIN_VOICED_FRAMES = 6
PITCH_LOWER_HZ = 60.0
PITCH_UPPER_HZ = 500.0
SILENCE_THRESHOLD_DB = -40.0


def sanitize_feature_values(values: Dict[str, Any]) -> Dict[str, Any]:
    cleaned: Dict[str, Any] = {}
    for key, value in values.items():
        if isinstance(value, (float, np.floating)) and not np.isfinite(value):
            cleaned[key] = None
        elif isinstance(value, (np.ndarray, list, tuple)):
            cleaned[key] = [sanitize_feature_values({'item': item})['item'] for item in value]
        else:
            cleaned[key] = value
    return cleaned


def compute_rms(signal: np.ndarray) -> float:
    if signal.size == 0:
        return 0.0
    return float(np.sqrt(np.mean(np.square(signal))))


def compute_voiced_ratio(mask: np.ndarray) -> float:
    if mask.size == 0:
        return 0.0
    return float(np.mean(mask))


def compute_silence_ratio(signal: np.ndarray, sample_rate: int, frame_length: int = 512) -> float:
    if signal.size == 0:
        return 1.0
    if len(signal) < frame_length:
        return 1.0 if compute_rms(signal) < MIN_RMS else 0.0

    frames = []
    for start in range(0, len(signal) - frame_length + 1, frame_length):
        frame = signal[start:start + frame_length]
        frames.append(compute_rms(frame))

    if not frames:
        return 1.0

    rms_values = np.array(frames)
    thresholds = np.array([MIN_RMS * 10.0] * len(rms_values))
    return float(np.mean(rms_values < thresholds))


def compute_pause_metrics(energy: np.ndarray, sample_rate: int, threshold_db: float = SILENCE_THRESHOLD_DB) -> Dict[str, Any]:
    if energy.size == 0:
        return {
            'pause_count': 0,
            'total_pause_duration': 0.0,
            'mean_pause_duration': 0.0,
            'maximum_pause_duration': 0.0,
        }

    frame_duration = 0.02
    frame_size = max(1, int(sample_rate * frame_duration))
    energy_frames = []
    for index in range(0, len(energy) - frame_size + 1, frame_size):
        frame = energy[index:index + frame_size]
        energy_frames.append(compute_rms(frame))

    if not energy_frames:
        return {
            'pause_count': 0,
            'total_pause_duration': 0.0,
            'mean_pause_duration': 0.0,
            'maximum_pause_duration': 0.0,
        }

    rms_values = np.array(energy_frames)
    thresholds = np.array([MIN_RMS * 10.0] * len(rms_values))
    is_silent = rms_values < thresholds

    pause_count = 0
    pause_lengths = []
    current_length = 0
    for silent in is_silent:
        if silent:
            current_length += 1
        elif current_length > 0:
            pause_count += 1
            pause_lengths.append(current_length * frame_duration)
            current_length = 0
    if current_length > 0:
        pause_count += 1
        pause_lengths.append(current_length * frame_duration)

    return {
        'pause_count': pause_count,
        'total_pause_duration': float(sum(pause_lengths)),
        'mean_pause_duration': float(np.mean(pause_lengths)) if pause_lengths else 0.0,
        'maximum_pause_duration': float(np.max(pause_lengths)) if pause_lengths else 0.0,
    }


def safe_mean(values: np.ndarray) -> float | None:
    if values.size == 0:
        return None
    values = np.asarray(values, dtype=float)
    if not np.isfinite(values).all():
        return None
    return float(np.mean(values))


def safe_std(values: np.ndarray) -> float | None:
    if values.size == 0:
        return None
    values = np.asarray(values, dtype=float)
    if not np.isfinite(values).all():
        return None
    return float(np.std(values))


def safe_range(values: np.ndarray) -> float | None:
    if values.size == 0:
        return None
    values = np.asarray(values, dtype=float)
    if not np.isfinite(values).all():
        return None
    return float(np.max(values) - np.min(values))


def compute_jitter_shimmer(pitch_values: np.ndarray, amplitude_values: np.ndarray) -> Dict[str, Any]:
    if pitch_values.size < 2 or amplitude_values.size < 2:
        return {
            'jitter': None,
            'jitter_status': 'insufficient_signal_quality',
            'shimmer': None,
            'shimmer_status': 'insufficient_signal_quality',
        }

    pitch_diffs = np.diff(pitch_values)
    amplitude_diffs = np.diff(amplitude_values)
    if np.any(~np.isfinite(pitch_diffs)) or np.any(~np.isfinite(amplitude_diffs)):
        return {
            'jitter': None,
            'jitter_status': 'insufficient_signal_quality',
            'shimmer': None,
            'shimmer_status': 'insufficient_signal_quality',
        }

    jitter = float(np.mean(np.abs(pitch_diffs)) / max(np.mean(np.abs(pitch_values)), 1e-6))
    shimmer = float(np.mean(np.abs(amplitude_diffs)) / max(np.mean(np.abs(amplitude_values)), 1e-6))
    return {
        'jitter': jitter,
        'jitter_status': 'ok',
        'shimmer': shimmer,
        'shimmer_status': 'ok',
    }
