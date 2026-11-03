from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, constr
from typing import List

from ..services.typing_service import (
    extract_typing_features,
    save_processed_typing_features,
    save_raw_typing_data,
)


class KeystrokeEvent(BaseModel):
    key: constr(min_length=1)
    event: constr(pattern=r"^(keydown|keyup)$")
    timestamp: int


class TypingSubmitRequest(BaseModel):
    session_id: constr(min_length=1)
    test_id: constr(min_length=1)
    target_text: constr(min_length=1)
    typed_text: constr(min_length=0)
    started_at: float
    completed_at: float

    # Empty event lists are allowed.
    # Feature extraction handles missing events safely.
    events: List[KeystrokeEvent] = Field(default_factory=list)


class TypingSubmitResponse(BaseModel):
    status: str
    message: str
    session_id: str
    features: dict


router = APIRouter()


@router.post(
    "/submit",
    response_model=TypingSubmitResponse,
)
def submit_typing_data(
    payload: TypingSubmitRequest,
):
    # Validate test ID
    if payload.test_id.lower() != "typing":
        raise HTTPException(
            status_code=400,
            detail="test_id must be typing",
        )

    # Validate timing
    if payload.completed_at <= payload.started_at:
        raise HTTPException(
            status_code=400,
            detail="completed_at must be greater than started_at",
        )

    # Convert Pydantic model to dictionary
    raw_payload = payload.model_dump()

    # Save raw typing data
    save_raw_typing_data(raw_payload)

    # Extract behavioral typing features
    features = extract_typing_features(raw_payload)

    # Save processed features
    save_processed_typing_features(
        payload.session_id,
        payload.test_id,
        features,
    )

    # Return successful response
    return {
        "status": "success",
        "message": "Typing assessment received",
        "session_id": payload.session_id,
        "features": features,
    }