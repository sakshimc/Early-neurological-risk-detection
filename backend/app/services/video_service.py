import json
import os
import uuid
from pathlib import Path
from typing import Dict, List, Optional

import cv2
import numpy as np

from .face_features import extract_face_features
from .hand_features import extract_hand_features
from .posture_features import extract_posture_features
from .gait_features import extract_gait_features
from .turning_features import extract_turning_features

REPO_ROOT = Path(__file__).resolve().parents[3]
VIDEO_OUTPUT_DIR = REPO_ROOT / 'data' / 'processed' / 'video'
VIDEO_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

TARGET_FPS = int(os.getenv('VIDEO_TARGET_FPS', '15'))


def save_video_analysis(session_id: str, payload: dict) -> None:
    output_path = VIDEO_OUTPUT_DIR / f'video_features_{session_id}.json'
    with output_path.open('w', encoding='utf-8') as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)


def analyze_video_file(file_path: str, task: str, target_fps: Optional[int] = None) -> dict:
    if not file_path or not Path(file_path).exists():
        return {
            'task': task,
            'quality': 'insufficient',
            'reason': 'Video file was not found',
            'features': {},
            'metrics': {},
            'feature_not_reliable': True,
        }

    cap = cv2.VideoCapture(file_path)
    if not cap.isOpened():
        return {
            'task': task,
            'quality': 'insufficient',
            'reason': 'Unable to open video file',
            'features': {},
            'metrics': {},
            'feature_not_reliable': True,
        }

    try:
        fps = cap.get(cv2.CAP_PROP_FPS) or 0.0
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        duration_seconds = frame_count / fps if fps > 0 else 0.0

        sampled_frames = []
        frame_index = 0
        step = max(1, int(round((fps or 1) / max(1, target_fps or TARGET_FPS))))

        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if frame_index % step == 0:
                sampled_frames.append(frame)
            frame_index += 1

        if not sampled_frames:
            return {
                'task': task,
                'quality': 'insufficient',
                'reason': 'No frames were available for analysis',
                'features': {},
                'metrics': {},
                'feature_not_reliable': True,
            }

        metrics = {
            'frames_processed': len(sampled_frames),
            'video_duration': round(duration_seconds, 3),
            'frame_rate': round(fps, 3),
        }

        if task == 'face':
            result = extract_face_features(sampled_frames, metrics)
        elif task == 'hands':
            result = extract_hand_features(sampled_frames, metrics)
        elif task == 'posture':
            result = extract_posture_features(sampled_frames, metrics)
        elif task == 'walking':
            result = extract_gait_features(sampled_frames, metrics)
        elif task == 'turning':
            result = extract_turning_features(sampled_frames, metrics)
        else:
            return {
                'task': task,
                'quality': 'insufficient',
                'reason': 'Unsupported task type',
                'features': {},
                'metrics': metrics,
                'feature_not_reliable': True,
            }

        return {
            'task': task,
            'quality': result.get('quality', 'insufficient'),
            'reason': result.get('reason'),
            'features': result.get('features', {}),
            'metrics': {**metrics, **result.get('metrics', {})},
            'feature_not_reliable': result.get('feature_not_reliable', False),
        }
    finally:
        cap.release()


def analyze_video_payload(payload: dict) -> dict:
    session_id = payload.get('session_id') or str(uuid.uuid4())
    files = payload.get('files') or []
    if not isinstance(files, list):
        files = [files]

    tasks: Dict[str, dict] = {}
    for item in files:
        task_name = item.get('task') if isinstance(item, dict) else None
        file_path = item.get('file_path') if isinstance(item, dict) else None
        if not task_name or not file_path:
            continue
        tasks[task_name] = analyze_video_file(file_path, task_name)

    result = {
        'status': 'success',
        'session_id': session_id,
        'tasks': tasks,
    }
    save_video_analysis(session_id, result)
    return result
