import os
import tempfile
import uuid
from pathlib import Path
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from ..services.voice_service import analyze_voice_recording

router = APIRouter()


class VoiceSubmitResponse(BaseModel):
    status: str
    message: str
    task_id: str
    session_id: str
    quality: dict
    features: dict


@router.post('/submit', response_model=VoiceSubmitResponse)
async def submit_voice_recording(
    task_id: str | None = Form(default=None),
    task_title: str | None = Form(default=None),
    audio: UploadFile = File(default=None),
):
    if not audio or not audio.filename:
        raise HTTPException(status_code=400, detail='No audio file was provided')

    temp_path = None
    try:
        suffix = Path(audio.filename).suffix or '.wav'
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as handle:
            contents = await audio.read()
            handle.write(contents)
            temp_path = handle.name

        session_id = str(uuid.uuid4())
        result = analyze_voice_recording(temp_path, task_id or 'voice', session_id=session_id)
        return {
            'status': 'success',
            'message': 'Voice assessment processed',
            'task_id': task_id or 'voice',
            'session_id': session_id,
            'quality': result['quality'],
            'features': result['features'],
        }
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
