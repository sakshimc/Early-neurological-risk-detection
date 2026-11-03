from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, constr

from ..services.cognitive_service import save_cognitive_features

router = APIRouter()


class ReactionTimePayload(BaseModel):
    trials: list[float] = Field(default_factory=list)
    mean_ms: float = 0.0
    median_ms: float = 0.0
    variability_ms: float = 0.0


class WorkingMemoryPayload(BaseModel):
    maximum_sequence_length: int = 0
    correct_trials: int = 0
    total_trials: int = 0
    accuracy: float = 0.0


class AttentionPayload(BaseModel):
    correct_hits: int = 0
    false_alarms: int = 0
    missed_targets: int = 0
    accuracy: float = 0.0
    mean_reaction_time_ms: float = 0.0


class CognitiveSubmitRequest(BaseModel):
    session_id: constr(min_length=1)
    test_id: constr(min_length=1)
    reaction_time: ReactionTimePayload
    working_memory: WorkingMemoryPayload
    attention: AttentionPayload


class CognitiveSubmitResponse(BaseModel):
    status: str
    message: str
    session_id: str


@router.post('/submit', response_model=CognitiveSubmitResponse)
def submit_cognitive_data(payload: CognitiveSubmitRequest):
    if payload.test_id.lower() != 'cognitive':
        raise HTTPException(status_code=400, detail='test_id must be cognitive')

    save_cognitive_features(payload.session_id, payload.model_dump())

    return {
        'status': 'success',
        'message': 'Cognitive assessment received',
        'session_id': payload.session_id,
    }
