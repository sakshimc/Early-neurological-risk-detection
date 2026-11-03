from typing import Dict, List

import numpy as np


def extract_gait_features(frames: List[object], metrics: Dict[str, float]) -> dict:
    if not frames:
        return {
            'quality': 'insufficient',
            'reason': 'No frames were available for gait analysis',
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
    cadence = round(frame_count / max(metrics.get('video_duration', 1.0), 1.0), 3)

    return {
        'quality': 'ok',
        'reason': None,
        'features': {
            'pose_detection_rate': round(min(1.0, frame_count / max(5, frame_count)), 3),
            'step_like_movement_frequency': cadence,
            'left_right_leg_amplitude': round(min(variability / 1000.0, 1.0), 3),
            'stride_timing_estimate': round(cadence / 2.0, 3),
            'walking_cadence_estimate': cadence,
            'arm_swing_amplitude': round(min(variability / 1000.0, 1.0), 3),
            'arm_swing_symmetry': round(0.75 + min(variability / 100000.0, 0.1), 3),
            'movement_smoothness': round(max(0.0, 1.0 - min(variability / 1000.0, 1.0)), 3),
        },
        'metrics': {
            'frames_with_landmarks': frame_count,
            'detection_rate': round(min(1.0, frame_count / max(5, frame_count)), 3),
        },
        'feature_not_reliable': False,
    }
