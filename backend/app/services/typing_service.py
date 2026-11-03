import json
import math
from dataclasses import dataclass
from pathlib import Path
from statistics import mean, median, pstdev
from typing import Dict, List, Optional

REPO_ROOT = Path(__file__).resolve().parents[3]
RAW_DATA_DIR = REPO_ROOT / 'data' / 'raw' / 'typing'
PROCESSED_DATA_DIR = REPO_ROOT / 'data' / 'processed' / 'typing'
RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)

PAUSE_THRESHOLD_MS = 1000

TYPING_FEATURE_NAMES = [
    'typing_speed_wpm',
    'accuracy',
    'error_count',
    'completion_time_seconds',
    'mean_hold_duration',
    'median_hold_duration',
    'std_hold_duration',
    'min_hold_duration',
    'max_hold_duration',
    'mean_inter_key_interval',
    'median_inter_key_interval',
    'std_inter_key_interval',
    'min_inter_key_interval',
    'max_inter_key_interval',
    'pause_count',
    'total_pause_duration',
    'mean_pause_duration',
    'longest_pause_duration',
    'backspace_count',
    'backspace_rate',
    'typing_rhythm_mean',
    'typing_rhythm_std',
    'typing_rhythm_cv',
]


def _safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:
    if denominator == 0:
        return default
    return numerator / denominator


def _compute_statistics(values: List[float]) -> Dict[str, Optional[float]]:
    if not values:
        return {
            'mean': None,
            'median': None,
            'std': None,
            'min': None,
            'max': None,
        }

    result = {
        'mean': mean(values),
        'median': median(values),
        'std': pstdev(values) if len(values) > 1 else 0.0,
        'min': min(values),
        'max': max(values),
    }
    return result


def save_raw_typing_data(payload: dict) -> None:
    session_id = payload.get('session_id')
    filename = RAW_DATA_DIR / f'typing_{session_id}.json'
    with open(filename, 'w', encoding='utf-8') as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)


def save_processed_typing_features(session_id: str, test_id: str, features: dict) -> None:
    filename = PROCESSED_DATA_DIR / f'typing_features_{session_id}.json'
    output = {
        'session_id': session_id,
        'test_id': test_id,
        'features': features,
    }
    with open(filename, 'w', encoding='utf-8') as handle:
        json.dump(output, handle, ensure_ascii=False, indent=2)


def calculate_accuracy(target_text: str, typed_text: str) -> float:
    if not typed_text:
        return 0.0
    correct_chars = sum(
        1 for actual, expected in zip(typed_text, target_text) if actual == expected
    )
    return 100.0 * correct_chars / len(typed_text)


def calculate_wpm(typed_chars: int, completion_seconds: float) -> float:
    if completion_seconds <= 0:
        return 0.0
    minutes = completion_seconds / 60.0
    return (typed_chars / 5.0) / minutes


def pair_key_events(events: List[dict]) -> List[float]:
    pending_keydowns: Dict[str, List[float]] = {}
    hold_durations: List[float] = []

    for event in events:
        key = event.get('key')
        event_type = event.get('event')
        timestamp = event.get('timestamp')
        if key is None or event_type not in {'keydown', 'keyup'} or not isinstance(timestamp, (int, float)):
            continue

        if event_type == 'keydown':
            pending_keydowns.setdefault(key, []).append(float(timestamp))
            continue

        if event_type == 'keyup':
            pending_list = pending_keydowns.get(key)
            if not pending_list:
                continue
            start_time = pending_list.pop(0)
            duration = float(timestamp) - start_time
            if duration >= 0:
                hold_durations.append(duration)

    return hold_durations


def calculate_inter_key_intervals(events: List[dict]) -> List[float]:
    keydown_timestamps: List[float] = []

    for event in events:
        if event.get('event') != 'keydown':
            continue
        timestamp = event.get('timestamp')
        if timestamp is None or not isinstance(timestamp, (int, float)):
            continue
        keydown_timestamps.append(float(timestamp))

    intervals: List[float] = []
    for prev, current in zip(keydown_timestamps, keydown_timestamps[1:]):
        delta = current - prev
        if delta >= 0:
            intervals.append(delta)
    return intervals


def calculate_pause_features(intervals: List[float], threshold_ms: int = PAUSE_THRESHOLD_MS) -> dict:
    pauses = [interval for interval in intervals if interval > threshold_ms]
    pause_count = len(pauses)
    total_pause_duration = sum(pauses)
    mean_pause_duration = _safe_divide(total_pause_duration, pause_count) if pause_count else 0.0
    longest_pause_duration = max(pauses) if pauses else 0.0
    return {
        'pause_count': pause_count,
        'total_pause_duration': total_pause_duration,
        'mean_pause_duration': mean_pause_duration,
        'longest_pause_duration': longest_pause_duration,
    }


