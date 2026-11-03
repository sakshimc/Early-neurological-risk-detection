import os
import tempfile
import uuid
from pathlib import Path
from typing import List

from fastapi import APIRouter, File, HTTPException, UploadFile

from ..models.video_models import VideoAnalysisResponse
from ..services.video_service import analyze_video_payload

router = APIRouter()


@router.post('/analyze', response_model=VideoAnalysisResponse)
async def analyze_video_files(
    session_id: str | None = None,
    files: List[UploadFile] = File(default=None),
):
    if not files:
        raise HTTPException(status_code=400, detail='No video files were provided')

    temp_paths: List[dict] = []
    try:
        for upload in files:
            if not upload.filename:
                continue
            suffix = Path(upload.filename).suffix or '.mp4'
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as handle:
                contents = await upload.read()
                handle.write(contents)
                temp_path = handle.name
            task_name = Path(upload.filename).stem.lower()
            temp_paths.append({
                'task': task_name if task_name in {'face', 'hands', 'posture', 'walking', 'turning'} else 'unknown',
                'file_path': temp_path,
            })

        payload = {
            'session_id': session_id or str(uuid.uuid4()),
            'files': temp_paths,
        }
        result = analyze_video_payload(payload)
        return result
    finally:
        for item in temp_paths:
            try:
                os.remove(item['file_path'])
            except FileNotFoundError:
                continue
