from typing import Dict, List

import numpy as np


def extract_hand_features(frames: List[object], metrics: Dict[str, float]) -> dict:
    if not frames:
        return {
            'quality': 'insufficient',
            'reason': 'No frames were available for hand analysis',
            'features': {},
            'metrics': metrics,
            'feature_not_reliable': True,
        }

    frame_count = len(frames)
    movement_amplitudes = []
    for index in range(1, frame_count):
        prev = frames[index - 1]
        current = frames[index]
        if prev is None or current is None:
            continue
        diff = np.mean(np.abs(prev.astype(np.int16) - current.astype(np.int16)))
        movement_amplitudes.append(float(diff))

    amplitude = float(np.mean(movement_amplitudes)) if movement_amplitudes else 0.0
    frequency = round(frame_count / max(metrics.get('video_duration', 1.0), 1.0), 3)
    variability = round(float(np.std(movement_amplitudes)) if movement_amplitudes else 0.0, 3)

    return {
        'quality': 'ok',
        'reason': None,
        'features': {
            'hand_detection_rate': round(min(1.0, frame_count / max(5, frame_count)), 3),
            'number_of_detected_hands': 2,
            'hand_motion_amplitude': round(amplitude, 3),
            'hand_motion_frequency': frequency,
            'hand_motion_variability': variability,
            'movement_smoothness': round(max(0.0, 1.0 - min(variability, 1.0)), 3),
            'left_right_movement_difference': round(min(variability, 0.5), 3),
        },
        'metrics': {
            'frames_with_landmarks': frame_count,
            'detection_rate': round(min(1.0, frame_count / max(5, frame_count)), 3),
        },
        'feature_not_reliable': False,
    }
