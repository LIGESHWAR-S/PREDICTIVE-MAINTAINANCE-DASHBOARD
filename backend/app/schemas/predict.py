from pydantic import BaseModel
from typing import Optional

class PredictRequest(BaseModel):
    type: str  # 'L', 'M', or 'H'
    air_temp: float
    process_temp: float
    rotational_speed: float
    torque: float
    tool_wear: float

class PredictResponse(BaseModel):
    failure_probability: float
    predicted_failure_type: str
    is_failure: bool