def calculate_backspace_features(events: List[dict]) -> dict:
    keydown_count = sum(1 for event in events if event.get('event') == 'keydown')
    backspace_count = sum(1 for event in events if event.get('event') == 'keydown' and event.get('key') == 'Backspace')
    backspace_rate = _safe_divide(backspace_count, keydown_count)
    return {
        'backspace_count': backspace_count,
        'backspace_rate': backspace_rate,
    }


def calculate_rhythm_features(intervals: List[float]) -> dict:
    if not intervals:
        return {
            'typing_rhythm_mean': None,
            'typing_rhythm_std': None,
            'typing_rhythm_cv': None,
        }

    rhythm_mean = mean(intervals)
    rhythm_std = pstdev(intervals) if len(intervals) > 1 else 0.0
    rhythm_cv = _safe_divide(rhythm_std, rhythm_mean, default=None)
    return {
        'typing_rhythm_mean': rhythm_mean,
        'typing_rhythm_std': rhythm_std,
        'typing_rhythm_cv': rhythm_cv,
    }


def extract_typing_features(raw_data: dict) -> dict:
    target_text = raw_data.get('target_text', '')
    typed_text = raw_data.get('typed_text', '')
    started_at = raw_data.get('started_at', 0.0)
    completed_at = raw_data.get('completed_at', 0.0)
    events = raw_data.get('events') or []

    if not isinstance(events, list):
        events = []

    completion_seconds = float(completed_at - started_at) if isinstance(completed_at, (int, float)) and isinstance(started_at, (int, float)) else 0.0
    if completion_seconds < 0:
        completion_seconds = 0.0

    typed_chars = len(typed_text)
    total_chars = len(target_text)

    hold_durations = pair_key_events(events)
    hold_stats = _compute_statistics(hold_durations)

    inter_key_intervals = calculate_inter_key_intervals(events)
    interval_stats = _compute_statistics(inter_key_intervals)

    keydown_count = sum(
        1 for event in events
        if event.get('event') == 'keydown' and isinstance(event.get('timestamp'), (int, float))
    )
    has_valid_typing_events = keydown_count > 0

    pause_stats = calculate_pause_features(inter_key_intervals)
    backspace_stats = calculate_backspace_features(events)
    rhythm_stats = calculate_rhythm_features(inter_key_intervals)

    features = {
        'total_characters': total_chars,
        'typed_characters': typed_chars,
        'error_count': sum(1 for actual, expected in zip(typed_text, target_text) if actual != expected),
        'accuracy': calculate_accuracy(target_text, typed_text),
        'completion_time_seconds': round(completion_seconds / 1000.0, 2) if completion_seconds else 0.0,
        'typing_speed_wpm': round(calculate_wpm(typed_chars, completion_seconds / 1000.0), 2) if completion_seconds and has_valid_typing_events else 0.0,
        'mean_hold_duration': round(hold_stats['mean'], 2) if hold_stats['mean'] is not None else None,
        'median_hold_duration': round(hold_stats['median'], 2) if hold_stats['median'] is not None else None,
        'std_hold_duration': round(hold_stats['std'], 2) if hold_stats['std'] is not None else None,
        'min_hold_duration': round(hold_stats['min'], 2) if hold_stats['min'] is not None else None,
        'max_hold_duration': round(hold_stats['max'], 2) if hold_stats['max'] is not None else None,
        'mean_inter_key_interval': round(interval_stats['mean'], 2) if interval_stats['mean'] is not None else None,
        'median_inter_key_interval': round(interval_stats['median'], 2) if interval_stats['median'] is not None else None,
        'std_inter_key_interval': round(interval_stats['std'], 2) if interval_stats['std'] is not None else None,
        'min_inter_key_interval': round(interval_stats['min'], 2) if interval_stats['min'] is not None else None,
        'max_inter_key_interval': round(interval_stats['max'], 2) if interval_stats['max'] is not None else None,
        'pause_count': pause_stats['pause_count'],
        'total_pause_duration': round(pause_stats['total_pause_duration'], 2),
        'mean_pause_duration': round(pause_stats['mean_pause_duration'], 2),
        'longest_pause_duration': round(pause_stats['longest_pause_duration'], 2),
        'backspace_count': backspace_stats['backspace_count'],
        'backspace_rate': round(backspace_stats['backspace_rate'], 4),
        'typing_rhythm_mean': round(rhythm_stats['typing_rhythm_mean'], 2) if rhythm_stats['typing_rhythm_mean'] is not None else None,
        'typing_rhythm_std': round(rhythm_stats['typing_rhythm_std'], 2) if rhythm_stats['typing_rhythm_std'] is not None else None,
        'typing_rhythm_cv': round(rhythm_stats['typing_rhythm_cv'], 3) if rhythm_stats['typing_rhythm_cv'] is not None else None,
    }

    return features


def features_to_vector(features: dict) -> List[float]:
    vector: List[float] = []
    for name in TYPING_FEATURE_NAMES:
        value = features.get(name)
        if value is None:
            vector.append(float('nan'))
            continue
        try:
            vector.append(float(value))
        except (TypeError, ValueError):
            vector.append(float('nan'))
    return vector
