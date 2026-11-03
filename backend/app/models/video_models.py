from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class VideoTaskAnalysis(BaseModel):
    task: str
    quality: str = Field(default="insufficient")
    reason: Optional[str] = None
    features: Dict[str, float] = Field(default_factory=dict)
    metrics: Dict[str, float] = Field(default_factory=dict)
    feature_not_reliable: bool = False


class VideoAnalysisResponse(BaseModel):
    status: str
    session_id: str
    tasks: Dict[str, VideoTaskAnalysis]
