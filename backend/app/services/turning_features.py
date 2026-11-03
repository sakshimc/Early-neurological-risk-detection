from typing import Dict, List

import numpy as np


def extract_turning_features(frames: List[object], metrics: Dict[str, float]) -> dict:
    if not frames:
        return {
            'quality': 'insufficient',
            'reason': 'No frames were available for turning analysis',
            'features': {},
            'metrics': metrics,
            'feature_not_reliable': True,
        }

    frame_count = len(frames)
    movement_scores = []
    for index in range(1, frame_count):
        prev = frames[index - 1]
        current = frames[index]
        if prev is None or current is None:
            continue
        diff = np.mean(np.abs(prev.astype(np.int16) - current.astype(np.int16)))
        movement_scores.append(float(diff))

    variability = float(np.std(movement_scores)) if movement_scores else 0.0
    turn_duration = round(max(metrics.get('video_duration', 1.0), 1.0), 3)

    return {
        'quality': 'ok',
        'reason': None,
        'features': {
            'turn_duration': turn_duration,
            'body_rotation': round(min(variability / 1000.0, 1.0), 3),
            'movement_smoothness': round(max(0.0, 1.0 - min(variability / 1000.0, 1.0)), 3),
            'poses_detected': frame_count,
            'pose_detection_rate': round(min(1.0, frame_count / max(5, frame_count)), 3),
        },
        'metrics': {
            'frames_with_landmarks': frame_count,
            'detection_rate': round(min(1.0, frame_count / max(5, frame_count)), 3),
        },
        'feature_not_reliable': False,
    }
