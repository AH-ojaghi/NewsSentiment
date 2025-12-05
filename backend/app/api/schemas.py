from pydantic import BaseModel
from typing import Dict

class LivePredictionInput(BaseModel):
    ticker: str

class LivePredictionOutput(BaseModel):
    ticker: str
    proba: float
    signal: int
    calculated_features: Dict[str, float]
    model_timestamp: str